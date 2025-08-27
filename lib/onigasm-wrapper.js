// Browser-compatible onigasm wrapper
(function(global) {
    'use strict';
    
    // Initialize onigasm when the WASM module is loaded
    let onigasmModule = null;
    let isInitialized = false;
    
    function initializeOnigasm() {
        return new Promise((resolve, reject) => {
            if (typeof Onigasm === 'undefined') {
                reject(new Error('Onigasm WASM module not loaded'));
                return;
            }
            
            // Initialize the WASM module with proper factory pattern
            const wasmPath = './lib/onigasm.wasm';
            
            fetch(wasmPath)
                .then(response => response.arrayBuffer())
                .then(wasmBytes => {
                    // Call the Onigasm factory with configuration
                    const moduleInstance = Onigasm({
                        instantiateWasm(imports, successCallback) {
                            WebAssembly.instantiate(wasmBytes, imports)
                                .then((output) => {
                                    successCallback(output.instance);
                                })
                                .catch((e) => {
                                    reject(e);
                                });
                            return {};
                        },
                        onRuntimeInitialized() {
                            onigasmModule = moduleInstance;
                            isInitialized = true;
                            resolve();
                        }
                    });
                })
                .catch(reject);
        });
    }
    
    // Simple OnigRegExp implementation using the WASM module
    class OnigRegExp {
        constructor(pattern, flags = '') {
            this.pattern = pattern;
            this.flags = flags;
            this.compiledPattern = null;
            this._compile();
        }
        
        _compile() {
            if (!isInitialized) {
                throw new Error('Onigasm not initialized');
            }
            
            try {
                // Convert pattern to UTF-8 bytes
                const patternBytes = new TextEncoder().encode(this.pattern);
                const patternPtr = onigasmModule._malloc(patternBytes.length);
                onigasmModule.HEAPU8.set(patternBytes, patternPtr);
                
                // Call WASM compile function
                let flagsNum = 0;
                if (this.flags.includes('i')) flagsNum |= 1; // ONIG_OPTION_IGNORECASE
                if (this.flags.includes('m')) flagsNum |= 4; // ONIG_OPTION_MULTILINE
                if (this.flags.includes('x')) flagsNum |= 2; // ONIG_OPTION_EXTEND
                
                this.compiledPattern = onigasmModule._compilePattern(patternPtr, patternBytes.length, flagsNum);
                onigasmModule._free(patternPtr);
                
                if (this.compiledPattern === 0) {
                    const errorCode = onigasmModule._getLastError();
                    throw new Error(`Regex compilation failed with error code: ${errorCode}`);
                }
            } catch (error) {
                throw new Error(`Failed to compile regex: ${error.message}`);
            }
        }
        
        search(text, startPos = 0) {
            if (!this.compiledPattern) {
                throw new Error('Pattern not compiled');
            }
            
            try {
                // Convert text to UTF-8 bytes
                const textBytes = new TextEncoder().encode(text);
                const textPtr = onigasmModule._malloc(textBytes.length);
                onigasmModule.HEAPU8.set(textBytes, textPtr);
                
                // Allocate result buffer
                const resultPtr = onigasmModule._malloc(32); // Enough for several capture groups
                
                // Call WASM search function
                const matchResult = onigasmModule._findBestMatch(
                    this.compiledPattern,
                    textPtr,
                    textBytes.length,
                    startPos,
                    resultPtr
                );
                
                let result = null;
                if (matchResult > 0) {
                    // Extract match results
                    const matchStart = onigasmModule.HEAP32[resultPtr >> 2];
                    const matchEnd = onigasmModule.HEAP32[(resultPtr + 4) >> 2];
                    
                    if (matchStart >= 0 && matchEnd > matchStart) {
                        // Convert byte positions back to string positions
                        const beforeMatch = new TextDecoder().decode(textBytes.slice(0, matchStart));
                        const matchText = new TextDecoder().decode(textBytes.slice(matchStart, matchEnd));
                        
                        result = [matchText];
                        result.index = beforeMatch.length;
                        
                        // Add capture groups if any
                        for (let i = 1; i < matchResult && i < 8; i++) {
                            const groupStart = onigasmModule.HEAP32[(resultPtr + i * 8) >> 2];
                            const groupEnd = onigasmModule.HEAP32[(resultPtr + i * 8 + 4) >> 2];
                            
                            if (groupStart >= 0 && groupEnd >= groupStart) {
                                const groupText = new TextDecoder().decode(textBytes.slice(groupStart, groupEnd));
                                result.push(groupText);
                            } else {
                                result.push(null);
                            }
                        }
                    }
                }
                
                onigasmModule._free(textPtr);
                onigasmModule._free(resultPtr);
                
                return result;
            } catch (error) {
                throw new Error(`Search failed: ${error.message}`);
            }
        }
        
        dispose() {
            if (this.compiledPattern) {
                onigasmModule._disposeCompiledPatterns(this.compiledPattern);
                this.compiledPattern = null;
            }
        }
    }
    
    // Export to global scope
    global.OnigasmWrapper = {
        init: initializeOnigasm,
        OnigRegExp: OnigRegExp,
        isInitialized: () => isInitialized
    };
    
})(typeof window !== 'undefined' ? window : this);