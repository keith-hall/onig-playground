// Browser-compatible oniguruma wrapper using fancy-regex WASM
(function(global) {
    'use strict';
    
    // Initialize oniguruma WASM module
    let wasmModule = null;
    let isInitialized = false;
    
    async function initializeOniguruma() {
        try {
            // We'll use the globally loaded WASM module instead of dynamic import
            if (typeof global.wasmOniguruma === 'undefined') {
                throw new Error('WASM module not loaded. Please ensure onig_wasm.js is loaded first.');
            }
            
            // Initialize WASM using the global module
            await global.wasmOniguruma.default();
            wasmModule = global.wasmOniguruma;
            
            // Call the init function
            wasmModule.init();
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
                
                this.compiledHandle = wasmModule.compile_pattern(this.pattern, flagsNum);
                
                if (this.compiledHandle === 0) {
                    const errorCode = wasmModule.get_last_error();
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
                const result = wasmModule.find_match(this.compiledHandle, text, startPos);
                
                if (result.found) {
                    // Extract capture groups from the flattened array
                    const captures = [];
                    const captureData = result.captures;
                    
                    for (let i = 0; i < captureData.length; i += 2) {
                        const start = captureData[i];
                        const end = captureData[i + 1];
                        
                        if (start !== 4294967295) { // u32::MAX indicates no match
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
                    
                    return {
                        index: result.start,
                        text: text.substring(result.start, result.end),
                        captureIndices: captures
                    };
                }
                
                return null;
            } catch (error) {
                throw new Error(`Search failed: ${error.message}`);
            }
        }
        
        findAll(text) {
            if (!this.compiledHandle) {
                throw new Error('Pattern not compiled');
            }
            
            try {
                const matchData = wasmModule.find_all_matches(this.compiledHandle, text);
                const matches = [];
                
                for (let i = 0; i < matchData.length; i += 2) {
                    const start = matchData[i];
                    const end = matchData[i + 1];
                    matches.push({
                        index: start,
                        text: text.substring(start, end)
                    });
                }
                
                return matches;
            } catch (error) {
                throw new Error(`Find all failed: ${error.message}`);
            }
        }
        
        dispose() {
            if (this.compiledHandle) {
                wasmModule.dispose_pattern(this.compiledHandle);
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