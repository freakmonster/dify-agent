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
