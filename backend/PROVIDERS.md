# Provider Connectors

This backend exposes a simple provider interface to return legal/public streams for a given title/year/type.

- Route: `GET /api/providers/search?title=...&year=...&type=movie|tv`
- Response: `{ items: [{ provider, type, quality, url, id }] }`

## Adding a provider

1. Create a module under `backend/providers/<name>.js` that exports an async function, e.g. `search<Name>({ title, year, type })` that returns an array of items.
2. Import and register it in `backend/providers/index.js` (inside `searchProviders`).
3. Keep it legal: Only add providers for content you have rights to, or public‑domain sources (e.g., Archive.org).

### Item fields
- `provider`: Human‑readable name (e.g., `Archive.org`).
- `type`: Optional hint (`mp4`, `m3u8`, `page`).
- `quality`: Optional (e.g., `1080p`, or `1280x720`).
- `url`: Absolute URL. For `page`, it will open in a new tab.
- `id`: Optional provider item id.

### Example skeleton
```js
export async function searchExample({ title, year, type }) {
  // Build a search request...
  // return [{ provider: 'Example', type: 'page', url: 'https://example.com/watch/...' }];
  return [];
}
```

Update `providers/index.js`:
```js
import { searchExample } from './example.js';
export async function searchProviders(ctx){
  const out = [];
  out.push(...await searchExample(ctx));
  return out;
}
```

## Notes
- Consider timeouts and small result limits.
- Avoid scraping sites you don’t own or that prohibit automated access.
- Prefer official APIs where available.
