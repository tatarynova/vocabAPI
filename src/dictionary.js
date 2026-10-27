// TO-DO: add up russian translation API
export async function lookUp(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null; // 404 = word not found
    const data = await res.json();
    const meaning = data[0]?.meanings?.[0];
    return {
      definition: meaning?.definitions?.[0]?.definition ?? null,
      partOfSpeech: meaning?.partOfSpeech ?? null,
    };
  } catch {
    return null; // save the word even if user is offline
  }
}