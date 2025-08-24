# Oniguruma Regex Playground

Interactive Oniguruma regex playground that runs in your browser. Test and experiment with Oniguruma regex patterns in real-time with visual feedback for matches and capture groups.

## Features

- 🎯 **Real-time regex testing** with instant feedback
- 🎨 **Visual match highlighting** in the test text
- 📋 **Detailed capture group information** with positions
- ⚙️ **Flag support** (Global, Multiline, Ignore Case, Extended)
- 📱 **Responsive design** that works on desktop and mobile
- ⚡ **Debounced updates** for smooth performance
- 🚨 **Error handling** with helpful messages

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

## Current Status

This playground currently uses JavaScript's native regex engine as a demonstration. The interface is fully functional and ready for Oniguruma integration.

## Technology

- Pure HTML, CSS, and JavaScript
- Responsive CSS Grid layout
- Debounced input handling
- Real-time pattern matching
- GitHub Pages deployment

## Development

To run locally:

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

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License - see the LICENSE file for details.
