// Mock OnigasmWrapper for testing emoji handling
(function(global) {
    'use strict';
    
    let isInitialized = false;
    
    function initializeOnigasm() {
        return new Promise((resolve) => {
            // Simulate async initialization
            setTimeout(() => {
                isInitialized = true;
                resolve();
            }, 100);
        });
    }
    
    // Mock OnigRegExp implementation using JavaScript RegExp for testing
    class OnigRegExp {
        constructor(pattern, flags = '') {
            this.pattern = pattern;
            this.flags = flags;
            this.jsRegex = null;
            this._compile();
        }
        
        _compile() {
            if (!isInitialized) {
                throw new Error('Mock Onigasm not initialized');
            }
            
            try {
                // Convert Oniguruma flags to JavaScript flags
                let jsFlags = '';
                if (this.flags.includes('i')) jsFlags += 'i';
                if (this.flags.includes('m')) jsFlags += 'm';
                if (this.flags.includes('g')) jsFlags += 'g';
                
                // Create JavaScript RegExp for basic testing
                this.jsRegex = new RegExp(this.pattern, jsFlags);
            } catch (error) {
                throw new Error(`Failed to compile regex: ${error.message}`);
            }
        }
        
        search(text, startPos = 0) {
            if (!this.jsRegex) {
                throw new Error('Pattern not compiled');
            }
            
            try {
                // Use slice to simulate start position
                const searchText = startPos > 0 ? text.slice(startPos) : text;
                const match = this.jsRegex.exec(searchText);
                
                if (!match) {
                    return null;
                }
                
                // Calculate actual position in original text
                const actualStart = startPos + match.index;
                const matchText = match[0];
                
                // Build capture groups
                const captureIndices = [];
                
                // Add the full match as capture group 0
                captureIndices.push({
                    index: 0,
                    start: actualStart,
                    end: actualStart + matchText.length,
                    text: matchText
                });
                
                // Add capture groups if any
                for (let i = 1; i < match.length; i++) {
                    if (match[i] !== undefined) {
                        // Find the position of this capture group in the original text
                        const groupText = match[i];
                        const groupIndex = text.indexOf(groupText, actualStart);
                        captureIndices.push({
                            index: i,
                            start: groupIndex,
                            end: groupIndex + groupText.length,
                            text: groupText
                        });
                    } else {
                        captureIndices.push(null);
                    }
                }
                
                return {
                    index: actualStart,
                    text: matchText,
                    captureIndices: captureIndices
                };
            } catch (error) {
                throw new Error(`Search failed: ${error.message}`);
            }
        }
        
        dispose() {
            this.jsRegex = null;
        }
        
        findAll(text) {
            const matches = [];
            let searchPos = 0;
            
            // Reset regex state
            this.jsRegex.lastIndex = 0;
            
            while (searchPos < text.length) {
                const match = this.search(text, searchPos);
                if (!match) {
                    break;
                }
                
                matches.push({
                    index: match.index,
                    text: match.text
                });
                
                // Move search position forward
                searchPos = match.index + match.text.length;
                if (match.text.length === 0) {
                    searchPos++; // Avoid infinite loop on zero-width matches
                }
            }
            
            return matches;
        }
    }
    
    // Export to global scope
    global.OnigasmWrapper = {
        init: initializeOnigasm,
        OnigRegExp: OnigRegExp,
        isInitialized: () => isInitialized
    };
    
})(typeof window !== 'undefined' ? window : this);