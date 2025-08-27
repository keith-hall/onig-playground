// Browser-compatible oniguruma wrapper using onigasm
(function(global) {
    'use strict';
    
    // Initialize onigasm WASM module
    let onigasmModule = null;
    let isInitialized = false;
    
    async function initializeOniguruma() {
        try {
            // Use the globally loaded Onigasm module
            if (typeof global.Onigasm === 'undefined') {
                throw new Error('Onigasm WASM module not loaded. Please ensure onigasm.js is loaded first.');
            }
            
            // The Onigasm module is ready to use
            onigasmModule = global.Onigasm;
            isInitialized = true;
            
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(new Error(`Failed to initialize Oniguruma WASM: ${error.message}`));
        }
    }
    
    // Simple OnigRegExp implementation using the WASM module
    class OnigRegExp {
        constructor(pattern, flags = '') {
            this.pattern = pattern;
            this.flags = flags;
            this.compiledHandle = null;
            this._compile();
        }
        
        _compile() {
            if (!isInitialized) {
                throw new Error('Oniguruma WASM not initialized');
            }
            
            try {
                // Convert flags to numeric representation
                let flagsNum = 0;
                if (this.flags.includes('i')) flagsNum |= 1; // IGNORE_CASE
                if (this.flags.includes('x')) flagsNum |= 2; // EXTEND
                if (this.flags.includes('m')) flagsNum |= 4; // MULTILINE
                if (this.flags.includes('s')) flagsNum |= 8; // DOTALL
                
                // Convert pattern to UTF-8 bytes
                const patternBytes = new TextEncoder().encode(this.pattern);
                const patternPtr = onigasmModule._malloc(patternBytes.length);
                onigasmModule.HEAPU8.set(patternBytes, patternPtr);
                
                // Call onigasm compile function
                this.compiledHandle = onigasmModule._compilePattern(patternPtr, patternBytes.length, flagsNum);
                onigasmModule._free(patternPtr);
                
                if (this.compiledHandle === 0) {
                    const errorCode = onigasmModule._getLastError();
                    throw new Error(`Regex compilation failed with error code: ${errorCode}`);
                }
            } catch (error) {
                throw new Error(`Failed to compile regex: ${error.message}`);
            }
        }
        
        search(text, startPos = 0) {
            if (!this.compiledHandle) {
                throw new Error('Pattern not compiled');
            }
            
            try {
                // Convert text to UTF-8 bytes
                const textBytes = new TextEncoder().encode(text);
                const textPtr = onigasmModule._malloc(textBytes.length);
                onigasmModule.HEAPU8.set(textBytes, textPtr);
                
                // Allocate result buffer
                const resultPtr = onigasmModule._malloc(32); // Enough for several capture groups
                
                // Call onigasm search function
                const matchResult = onigasmModule._findBestMatch(
                    this.compiledHandle,
                    textPtr,
                    textBytes.length,
                    startPos,
                    resultPtr
                );
                
                onigasmModule._free(textPtr);
                
                let result = null;
                if (matchResult > 0) {
                    // Extract match results from result buffer
                    const resultArray = new Int32Array(onigasmModule.HEAP32.buffer, resultPtr, 8);
                    const matchStart = resultArray[0];
                    const matchEnd = resultArray[1];
                    
                    // Extract capture groups (pairs of start/end positions)
                    const captures = [];
                    for (let i = 0; i < matchResult && i < 8; i += 2) {
                        const start = resultArray[i];
                        const end = resultArray[i + 1];
                        
                        if (start >= 0 && end >= 0) {
                            captures.push({
                                index: i / 2,
                                start: start,
                                end: end,
                                text: text.substring(start, end)
                            });
                        } else {
                            captures.push(null);
                        }
                    }
                    
                    result = {
                        index: matchStart,
                        text: text.substring(matchStart, matchEnd),
                        captureIndices: captures
                    };
                }
                
                onigasmModule._free(resultPtr);
                return result;
                
            } catch (error) {
                throw new Error(`Search failed: ${error.message}`);
            }
        }
        
        findAll(text) {
            if (!this.compiledHandle) {
                throw new Error('Pattern not compiled');
            }
            
            try {
                const matches = [];
                let searchPos = 0;
                
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
            } catch (error) {
                throw new Error(`Find all failed: ${error.message}`);
            }
        }
        
        dispose() {
            if (this.compiledHandle) {
                onigasmModule._disposeCompiledPatterns(this.compiledHandle);
                this.compiledHandle = null;
            }
        }
    }
    
    // Export to global scope
    global.OnigurumaWrapper = {
        init: initializeOniguruma,
        OnigRegExp: OnigRegExp,
        isInitialized: () => isInitialized
    };
    
})(typeof window !== 'undefined' ? window : this);