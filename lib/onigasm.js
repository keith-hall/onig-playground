// Mock Onigasm WASM module for testing UTF-8/UTF-16 boundary fixes
// This simulates the Onigasm WASM interface for development and testing

(function(global) {
    'use strict';
    
    // Mock WASM module interface
    function createMockOnigasm(options = {}) {
        let isInitialized = false;
        let memory = new ArrayBuffer(1024 * 1024); // 1MB mock memory
        let heap32 = new Int32Array(memory);
        let heapU8 = new Uint8Array(memory);
        let allocPtr = 1024; // Start allocations at offset 1024
        
        const mockModule = {
            HEAP32: heap32,
            HEAPU8: heapU8,
            
            _malloc: function(size) {
                const ptr = allocPtr;
                allocPtr += size;
                return ptr;
            },
            
            _free: function(ptr) {
                // Mock free - do nothing for now
            },
            
            _compilePattern: function(patternPtr, patternLength, flags) {
                // Mock compile - just return a handle
                const pattern = new TextDecoder().decode(heapU8.slice(patternPtr, patternPtr + patternLength));
                console.log('Mock compile pattern:', pattern, 'flags:', flags);
                return 1; // Mock handle
            },
            
            _findBestMatch: function(handle, textPtr, textLength, startPos, resultPtr) {
                // Mock regex matching for testing UTF-8/UTF-16 boundaries
                const text = new TextDecoder().decode(heapU8.slice(textPtr, textPtr + textLength));
                console.log('Mock search in text:', JSON.stringify(text), 'startPos:', startPos);
                
                // For testing Greek delta pattern: (?i)(\w+)\s+\k<1>
                // This should match "Δ δ" (case-insensitive delta + space + delta)
                if (text.includes('Δ') && text.includes('δ')) {
                    const utf8Bytes = new TextEncoder().encode(text);
                    const deltaUpper = 'Δ';
                    const deltaLower = 'δ';
                    
                    // Find positions in UTF-8 byte array
                    const upperBytes = new TextEncoder().encode(deltaUpper);
                    const spaceBytes = new TextEncoder().encode(' ');
                    const lowerBytes = new TextEncoder().encode(deltaLower);
                    
                    let upperPos = -1;
                    let spacePos = -1;
                    let lowerPos = -1;
                    
                    // Simple search for the pattern: case-insensitive (\w+)\s+\k<1>
                    // This should match "Δ δ" where both deltas are the same word (case-insensitive)
                    for (let i = startPos; i < utf8Bytes.length - 4; i++) {
                        // Check for uppercase delta (CE 94) or lowercase delta (CE B4)
                        if ((utf8Bytes[i] === 0xCE && utf8Bytes[i + 1] === 0x94) || // Δ
                            (utf8Bytes[i] === 0xCE && utf8Bytes[i + 1] === 0xB4)) { // δ
                            upperPos = i;
                            // Check for space after
                            if (i + 2 < utf8Bytes.length && utf8Bytes[i + 2] === 0x20) {
                                spacePos = i + 2;
                                // Check for the other delta (case-insensitive match)
                                if (i + 3 < utf8Bytes.length - 1 && 
                                    utf8Bytes[i + 3] === 0xCE && 
                                    (utf8Bytes[i + 4] === 0xB4 || utf8Bytes[i + 4] === 0x94)) { // δ or Δ
                                    lowerPos = i + 3;
                                    
                                    // Found match: store results in result buffer
                                    const matchStart = upperPos;
                                    const matchEnd = lowerPos + 2; // end of second delta
                                    
                                    // Store main match (group 0)
                                    heap32[resultPtr >> 2] = matchStart;
                                    heap32[(resultPtr + 4) >> 2] = matchEnd;
                                    
                                    // Store capture group 1 (first delta)
                                    heap32[(resultPtr + 8) >> 2] = upperPos;
                                    heap32[(resultPtr + 12) >> 2] = upperPos + 2;
                                    
                                    console.log('Mock match found (UTF-8 bytes):', {
                                        matchStart, matchEnd,
                                        group1Start: upperPos, 
                                        group1End: upperPos + 2,
                                        bytesMatched: Array.from(utf8Bytes.slice(matchStart, matchEnd), b => '0x' + b.toString(16).padStart(2, '0')).join(' ')
                                    });
                                    
                                    return 2; // 2 capture groups (0 = full match, 1 = first delta)
                                }
                            }
                        }
                    }
                }
                
                return 0; // No match
            },
            
            _disposeCompiledPatterns: function(handle) {
                // Mock dispose
                console.log('Mock dispose pattern handle:', handle);
            },
            
            _getLastError: function() {
                return 0; // No error
            }
        };
        
        // Simulate initialization
        setTimeout(() => {
            isInitialized = true;
            if (options.onRuntimeInitialized) {
                options.onRuntimeInitialized();
            }
        }, 10);
        
        return mockModule;
    }
    
    // Export mock Onigasm factory
    global.Onigasm = createMockOnigasm;
    
})(typeof window !== 'undefined' ? window : this);