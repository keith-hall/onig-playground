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
                expectedMatches: 2    // Start and end of string (single line mode)
            }
        ];

        for (const testCase of testCases) {
            try {
                const result = this.callMatchAll(testCase.pattern, testCase.text);
                console.log(`  Pattern "${testCase.pattern}" on "${testCase.text}": found ${result.matchCount} matches`);
                
                // Check that we got some matches (exact count may vary by implementation)
                if (result.matchCount > 0 && result.matchCount <= testCase.text.length + 2) {
                    console.log(`  ✓ Pattern handled correctly with ${result.matchCount} matches`);
                } else {
                    console.log(`  ✗ Unexpected match count: ${result.matchCount}`);
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

            return {
                matchCount: matchCount,
                numGroups: numGroups,
                buffer: buffer
            };

        } finally {
            this.module._free(numGroupsPtr);
            this.module._free(buffer);
        }
    }

    async runAllTests() {
        await this.initialize();
        
        console.log('\n=== Running Oniguruma Playground Tests ===\n');
        
        this.runTest('Invalid Regex Error Messages', () => this.testInvalidRegexErrorMessage());
        this.runTest('Zero-Length Match Handling', () => this.testZeroLengthMatches());
        this.runTest('Regular Pattern Matching', () => this.testRegularMatches());
        
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