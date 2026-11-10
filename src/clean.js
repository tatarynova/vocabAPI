// Tidies text that arrives from the share sheet, the clipboard or the "Add word" form.

// Keeps only the part before the Apple Books footer and removes the quotes.
export function cleanContext(text = '') {
  return cleanText(text)
    .split(/\n\s*Excerpt From/i)[0]
    .replace(/^[\s“"']+|[\s”"']+$/g, '')
    .trim();
}

// Lower-case word with punctuation trimmed from both ends ("Bank," -> "bank").
export function cleanWord(word = '') {
  return cleanText(word)
    .toLowerCase()
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
    .trim();
}

// Any value -> trimmed string; non-strings (null, numbers, objects) become ''.
export function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}
