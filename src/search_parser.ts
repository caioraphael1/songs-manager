import * as types from "./types";

/**
 * Parses user input search text into structured criteria:
 * - `tag:x`           -> must have tag x
 * - `tag:x,y`         -> must have x AND y (comma = AND)
 * - `tag:x|y`         -> must have x OR y (pipe = OR within group)
 * - `!tag:x` / `-tag:x` -> must NOT have tag x
 * - anything else     -> free text search across song title and tags
 */
export function parse_search(query: string): types.Search_Filter {
    const included_tag_groups: string[][] = [];
    const excluded_tags:       string[]   = [];
    const free_text_tokens:    string[]   = [];

    const tokens = query.trim().split(/\s+/);

    for (const token of tokens) {
        if (!token) continue;
        const lower = token.toLowerCase();

        if (lower.startsWith("!tag:") || lower.startsWith("-tag:")) {
            const value = token.slice(5);
            const names = value
                .split("|")
                .map((n) => n.trim())
                .filter((n) => n.length > 0);
            excluded_tags.push(...names);
        } else if (lower.startsWith("tag:")) {
            const value = token.slice(4);
            // Split into AND-groups by comma; each group may be an OR via '|'
            for (const part of value.split(",")) {
                const names = part
                    .split("|")
                    .map((n) => n.trim())
                    .filter((n) => n.length > 0);
                if (names.length > 0) {
                    included_tag_groups.push(names);
                }
            }
        } else {
            free_text_tokens.push(token);
        }
    }

    return {
        free_text:           free_text_tokens.join(" "),
        included_tag_groups: included_tag_groups,
        excluded_tags:       excluded_tags,
    };
}
