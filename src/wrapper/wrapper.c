#include <oniguruma.h>
#include <string.h>

// Initialize Oniguruma once
static int onig_inited = 0;
static void ensure_onig_init() {
    if (!onig_inited) {
        OnigEncoding encodings[] = { ONIG_ENCODING_UTF8 };
        onig_initialize(encodings, 1);
        onig_inited = 1;
    }
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
 *   Returns the number of matches found.
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
        onig_free(reg);
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

    while (1) {
        r = onig_search(reg, str, end, start, end, region, ONIG_OPTION_NONE);
        if (r < 0) break; // no more matches

        if (buf_pos + num_groups*2 > buffer_size) {
            break; // no more room
        }

        for (int g = 0; g < num_groups; g++) {
            int beg = region->beg[g];
            int len = (region->end[g] >= 0 ? region->end[g] - region->beg[g] : -1);
            buffer[buf_pos++] = beg;
            buffer[buf_pos++] = len;
        }

        count++;
        start = str + region->end[0]; // continue after full match
    }

    onig_region_free(region, 1);
    onig_free(reg);
    return count;
}

