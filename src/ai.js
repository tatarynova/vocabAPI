import Anthropic from '@anthropic-ai/sdk';

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
const MODEL = 'claude-haiku-5-5';

export const aiEnabled = Boolean(client);

async function askForJson(prompt) {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = msg.content.find((b) => b.type === 'text')?.text ?? '';
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
}

export async function defineInContext(word, context) {
  if (!client || !context) return null;
  const out = await askForJson(
    `Sentence: "${context}"\n` +
      `Explain what "${word}" means in this sentence, in one short plain-English line ` +
      `for a language learner. Reply only with JSON: {"definition": "..."}`
  );
  return out.definition ?? null;
}

export async function translateInContext(word, context) {
  if (!client) return null;
  const out = await askForJson(
    `Sentence: "${context || word}"\n` +
      `Translate the English word "${word}" into Russian, using the meaning it has in this sentence. ` +
      `Give the dictionary form (infinitive for verbs, nominative singular for nouns), one or two words. ` +
      `Reply only with JSON: {"translation": "..."}`
  );
  return out.translation ?? null;
}

export async function makeQuiz(word, definition) {
  if (!client) return null;
  return askForJson(
    `Write one new example sentence using the word "${word}" ` +
      `(meaning: ${definition ?? 'its common meaning'}), then replace the word with "____". ` +
      `Reply only with JSON: {"sentence": "...", "answer": "${word}"}`
  );
}

export async function checkSentence(word, definition, sentence) {
  if (!client) return null;
  return askForJson(
    `A learner is practising the word "${word}" (meaning: ${definition ?? 'unknown'}).\n` +
      `Their sentence: "${sentence}"\n` +
      `Is the word used correctly and naturally? Be kind and brief. ` +
      `Reply only with JSON: {"correct": true|false, "feedback": "one or two sentences", "better": "an improved version, or the same sentence if fine"}`
  );
}