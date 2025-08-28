// Browser-compatible Oniguruma wrapper using our compiled WASM
import init, { init as wasmInit, compile_pattern, find_match, find_all_matches, dispose_pattern } from './pkg/onig_wasm.js';

class OnigWrapper {
    constructor() {
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) {
            return;
        }
        
        try {
            // Initialize the WASM module
            await init();
            wasmInit(); // Call the init function from our WASM module
            this.isInitialized = true;
        } catch (error) {
            throw new Error(`Failed to initialize Oniguruma WASM: ${error.message}`);
        }
    }

    isReady() {
        return this.isInitialized;
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
        if (!window.OnigWrapper.isReady()) {
            throw new Error('Oniguruma WASM not initialized');
        }
        
        try {
            // Convert flags to numeric representation
            let flagsNum = 0;
            if (this.flags.includes('i')) flagsNum |= 1; // IGNORE_CASE
            if (this.flags.includes('m')) flagsNum |= 4; // MULTILINE
            if (this.flags.includes('x')) flagsNum |= 2; // EXTEND
            
            this.compiledHandle = compile_pattern(this.pattern, flagsNum);
            
            if (this.compiledHandle === 0) {
                throw new Error('Failed to compile regex pattern');
            }
        } catch (error) {
            throw new Error(`Failed to compile regex: ${error.message}`);
        }
    }
    
    search(text, startPos = 0) {
        if (!this.compiledHandle) {
            throw new Error('Regex not compiled');
        }
        
        try {
            const result = find_match(this.compiledHandle, text, startPos);
            
            if (result.found) {
                // Convert capture indices to the expected format
                const captureIndices = [];
                const captures = result.captures;
                for (let i = 0; i < captures.length; i += 2) {
                    const start = captures[i];
                    const end = captures[i + 1];
                    if (start !== 4294967295 && end !== 4294967295) { // u32::MAX check
                        captureIndices.push({ start, end });
                    } else {
                        captureIndices.push(null);
                    }
                }
                
                return {
                    index: result.start,
                    captureIndices: captureIndices
                };
            } else {
                return null;
            }
        } catch (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }
    
    dispose() {
        if (this.compiledHandle) {
            dispose_pattern(this.compiledHandle);
            this.compiledHandle = null;
        }
    }
    
    findAll(text) {
        if (!this.compiledHandle) {
            throw new Error('Regex not compiled');
        }
        
        const matches = [];
        const allMatches = find_all_matches(this.compiledHandle, text);
        
        // allMatches is a flat array of [start1, end1, start2, end2, ...]
        for (let i = 0; i < allMatches.length; i += 2) {
            const start = allMatches[i];
            const end = allMatches[i + 1];
            matches.push({
                index: start,
                captureIndices: [{ start, end }]
            });
        }
        
        return matches;
    }
}

// Create global instance
window.OnigWrapper = new OnigWrapper();
window.OnigRegExp = OnigRegExp;