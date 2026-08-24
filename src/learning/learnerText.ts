const INLINE_BACKTICK_PAIR = /`([^`\r\n]+)`/g;

/**
 * Lesson prose is plain text, not Markdown. Convert its old inline backtick
 * markers into the straight apostrophes used by the learner-facing UI.
 * Multiline or unmatched backticks are deliberately left alone so this helper
 * can never rewrite an assembly/code block by accident.
 */
export function formatLearnerText(text: string): string {
  return text.replace(INLINE_BACKTICK_PAIR, (_match, term: string) => `'${term}'`);
}
