/**
 * Test suite for Oniguruma playground improvements
 * Tests both error message improvements and zero-length match fixes
 */

class OnigPlaygroundTests {
    constructor() {
        this.module = null;
        this.testResults = [];
    }

    async initialize() {
        console.log('Loading Oniguruma WASM module for testing...');
        this.module = await OnigModule();
        console.log('WASM module loaded successfully');
    }

    runTest(testName, testFn) {
        try {
            console.log(`Running test: ${testName}`);
            const result = testFn();
            if (result) {
                console.log(`✅ PASS: ${testName}`);
                this.testResults.push({name: testName, status: 'PASS'});
            } else {
                console.log(`❌ FAIL: ${testName}`);
                this.testResults.push({name: testName, status: 'FAIL'});
            }
        } catch (error) {
            console.log(`❌ ERROR: ${testName} - ${error.message}`);
            this.testResults.push({name: testName, status: 'ERROR', error: error.message});
        }
    }

    testInvalidRegexErrorMessage() {
        // Test that invalid regex patterns return specific error messages
        const invalidPatterns = [
            '[',        // unclosed bracket
            '(?',       // incomplete group
            '*',        // nothing to repeat
            '(?P<>)',   // empty group name
        ];

        for (const pattern of invalidPatterns) {
            try {
                const result = this.callMatchAll(pattern, 'test text');
                // If we get here, the pattern should have failed
                if (result.matchCount >= 0) {
                    console.log(`  Pattern "${pattern}" should have failed but didn't`);
                    return false;
                }
            } catch (error) {
                // Check if error message is more specific than generic message
                if (error.message.includes('Regex compilation error:') && 
                    !error.message.includes('Invalid regex pattern or compilation failed')) {
                    console.log(`  Pattern "${pattern}" correctly failed with: ${error.message}`);
                } else {
                    console.log(`  Pattern "${pattern}" failed but with generic error: ${error.message}`);
                    return false;
                }
            }
        }
        return true;
    }

    testZeroLengthMatches() {
        // Test that zero-length matches are handled correctly without infinite loops
        const testCases = [
            {
                pattern: '(?=.)',     // positive lookahead - matches at each position
                text: 'abc',
                expectedMatches: 3    // Should match at positions 0, 1, 2
            },
            {
                pattern: '\\b',       // word boundary - zero-length matches
                text: 'hello world',
                expectedMatches: 4    // Start of hello, end of hello, start of world, end of world
            },
            {
                pattern: '^|$',       // start or end of string
                text: 'test\nline',
                expectedMatches: 4    // In multiline mode: start of string, end of first line, start of second line, end of string
            }
        ];

        for (const testCase of testCases) {
            try {
                const result = this.callMatchAll(testCase.pattern, testCase.text);
                console.log(`  Pattern "${testCase.pattern}" on "${testCase.text}": found ${result.matchCount} matches`);
                
                // Debug: show actual match positions
                if (result.matchCount > 0) {
                    console.log(`  Match positions:`);
                    for (let m = 0; m < result.matches.length; m++) {
                        const match = result.matches[m];
                        console.log(`    Match ${m + 1}: position ${match.start}, length ${match.length}`);
                    }
                }
                
                // Check that we got the right number of matches
                if (result.matchCount == testCase.expectedMatches) {
                    console.log(`  ✓ Pattern handled correctly with ${result.matchCount} matches`);
                } else {
                    console.log(`  ✗ Unexpected match count: ${result.matchCount} matches found, expecting ${testCase.expectedMatches}`);
                    return false;
                }
            } catch (error) {
                console.log(`  ✗ Pattern "${testCase.pattern}" failed: ${error.message}`);
                return false;
            }
        }
        return true;
    }

    testRegularMatches() {
        // Test that normal regex patterns still work correctly
        const testCases = [
            {
                pattern: '\\w+',
                text: 'hello world test',
                expectedMatches: 3
            },
            {
                pattern: '\\d{4}-\\d{2}-\\d{2}',
                text: 'Date: 2023-12-01 and 2024-01-15',
                expectedMatches: 2
            },
            {
                pattern: '(\\w+)@(\\w+\\.\\w+)',
                text: 'Email: john@example.com and jane@test.org',
                expectedMatches: 2
            }
        ];

        for (const testCase of testCases) {
            try {
                const result = this.callMatchAll(testCase.pattern, testCase.text);
                console.log(`  Pattern "${testCase.pattern}": found ${result.matchCount} matches`);
                
                if (result.matchCount === testCase.expectedMatches) {
                    console.log(`  ✓ Correct number of matches`);
                } else {
                    console.log(`  ✗ Expected ${testCase.expectedMatches} matches, got ${result.matchCount}`);
                    return false;
                }
            } catch (error) {
                console.log(`  ✗ Pattern "${testCase.pattern}" failed: ${error.message}`);
                return false;
            }
        }
        return true;
    }

