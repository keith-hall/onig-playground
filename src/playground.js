class OnigPlayground {
    constructor() {
        this.module = null;
        this.debounceTimer = null;
        this.isLoading = false;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeOniguruma();
    }

    initializeElements() {
        this.regexInput = document.getElementById('regex-input');
        this.textInput = document.getElementById('text-input');
        this.bufferSizeInput = document.getElementById('buffer-size');
        this.errorSection = document.getElementById('error-section');
        this.errorOutput = document.getElementById('error-output');
        this.matchesOutput = document.getElementById('matches-output');
        this.highlightedText = document.getElementById('highlighted-text');
        this.captureGroupsOutput = document.getElementById('capture-groups-output');
        this.matchCount = document.getElementById('match-count');
    }

    bindEvents() {
        this.regexInput.addEventListener('input', () => this.debounceProcessRegex());
        this.textInput.addEventListener('input', () => this.debounceProcessRegex());
        this.bufferSizeInput.addEventListener('change', () => this.debounceProcessRegex());
    }

    async initializeOniguruma() {
        try {
            console.log('Loading Oniguruma WASM module...');
            this.module = await OnigModule();
            console.log('Oniguruma WASM loaded successfully');
            this.processRegex(); // Process initial content
        } catch (error) {
            console.error('Failed to load Oniguruma WASM:', error);
            this.showError('Failed to load Oniguruma WASM module. Please refresh the page.');
        }
    }

    debounceProcessRegex() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => this.processRegex(), 300);
    }

    processRegex() {
        if (!this.module || this.isLoading) {
            return;
        }

        this.clearError();
        const pattern = this.regexInput.value.trim();
        const text = this.textInput.value;

        console.log('Processing regex:', pattern);
        console.log('Test text length:', text.length);

        if (!pattern) {
            this.clearResults();
            return;
        }

        try {
            const matches = this.findAllMatches(pattern, text);
            console.log('Found matches:', matches);
            
            this.displayMatches(matches, text);
            this.displayHighlightedText(matches, text);
            this.displayCaptureGroups(matches);
        } catch (error) {
            console.error('Regex processing error:', error);
            this.showError(`Regex Error: ${error.message}`);
            this.clearResults();
        }
    }

    findAllMatches(pattern, text) {
        const bufferSize = parseInt(this.bufferSizeInput.value) || 200;
        const maxMatches = Math.floor(bufferSize / 20); // Conservative estimate
        
        console.log('findAllMatches called with:', {pattern, textLength: text.length, maxBufferSize: bufferSize});

        let numGroupsPtr = this.module._malloc(4);
        let buffer = this.module._malloc(bufferSize * 4);

        try {
            console.log('Calling WASM match_all function...');
            
            const matchCount = this.module.ccall("match_all", "number",
                ["string", "string", "number", "number", "number"],
                [pattern, text, buffer, bufferSize, numGroupsPtr]);

            console.log('WASM returned count:', matchCount);

            if (matchCount < 0) {
                throw new Error('Invalid regex pattern or compilation failed');
            }

            const numGroups = this.module.getValue(numGroupsPtr, "i32");
            console.log('Number of groups per match:', numGroups);

            const matches = [];

            for (let m = 0; m < matchCount; m++) {
                const match = [];
                for (let g = 0; g < numGroups; g++) {
                    const start = this.module.getValue(buffer + (m * numGroups * 2 + g * 2) * 4, "i32");
                    const length = this.module.getValue(buffer + (m * numGroups * 2 + g * 2 + 1) * 4, "i32");
                    
                    if (start >= 0 && length >= 0) {
                        match.push({
                            start: start,
                            end: start + length,
                            length: length,
                            text: text.substring(start, start + length)
                        });
                    }
                }
                matches.push(match);
            }

            console.log('Parsed matches:', matches);
            return matches;

        } finally {
            this.module._free(numGroupsPtr);
            this.module._free(buffer);
        }
    }

    displayMatches(matches, originalText) {
        this.matchCount.textContent = `(${matches.length})`;
        
        if (matches.length === 0) {
            this.matchesOutput.innerHTML = '<div class="no-matches">No matches found.</div>';
            return;
        }

        let html = '';
        matches.forEach((match, index) => {
            if (match.length > 0) {
                const fullMatch = match[0]; // First group is always the full match
                html += `
                    <div class="match-item">
                        <div class="match-text">${this.escapeHtml(fullMatch.text)}</div>
                        <div class="match-info">Match ${index + 1}: Position ${fullMatch.start}-${fullMatch.end} (length: ${fullMatch.length})</div>
                    </div>
                `;
            }
        });

        this.matchesOutput.innerHTML = html;
    }

    displayHighlightedText(matches, text) {
        if (matches.length === 0) {
            this.highlightedText.textContent = text || 'Enter text to see highlighted matches.';
            return;
        }

        // Create an array of all match positions for highlighting
        const highlights = [];
        matches.forEach((match, matchIndex) => {
            if (match.length > 0) {
                const fullMatch = match[0];
                highlights.push({
                    start: fullMatch.start,
                    end: fullMatch.end,
                    type: 'match',
                    matchIndex: matchIndex + 1
                });
            }
        });

        // Sort highlights by start position
        highlights.sort((a, b) => a.start - b.start);

        // Build highlighted HTML
        let html = '';
        let lastEnd = 0;

        highlights.forEach(highlight => {
            // Add text before highlight
            if (highlight.start > lastEnd) {
                html += this.escapeHtml(text.substring(lastEnd, highlight.start));
            }

            // Add highlighted text
            const highlightedText = this.escapeHtml(text.substring(highlight.start, highlight.end));
            html += `<span class="highlight-match" title="Match ${highlight.matchIndex}">${highlightedText}</span>`;
            
            lastEnd = highlight.end;
        });

        // Add remaining text
        if (lastEnd < text.length) {
            html += this.escapeHtml(text.substring(lastEnd));
        }

        this.highlightedText.innerHTML = html;
    }

    displayCaptureGroups(matches) {
        if (matches.length === 0 || !matches.some(match => match.length > 1)) {
            this.captureGroupsOutput.innerHTML = '<div class="no-captures">No capture groups found.</div>';
            return;
        }

        let html = '';
        matches.forEach((match, matchIndex) => {
            if (match.length > 1) { // Has capture groups beyond the full match
                html += `
                    <div class="match-groups">
                        <h4>Match ${matchIndex + 1} Groups:</h4>
                `;

                // Skip index 0 (full match) and show capture groups starting from index 1
                for (let i = 1; i < match.length; i++) {
                    const group = match[i];
                    html += `
                        <div class="capture-group">
                            <div class="capture-label">Group ${i}:</div>
                            <div class="capture-text">${this.escapeHtml(group.text)}</div>
                            <div class="capture-info">Position ${group.start}-${group.end} (length: ${group.length})</div>
                        </div>
                    `;
                }

                html += '</div>';
            }
        });

        this.captureGroupsOutput.innerHTML = html || '<div class="no-captures">No capture groups found.</div>';
    }

    showError(message) {
        this.errorOutput.textContent = message;
        this.errorSection.style.display = 'block';
    }

    clearError() {
        this.errorSection.style.display = 'none';
        this.errorOutput.textContent = '';
    }

    clearResults() {
        this.matchCount.textContent = '(0)';
        this.matchesOutput.innerHTML = '<div class="no-matches">No matches found.</div>';
        this.highlightedText.textContent = 'Enter a regex pattern and text to see highlighted matches.';
        this.captureGroupsOutput.innerHTML = '<div class="no-captures">No capture groups to display.</div>';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the playground when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new OnigPlayground();
});