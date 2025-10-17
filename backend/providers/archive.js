import axios from 'axios';

// Archive.org provider: searches public-domain movies and returns direct MP4 links when available
export async function searchArchive({ title, year, type }) {
  if (!title) return [];
  const q = `${title} ${year || ''}`.trim();
  const adv = `https://archive.org/advancedsearch.php?output=json&q=${encodeURIComponent(q)}+AND+mediatype%3A(movies)&fl%5B%5D=identifier&fl%5B%5D=title&rows=5&page=1`;
  try {
    const r = await axios.get(adv, { timeout: 15000 });
    const docs = r.data?.response?.docs || [];
    const items = [];
    for (const d of docs) {
      const id = d.identifier; if (!id) continue;
      try {
        const metaUrl = `https://archive.org/metadata/${encodeURIComponent(id)}`;
        const m = await axios.get(metaUrl, { timeout: 15000 });
        const files = m.data?.files || [];
        // prefer mp4/h.264
        const mp4 = files.find(f => /\.mp4$/i.test(f.name));
        if (mp4) {
          const url = `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(mp4.name)}`;
          items.push({
            provider: 'Archive.org',
            type: 'mp4',
            quality: mp4?.width && mp4?.height ? `${mp4.width}x${mp4.height}` : 'mp4',
            url,
            id
          });
        }
      } catch { /* ignore single item errors */ }
    }
    return items;
  } catch {
    return [];
  }
}