    callMatchAll(pattern, text) {
        const bufferSize = 200;
        let numGroupsPtr = this.module._malloc(4);
        let buffer = this.module._malloc(bufferSize * 4);

        try {
            const matchCount = this.module.ccall("match_all", "number",
                ["string", "string", "number", "number", "number"],
                [pattern, text, buffer, bufferSize, numGroupsPtr]);

            if (matchCount < 0) {
                const errorMsgPtr = this.module.ccall("get_last_error_message", "string", [], []);
                const errorMessage = errorMsgPtr || 'Invalid regex pattern or compilation failed';
                throw new Error(errorMessage);
            }

            const numGroups = this.module.getValue(numGroupsPtr, "i32");
            
            // Extract the match data immediately before freeing
            const matches = [];
            for (let m = 0; m < matchCount; m++) {
                const start = this.module.getValue(buffer + (m * numGroups * 2) * 4, "i32");
                const length = this.module.getValue(buffer + (m * numGroups * 2 + 1) * 4, "i32");
                matches.push({ start, length });
            }

            return {
                matchCount: matchCount,
                numGroups: numGroups,
                matches: matches
            };

        } finally {
            this.module._free(numGroupsPtr);
            this.module._free(buffer);
        }
    }

    testEmojiHandling() {
        // Test that emojis in the haystack are handled correctly
        const testCases = [
            {
                name: 'Simple emoji before match',
                pattern: '\\w+',
                text: '👋 hello',
                expectedMatches: 1,
                expectedMatchText: 'hello',
                expectedMatchStart: 3 // Corrected: emoji (2 UTF-16 units) + space (1) = position 3
            },
            {
                name: 'Emoji within match text',
                pattern: 'hello👋world',
                text: 'hello👋world',
                expectedMatches: 1,
                expectedMatchText: 'hello👋world',
                expectedMatchStart: 0
            },
            {
                name: 'Multiple emojis before match',
                pattern: '\\d+',
                text: '🚀🎉🎯 123',
                expectedMatches: 1,
                expectedMatchText: '123',
                expectedMatchStart: 7 // Correct: 3 emojis (6 UTF-16 units) + space (1) = position 7
            },
            {
                name: 'Emoji in capture group',
                pattern: '(\\S+)\\s+(\\d+)',
                text: 'user👤 42',
                expectedMatches: 1,
                expectedMatchText: 'user👤 42',
                expectedMatchStart: 0
            },
            {
                name: 'Complex emoji sequence',
                pattern: 'test',
                text: '👨‍💻👩‍🎨 test',
                expectedMatches: 1,
                expectedMatchText: 'test',
                expectedMatchStart: 11 // Corrected: complex emojis (10 UTF-16 units) + space (1) = position 11
            },
            {
                name: 'Emojis at different positions',
                pattern: 'word',
                text: '🌟start🎯middle🚀word🎉end✨',
                expectedMatches: 1,
                expectedMatchText: 'word',
                expectedMatchStart: 17 // Corrected based on actual UTF-16 calculations
            }
        ];

        for (const testCase of testCases) {
            try {
                console.log(`  Testing: ${testCase.name}`);
                const result = this.callMatchAll(testCase.pattern, testCase.text);
                
                // Check match count
                if (result.matchCount !== testCase.expectedMatches) {
                    console.log(`  ✗ Expected ${testCase.expectedMatches} matches, got ${result.matchCount}`);
                    return false;
                }
                
                if (result.matchCount > 0) {
                    const match = result.matches[0];
                    const actualMatchText = testCase.text.substring(match.start, match.start + match.length);
                    
                    // Check match text
                    if (actualMatchText !== testCase.expectedMatchText) {
                        console.log(`  ✗ Expected match text "${testCase.expectedMatchText}", got "${actualMatchText}"`);
                        return false;
                    }
                    
                    // Check match position (this is the critical test for emoji handling)
                    if (match.start !== testCase.expectedMatchStart) {
                        console.log(`  ✗ Expected match start ${testCase.expectedMatchStart}, got ${match.start}`);
                        console.log(`    Text: "${testCase.text}"`);
                        console.log(`    Pattern: "${testCase.pattern}"`);
                        console.log(`    Match text at calculated position: "${actualMatchText}"`);
                        return false;
                    }
                    
                    console.log(`  ✓ Match "${actualMatchText}" found at correct position ${match.start}`);
                }
                
            } catch (error) {
                console.log(`  ✗ Test case "${testCase.name}" failed: ${error.message}`);
                return false;
            }
        }
        
        return true;
    }

