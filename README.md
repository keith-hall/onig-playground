# Oniguruma Regex Playground

Interactive Oniguruma regex playground that runs in your browser. Test and experiment with Oniguruma regex patterns in real-time with visual feedback for matches and capture groups.

## Features

- 🎯 **Real-time regex testing** with instant feedback using WebAssembly-powered Oniguruma
- 🎨 **Visual match highlighting** in the test text
- 📋 **Detailed capture group information** with positions
- ⚙️ **Full flag support** (Global, Multiline, Ignore Case, Extended) with real Oniguruma features
- 📱 **Responsive design** that works on desktop and mobile
- ⚡ **Debounced updates** for smooth performance
- 🚨 **Error handling** with helpful messages
- ✨ **Extended syntax support** - Free-spacing mode with comments and whitespace ignoring

## Live Demo

Visit the playground at: [https://keith-hall.github.io/onig-playground](https://keith-hall.github.io/onig-playground)

## Usage

1. **Enter your regex pattern** in the Regular Expression field
2. **Add test text** in the Test Text area
3. **Select flags** as needed (Global, Multiline, Ignore Case, Extended)
4. **View results** in real-time:
   - See all matches with positions
   - Visual highlighting in the text
   - Detailed capture group breakdown

## Example Patterns

Try these example patterns to get started:

- **Dates**: `(\w+)\s+(\d{4})-(\d{2})-(\d{2})`
- **Email addresses**: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
- **Phone numbers**: `\+?1?[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})`
- **URLs**: `https?://[^\s]+`
- **Extended syntax (with x flag)**: 
  ```regex
  (\w+) \s+ (\d{4}) - (\d{2}) - (\d{2}) # Extended syntax with comments and whitespace
  ```

## Current Status

✅ **Now powered by WebAssembly!** This playground uses a custom WebAssembly build of fancy-regex (providing Oniguruma-like features) for real regex processing. Extended flag (x) and other advanced features are fully supported!

## Technology

- **WebAssembly-powered regex engine** using fancy-regex compiled to WASM
- **Rust backend** with wasm-bindgen for browser compatibility
- Pure HTML, CSS, and JavaScript frontend
- Responsive CSS Grid layout
- Debounced input handling
- Real-time Oniguruma pattern matching
- GitHub Pages deployment

## Development

### Running Locally

```bash
# Clone the repository
git clone https://github.com/keith-hall/onig-playground.git
cd onig-playground

# Serve locally (any HTTP server works)
python -m http.server 8080
# or
npx serve .
```

Then open http://localhost:8080 in your browser.

### Building the WebAssembly Module

To rebuild the WASM module (requires Rust and wasm-pack):

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install wasm-pack
cargo install wasm-pack

# Build the WASM module
cd wasm-onig
wasm-pack build --target web --out-dir ../lib/pkg
```

The generated files in `lib/pkg/` are committed to the repository for convenience.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License - see the LICENSE file for details.
