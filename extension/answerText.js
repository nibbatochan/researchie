// Clean text for an AI answer saved to the project timeline: links are removed (the words stay), and blank lines are
// tidied. Loaded by the side panel and the popup before their own scripts.
function plainAnswer(text) {
  return String(text || '')
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|#)[^)]*\)/g, '$1')
    .replace(/https?:\/\/[^\s)]+/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
