export async function lookUp(word) {
  const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'VocabAPI/1.0 (github.com/YOUR_GITHUB_NAME/vocab-api)' },
    });
    if (!res.ok) {
      console.error(`Dictionary lookup for "${word}" failed: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    for (const entry of data.en ?? []) {
      for (const d of entry.definitions ?? []) {
        const text = d.definition?.replace(/<[^>]*>/g, '').trim();
        if (text) {
          return { definition: text, partOfSpeech: entry.partOfSpeech?.toLowerCase() ?? null };
        }
      }
    }
    return null; // nothing usable found
  } catch (err) {
    console.error(`Dictionary lookup for "${word}" failed:`, err.message);
    return null;
  }
}