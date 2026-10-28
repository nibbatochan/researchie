// Links in an AI answer are not useful once it is saved to the project timeline: they point nowhere the reader can
// follow. The words stay; the link and bare web addresses go. Document Assistant answers keep their page links.

/** Markdown with its links removed: `[text](url)` becomes `text`, and bare web addresses are dropped. */
export function stripLinks(markdown: string): string {
  return String(markdown ?? '')
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|#|\/)[^)]*\)/g, '$1')
    .replace(/https?:\/\/[^\s)]+/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
