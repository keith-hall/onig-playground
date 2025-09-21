# Oniguruma Playground

This repo compiles Oniguruma to WASM for use in the browser.
The main purpose is to allow exploration of how Oniguruma works, for the purposes of documenting it and reproducing the behavior for the fancy-regex Rust crate.
It also serves the secondary purpose of showing a working example of how to compile a C program using emscripten - as a developer whom doesn't know C/C++, but can work with JS, Rust, C# etc., it is quite useful to have a minimal wrapper for exposing Oniguruma functionality via JavaScript.
