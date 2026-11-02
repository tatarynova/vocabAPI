// aim: keeps only the part before the footer and removes the quotes

export function cleanContext(text = '') {
  return text
    .split(/\n\s*Excerpt From/i)[0]
    .replace(/^[\s“"']+|[\s”"']+$/g, '')
    .trim();
}

export function cleanWord(word = '') {
  return word
    .toLowerCase()
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
    .trim();
}