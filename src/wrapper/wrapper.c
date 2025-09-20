#include <oniguruma.h>
#include <string.h>
#include <stdio.h>

// Initialize Oniguruma once
static int onig_inited = 0;
static void ensure_onig_init() {
    if (!onig_inited) {
        OnigEncoding encodings[] = { ONIG_ENCODING_UTF8 };
        onig_initialize(encodings, 1);
        onig_inited = 1;
    }
}

// Global error message buffer
static char error_msg[256] = {0};

/**
 * get_last_error_message:
 *   Returns the last error message from regex compilation
 */  
const char* get_last_error_message() {
    return error_msg;
}

/**
 * match_all:
 *   Find all matches of `pattern` in `text`.
 *
 *   Results are written into `buffer` as a flat array of ints:
 *   [match0_group0_start, match0_group0_len,
 *    match0_group1_start, match0_group1_len, ...,
 *    match1_group0_start, match1_group0_len, ...]
 *
 *   Returns the number of matches found, or -1 on error.
 *   Use get_last_error_message() to get detailed error information.
 *
 *   NOTE: Caller must allocate buffer big enough to hold:
 *         max_matches * num_groups * 2 integers.
 */
int match_all(const char* pattern,
              const char* text,
              int* buffer,
              int buffer_size,     // capacity in ints
              int* num_groups_out) // returns number of capture groups (incl. whole match)
{
    ensure_onig_init();

    // Clear previous error message
    error_msg[0] = '\0';

    regex_t* reg;
    OnigErrorInfo einfo;

    int r = onig_new(&reg,
                     (const OnigUChar*)pattern,
                     (const OnigUChar*)(pattern + strlen(pattern)),
                     ONIG_OPTION_NONE,
                     ONIG_ENCODING_UTF8,
                     ONIG_SYNTAX_DEFAULT,
                     &einfo);

    if (r != ONIG_NORMAL) {
        // Generate detailed error message
        char err_buf[ONIG_MAX_ERROR_MESSAGE_LEN];
        onig_error_code_to_str((OnigUChar*)err_buf, r, &einfo);
        snprintf(error_msg, sizeof(error_msg), "Regex compilation error: %s", err_buf);
        
        if (reg) onig_free(reg);
        return -1;
    }

    int num_groups = onig_number_of_captures(reg) + 1; // +1 for full match
    if (num_groups_out) {
        *num_groups_out = num_groups;
    }

    OnigRegion* region = onig_region_new();
    const OnigUChar* str = (const OnigUChar*)text;
    const OnigUChar* end = str + strlen(text);
    const OnigUChar* start = str;

    int count = 0;
    int buf_pos = 0;

    while (start < end) {
        if (buf_pos + num_groups*2 > buffer_size) {
            break; // no more room
        }

        r = onig_search(reg, str, end, start, end, region, ONIG_OPTION_NONE);
        if (r < 0) break; // no more matches

        // Debug: track what we found
        int match_start = region->beg[0];
        int match_end = region->end[0];
        
        for (int g = 0; g < num_groups; g++) {
            int beg = region->beg[g];
            int len = (region->end[g] >= 0 ? region->end[g] - region->beg[g] : -1);
            buffer[buf_pos++] = beg;
            buffer[buf_pos++] = len;
        }

        count++;
        
        // Calculate next search position after this match
        const OnigUChar* match_end_ptr = str + match_end;
        if (match_end > match_start) {
            // Normal match (non-zero length): continue from end of match
            start = match_end_ptr;
        } else {
            // Zero-length match: advance by one character to avoid infinite loop
            start = match_end_ptr + 1;
        }
    }

    onig_region_free(region, 1);
    onig_free(reg);
    return count;
}

