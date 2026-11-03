// TO-DO: add up russian translation API
export async function lookUp(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'VocabAPI/1.0 (github.com/YOUR_GITHUB_NAME/vocab-api)' },
    });
    if (!res.ok) {
      console.error(`Dictionary lookup for "${word}" failed: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    const meaning = data[0]?.meanings?.[0];
    return {
      definition: meaning?.definitions?.[0]?.definition ?? null,
      partOfSpeech: meaning?.partOfSpeech ?? null,
    };
  } catch {
    console.error(`Dictionary lookup for "${word}" failed:`, err.message);
    return null;
  }
}