use wasm_bindgen::prelude::*;
use onig::{Regex, RegexBuilder, Syntax};
use std::collections::HashMap;

// Static storage for compiled regexes (indexed by handle)
static mut REGEX_STORE: Option<HashMap<u32, Regex>> = None;
static mut NEXT_HANDLE: u32 = 1;

// Initialize the regex store
#[wasm_bindgen(start)]
pub fn init() {
    unsafe {
        REGEX_STORE = Some(HashMap::new());
    }
}

// Match result structure
#[wasm_bindgen]
pub struct MatchResult {
    found: bool,
    start: u32,
    end: u32,
    captures: Vec<u32>, // flattened array of [start1, end1, start2, end2, ...]
}

#[wasm_bindgen]
impl MatchResult {
    #[wasm_bindgen(getter)]
    pub fn found(&self) -> bool {
        self.found
    }

    #[wasm_bindgen(getter)]
    pub fn start(&self) -> u32 {
        self.start
    }

    #[wasm_bindgen(getter)]
    pub fn end(&self) -> u32 {
        self.end
    }

    #[wasm_bindgen(getter)]
    pub fn captures(&self) -> Vec<u32> {
        self.captures.clone()
    }
}

// Compile a regex pattern and return a handle to it
#[wasm_bindgen]
pub fn compile_pattern(pattern: &str, flags: u32) -> u32 {
    let mut builder = RegexBuilder::new(pattern);
    builder.syntax(Syntax::default());
    
    // Apply flags
    if flags & 1 != 0 { // ignore case
        builder.case_insensitive(true);
    }
    if flags & 4 != 0 { // multiline
        builder.multi_line(true);
    }
    if flags & 2 != 0 { // extended (free-spacing)
        builder.syntax(Syntax::perl());
    }
    
    match builder.build() {
        Ok(regex) => {
            unsafe {
                let handle = NEXT_HANDLE;
                NEXT_HANDLE += 1;
                
                if let Some(ref mut store) = REGEX_STORE {
                    store.insert(handle, regex);
                    handle
                } else {
                    0 // Error: store not initialized
                }
            }
        }
        Err(_) => 0 // Error compiling regex
    }
}

// Search for a match using a compiled regex
#[wasm_bindgen]
pub fn find_match(handle: u32, text: &str, start_pos: usize) -> MatchResult {
    unsafe {
        if let Some(ref store) = REGEX_STORE {
            if let Some(regex) = store.get(&handle) {
                // For start_pos > 0, we need to slice the text and adjust positions
                let search_text = if start_pos < text.len() {
                    &text[start_pos..]
                } else {
                    return MatchResult {
                        found: false,
                        start: 0,
                        end: 0,
                        captures: Vec::new(),
                    };
                };

                if let Some(captures) = regex.captures(search_text) {
                    let mut capture_positions = Vec::new();
                    
                    // Add all capture groups (including the full match as group 0)
                    for i in 0..captures.len() {
                        if let Some(pos) = captures.pos(i) {
                            capture_positions.push((pos.0 + start_pos) as u32); // start (adjusted)
                            capture_positions.push((pos.1 + start_pos) as u32); // end (adjusted)
                        } else {
                            capture_positions.push(u32::MAX); // no match
                            capture_positions.push(u32::MAX);
                        }
                    }

                    if let Some(full_match) = captures.pos(0) {
                        return MatchResult {
                            found: true,
                            start: (full_match.0 + start_pos) as u32,
                            end: (full_match.1 + start_pos) as u32,
                            captures: capture_positions,
                        };
                    }
                }
            }
        }
    }

    MatchResult {
        found: false,
        start: 0,
        end: 0,
        captures: Vec::new(),
    }
}

// Find all matches in the text
#[wasm_bindgen]
pub fn find_all_matches(handle: u32, text: &str) -> Vec<u32> {
    let mut results = Vec::new();
    
    unsafe {
        if let Some(ref store) = REGEX_STORE {
            if let Some(regex) = store.get(&handle) {
                let mut start = 0;
                while start < text.len() {
                    let search_text = &text[start..];
                    if let Some(pos) = regex.find(search_text) {
                        let absolute_start = start + pos.0;
                        let absolute_end = start + pos.1;
                        results.push(absolute_start as u32);
                        results.push(absolute_end as u32);
                        start = absolute_end;
                        if absolute_end == absolute_start {
                            start += 1; // Avoid infinite loop on zero-width matches
                        }
                    } else {
                        break;
                    }
                }
            }
        }
    }
    
    results
}

// Dispose of a compiled regex
#[wasm_bindgen]
pub fn dispose_pattern(handle: u32) {
    unsafe {
        if let Some(ref mut store) = REGEX_STORE {
            store.remove(&handle);
        }
    }
}

// Get the last error (placeholder for now)
#[wasm_bindgen]
pub fn get_last_error() -> u32 {
    0 // No specific error codes implemented yet
}
