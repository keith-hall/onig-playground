# Building the WebAssembly Module

This document explains how to build the WebAssembly module that powers the Oniguruma regex functionality.

## Prerequisites

- Rust (latest stable)
- wasm-pack

## Installation

### Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Install wasm-pack

```bash
cargo install wasm-pack
```

## Building

1. Navigate to the wasm-onig directory:
   ```bash
   cd wasm-onig
   ```

2. Build the WebAssembly module:
   ```bash
   wasm-pack build --target web --out-dir ../lib/pkg
   ```

This will generate the following files in `lib/pkg/`:
- `onig_wasm.js` - JavaScript bindings
- `onig_wasm_bg.wasm` - WebAssembly binary
- `onig_wasm.d.ts` - TypeScript definitions
- `package.json` - Package metadata

## Architecture

The WASM module provides these key functions:

- `compile_pattern(pattern: string, flags: number) -> u32` - Compiles a regex pattern and returns a handle
- `find_match(handle: u32, text: string, start_pos: number) -> MatchResult` - Finds a single match
- `find_all_matches(handle: u32, text: string) -> Uint32Array` - Finds all matches
- `dispose_pattern(handle: u32)` - Cleans up a compiled pattern

## Dependencies

The module uses:
- `fancy-regex` - Provides advanced regex features similar to Oniguruma
- `wasm-bindgen` - WebAssembly bindings for JavaScript
- `js-sys` and `web-sys` - JavaScript and Web APIs

## Notes

- The generated WASM files are committed to the repository for convenience
- The module size is optimized for web delivery
- All regex compilation and matching happens in WebAssembly for performance