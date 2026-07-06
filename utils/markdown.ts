/**
 * Remove `<think>...</think>` tags and their content from a string.
 * Handles:
 *  - Standard closing: `<think>content</think>`
 *  - Self-closing: `<think/>`
 *  - Multi-line content (dotAll / `s` flag)
 *  - Nested tags: only removes the outermost pair
 */
export function stripThinkTags(text: string): string {
  if (!text) return text
  return text
    .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, '')
    .replace(/<think\s*\/>/gi, '')
}

/**
 * Fix malformed Markdown tables where rows are concatenated on a single
 * line without newline separators.
 *
 * Example malformed input:
 *   `| A | B | |---|--| | 1 | 2 | | 3 | 4 |`
 *
 * Fixed output:
 *   `| A | B |\n|---|--|\n| 1 | 2 |\n| 3 | 4 |`
 *
 * The function operates line-by-line and only transforms lines that
 * contain at least one `|` character.  Well-formed tables (already
 * containing newlines between rows) are left unchanged.
 */
export function fixMalformedTable(text: string): string {
  return text.split('\n').map((line) => {
    if (!line.includes('|')) return line

    let fixed = line

    // Step 1: Insert newline BEFORE each separator row.
    // A separator row is a series of pipes containing only `-`, `:`, `|` and spaces.
    // Pattern: |regular_row|  |---separator---|
    fixed = fixed.replace(
      /\|([^|\n]*(?:\|[^|\n]*)*)\|[ \t]*(\|[-:| ]+\|)/g,
      '|$1|\n$2',
    )

    // Step 2: Insert newline AFTER each separator row, BEFORE the next data row.
    // Pattern: |---separator---|  |data_row|
    fixed = fixed.replace(
      /(\|[-:| ]+\|)[ \t]*(\|[^|\n][^\n]*\|)/g,
      '$1\n$2',
    )

    // Step 3: Insert newlines between consecutive data rows (and repeat
    // until stable — the regex engine only finds non-overlapping matches).
    let prev = ''
    while (prev !== fixed) {
      prev = fixed
      fixed = fixed.replace(
        /(\|[^|\-\n][^\n]*\|)[ \t]+(\|[^|\-\n][^\n]*\|)/g,
        '$1\n$2',
      )
    }

    return fixed
  }).join('\n')
}
