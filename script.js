class OnigPlayground {
    constructor() {
        this.debounceTimer = null;
        this.initializeElements();
        this.bindEvents();
        this.showExampleRegex();
        this.processRegex(); // Process initial regex
    }

    initializeElements() {
        this.regexInput = document.getElementById('regex-input');
        this.textInput = document.getElementById('text-input');
        this.errorSection = document.getElementById('error-section');
        this.errorOutput = document.getElementById('error-output');
        this.matchesOutput = document.getElementById('matches-output');
        this.highlightedText = document.getElementById('highlighted-text');
        this.captureGroupsOutput = document.getElementById('capture-groups-output');
        this.matchCount = document.getElementById('match-count');
        this.flagCheckboxes = {
            global: document.getElementById('flag-global'),
            multiline: document.getElementById('flag-multiline'),
            ignorecase: document.getElementById('flag-ignorecase'),
            extended: document.getElementById('flag-extended')
        };
    }

    bindEvents() {
        // Add input event listeners with debouncing for real-time updates
        this.regexInput.addEventListener('input', () => this.debounceProcessRegex());
        this.textInput.addEventListener('input', () => this.debounceProcessRegex());
        
        // Add change listeners for flags
        Object.values(this.flagCheckboxes).forEach(checkbox => {
            checkbox.addEventListener('change', () => this.debounceProcessRegex());
        });
    }

    showExampleRegex() {
        // Set example regex and text
        this.regexInput.value = '(\\w+)\\s+(\\d{4})-(\\d{2})-(\\d{2})';
        this.textInput.value = `Sample data for testing regex patterns:
Product ABC123 released on 2023-12-01
Service XYZ789 launched 2024-01-15
Update DEF456 scheduled for 2024-03-22

Email addresses:
john.doe@example.com
jane_smith@company.org
test.user123@domain.co.uk

Phone numbers:
+1-555-123-4567
(555) 987-6543
555.456.7890`;
        
        // Set some default flags
        this.flagCheckboxes.global.checked = true;
        this.flagCheckboxes.multiline.checked = true;
    }

    debounceProcessRegex() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => this.processRegex(), 300);
    }

    processRegex() {
        this.clearError();
        
        const regexPattern = this.regexInput.value.trim();
        const testText = this.textInput.value;
        
        if (!regexPattern) {
            this.clearResults();
            return;
        }

        try {
            // Get selected flags (note: extended flag is Oniguruma-specific)
            const flags = this.getSelectedFlags();
            
            // Create JavaScript RegExp (temporarily using native regex)
            // Note: This uses JavaScript regex. Oniguruma support coming soon!
            const jsFlags = flags.replace('x', ''); // Remove extended flag for JS regex
            const regex = new RegExp(regexPattern, jsFlags);
            
            // Find all matches
            const matches = this.findAllMatches(regex, testText);
            
            // Update UI with results
            this.displayMatches(matches, testText);
            this.displayHighlightedText(matches, testText);
            this.displayCaptureGroups(matches);
            
            // Show note about JavaScript regex vs Oniguruma
            if (flags.includes('x')) {
                this.showWarning('Note: Extended flag (x) is not supported in JavaScript regex. This playground currently uses JavaScript regex as a demo. Oniguruma support is being implemented.');
            }
            
        } catch (error) {
            this.showError(`Regex Error: ${error.message}`);
            this.clearResults();
        }
    }

    getSelectedFlags() {
        let flags = '';
        if (this.flagCheckboxes.global.checked) flags += 'g';
        if (this.flagCheckboxes.multiline.checked) flags += 'm';
        if (this.flagCheckboxes.ignorecase.checked) flags += 'i';
        if (this.flagCheckboxes.extended.checked) flags += 'x';
        return flags;
    }

    findAllMatches(regex, text) {
        const matches = [];
        
        // Reset lastIndex for global regex
        regex.lastIndex = 0;
        
        // For global flag, find all matches
        if (this.flagCheckboxes.global.checked) {
            let match;
            while ((match = regex.exec(text)) !== null) {
                matches.push({
                    match: match,
                    index: match.index,
                    text: match[0],
                    groups: match.slice(1) // Capture groups (excluding full match)
                });
                
                // Prevent infinite loop for zero-length matches
                if (match.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
            }
        } else {
            // Single match
            const match = regex.exec(text);
            if (match) {
                matches.push({
                    match: match,
                    index: match.index,
                    text: match[0],
                    groups: match.slice(1)
                });
            }
        }
        
        return matches;
    }

    displayMatches(matches, originalText) {
        this.matchCount.textContent = `(${matches.length} match${matches.length !== 1 ? 'es' : ''})`;
        
        if (matches.length === 0) {
            this.matchesOutput.innerHTML = '<div class="no-matches">No matches found</div>';
            return;
        }

        const matchesHtml = matches.map((matchData, index) => {
            const { match, index: matchIndex, text } = matchData;
            const endIndex = matchIndex + text.length;
            
            return `
                <div class="match-item">
                    <div class="match-text">${this.escapeHtml(text)}</div>
                    <div class="match-info">
                        Match ${index + 1}: Position ${matchIndex}-${endIndex}
                        ${match.length > 1 ? `• ${match.length - 1} capture group${match.length - 1 !== 1 ? 's' : ''}` : ''}
                    </div>
                </div>
            `;
        }).join('');

        this.matchesOutput.innerHTML = matchesHtml;
    }

    displayHighlightedText(matches, text) {
        if (matches.length === 0) {
            this.highlightedText.textContent = text;
            return;
        }

        let highlightedText = '';
        let lastIndex = 0;

        // Sort matches by index to handle overlapping correctly
        const sortedMatches = [...matches].sort((a, b) => a.index - b.index);

        sortedMatches.forEach(matchData => {
            const { index, text: matchText } = matchData;
            
            // Add text before the match
            highlightedText += this.escapeHtml(text.substring(lastIndex, index));
            
            // Add highlighted match
            highlightedText += `<span class="highlight-match">${this.escapeHtml(matchText)}</span>`;
            
            lastIndex = index + matchText.length;
        });

        // Add remaining text
        highlightedText += this.escapeHtml(text.substring(lastIndex));

        this.highlightedText.innerHTML = highlightedText;
    }

    displayCaptureGroups(matches) {
        if (matches.length === 0 || !matches.some(m => m.groups.length > 0)) {
            this.captureGroupsOutput.innerHTML = '<div class="no-captures">No capture groups</div>';
            return;
        }

        const groupsHtml = matches.map((matchData, matchIndex) => {
            const { groups, index } = matchData;
            
            if (groups.length === 0) return '';

            const matchGroupsHtml = groups.map((group, groupIndex) => {
                if (group === null || group === undefined) {
                    return `
                        <div class="capture-group">
                            <div class="capture-label">Group ${groupIndex + 1}:</div>
                            <div class="capture-text" style="font-style: italic; color: #999;">
                                (not captured)
                            </div>
                        </div>
                    `;
                }

                const groupStart = group.index !== undefined ? group.index : index;
                const groupEnd = groupStart + (group.length || group.toString().length);

                return `
                    <div class="capture-group">
                        <div class="capture-label">Group ${groupIndex + 1}:</div>
                        <div class="capture-text">${this.escapeHtml(group.toString())}</div>
                        <div class="capture-info">Position: ${groupStart}-${groupEnd}</div>
                    </div>
                `;
            }).join('');

            return `
                <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #e9ecef;">
                    <strong>Match ${matchIndex + 1} Capture Groups:</strong>
                    ${matchGroupsHtml}
                </div>
            `;
        }).join('');

        this.captureGroupsOutput.innerHTML = groupsHtml;
    }

    showError(message) {
        this.errorOutput.textContent = message;
        this.errorOutput.style.color = '#e53e3e';
        this.errorSection.style.display = 'block';
    }

    showWarning(message) {
        this.errorOutput.textContent = message;
        this.errorOutput.style.color = '#d69e2e';
        this.errorSection.style.display = 'block';
    }

    clearError() {
        this.errorSection.style.display = 'none';
        this.errorOutput.textContent = '';
    }

    clearResults() {
        this.matchCount.textContent = '(0 matches)';
        this.matchesOutput.innerHTML = '<div class="no-matches">No matches found</div>';
        this.captureGroupsOutput.innerHTML = '<div class="no-captures">No capture groups</div>';
        this.highlightedText.textContent = this.textInput.value;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the playground when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OnigPlayground();
});