    testEmojiDisplayAndHighlighting() {
        // Test that emojis are displayed correctly and highlighting works
        const testCases = [
            {
                name: 'Emoji rendering in match results',
                pattern: '\\S+',
                text: 'hello👋',
                checkRendering: true
            },
            {
                name: 'Multiple emoji sequences',
                pattern: '\\w+',
                text: '🎯🚀 target 🎉✨',
                checkRendering: true
            },
            {
                name: 'Complex emoji with text',
                pattern: '[a-z]+',
                text: '👨‍💻 coding 👩‍🎨 art',
                checkRendering: true
            }
        ];

        for (const testCase of testCases) {
            try {
                console.log(`  Testing: ${testCase.name}`);
                const result = this.callMatchAll(testCase.pattern, testCase.text);
                
                if (result.matchCount > 0) {
                    // Test that we can extract text properly for display
                    const match = result.matches[0];
                    const matchText = testCase.text.substring(match.start, match.start + match.length);
                    
                    // Check that the extracted text is valid and contains expected characters
                    if (matchText.length === 0) {
                        console.log(`  ✗ Empty match text extracted`);
                        return false;
                    }
                    
                    // Check that emojis before and after positions are correctly calculated
                    const beforeText = testCase.text.substring(0, match.start);
                    const afterText = testCase.text.substring(match.start + match.length);
                    
                    // Verify the text reconstruction is correct
                    if (beforeText + matchText + afterText !== testCase.text) {
                        console.log(`  ✗ Text reconstruction failed`);
                        console.log(`    Original: "${testCase.text}"`);
                        console.log(`    Reconstructed: "${beforeText + matchText + afterText}"`);
                        return false;
                    }
                    
                    console.log(`  ✓ Text extraction and positioning correct`);
                    console.log(`    Match: "${matchText}" at position ${match.start}`);
                    console.log(`    Before: "${beforeText}", After: "${afterText}"`);
                }
                
            } catch (error) {
                console.log(`  ✗ Test case "${testCase.name}" failed: ${error.message}`);
                return false;
            }
        }
        
        return true;
    }

    async runAllTests() {
        await this.initialize();
        
        console.log('\n=== Running Oniguruma Playground Tests ===\n');
        
        this.runTest('Invalid Regex Error Messages', () => this.testInvalidRegexErrorMessage());
        this.runTest('Zero-Length Match Handling', () => this.testZeroLengthMatches());
        this.runTest('Regular Pattern Matching', () => this.testRegularMatches());
        this.runTest('Emoji Handling in Haystack', () => this.testEmojiHandling());
        this.runTest('Emoji Display and Highlighting', () => this.testEmojiDisplayAndHighlighting());
        
        console.log('\n=== Test Results ===');
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status !== 'PASS').length;
        
        console.log(`Total: ${this.testResults.length}, Passed: ${passed}, Failed: ${failed}`);
        
        if (failed === 0) {
            console.log('🎉 All tests passed!');
        } else {
            console.log('❌ Some tests failed:');
            this.testResults.filter(r => r.status !== 'PASS').forEach(r => {
                console.log(`  - ${r.name}: ${r.status}${r.error ? ' - ' + r.error : ''}`);
            });
        }
        
        return failed === 0;
    }
}

// Auto-run tests if this script is loaded directly
if (typeof window !== 'undefined') {
    window.OnigPlaygroundTests = OnigPlaygroundTests;
    
    // Run tests when DOM is loaded
    document.addEventListener('DOMContentLoaded', async () => {
        if (document.getElementById('run-tests')) {
            const tests = new OnigPlaygroundTests();
            await tests.runAllTests();
        }
    });
}

// Export for Node.js if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OnigPlaygroundTests;
}
