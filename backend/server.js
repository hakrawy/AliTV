import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

const app = express();
app.use(express.json({ limit: '1mb' }));

// CORS
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: CORS_ORIGIN }));

// Simple in-memory cache
const cache = new Map();
function remember(key, ttlMs, fn) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.time < ttlMs) return Promise.resolve(hit.data);
  return Promise.resolve(fn()).then((data) => {
    cache.set(key, { time: now, data });
    return data;
  });
}

// TMDB
const TMDB_KEY = process.env.TMDB_API_KEY || process.env.TMDB_KEY || '';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const tmdb = axios.create({ baseURL: TMDB_BASE, timeout: 15000 });
function tmdbGet(url, params = {}) {
  const qp = { api_key: TMDB_KEY, language: 'en-US', ...params };
  return tmdb.get(url, { params: qp }).then((r) => r.data);
}

app.get('/api/tmdb/trending', async (req, res) => {
  try {
    const type = req.query.type === 'tv' ? 'tv' : 'movie';
    const data = await remember(`tmdb_trending_${type}`, 10 * 60 * 1000, () =>
      tmdbGet(`/trending/${type}/week`)
    );
    res.json({ results: data.results || [] });
  } catch (e) {
    res.status(500).json({ error: 'tmdb_trending_failed' });
  }
});

app.get('/api/tmdb/discover', async (req, res) => {
  try {
    const type = req.query.type === 'tv' ? 'tv' : 'movie';
    const data = await remember(`tmdb_discover_${type}`, 10 * 60 * 1000, () =>
      tmdbGet(`/discover/${type}`, { sort_by: 'popularity.desc' })
    );
    res.json({ results: data.results || [] });
  } catch (e) {
    res.status(500).json({ error: 'tmdb_discover_failed' });
  }
});

app.get('/api/tmdb/movie/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const detail = await remember(`tmdb_movie_${id}`, 6 * 60 * 60 * 1000, () => tmdbGet(`/movie/${id}`));
    const videos = await remember(`tmdb_movie_v_${id}`, 3 * 60 * 60 * 1000, () => tmdbGet(`/movie/${id}/videos`));
    res.json({ detail, videos });
  } catch (e) {
    res.status(500).json({ error: 'tmdb_movie_failed' });
  }
});

app.get('/api/tmdb/tv/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const detail = await remember(`tmdb_tv_${id}`, 6 * 60 * 60 * 1000, () => tmdbGet(`/tv/${id}`));
    const videos = await remember(`tmdb_tv_v_${id}`, 3 * 60 * 60 * 1000, () => tmdbGet(`/tv/${id}/videos`));
    res.json({ detail, videos });
  } catch (e) {
    res.status(500).json({ error: 'tmdb_tv_failed' });
  }
});

// Channels (default)
const DEFAULT_M3U = process.env.DEFAULT_M3U_URL || '';
function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const channels = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      const nameMatch = line.match(/,(.*)$/);
      const name = nameMatch ? nameMatch[1].trim() : 'Channel';
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupMatch = line.match(/group-title="([^"]*)"/);
      current = {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        logo: logoMatch ? logoMatch[1] : '',
        group: groupMatch ? groupMatch[1] : '',
        streams: []
      };
    } else if (current && line && !line.startsWith('#')) {
      current.streams.push({ url: line.trim() });
      if (current.streams.length === 1) channels.push(current);
      current = null;
    }
  }
  return channels;
}

app.get('/api/channels', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '250', 10);
    if (DEFAULT_M3U) {
      const data = await remember(`m3u_${DEFAULT_M3U}`, 30 * 60 * 1000, async () => {
        const r = await axios.get(DEFAULT_M3U, { responseType: 'text' });
        return r.data;
      });
      const all = parseM3U(data);
      return res.json({ channels: all.slice(0, limit) });
    }
    // fallback sample
    const sample = [
      { id: 'sample-1', name: 'Sample News', logo: '', group: 'News', streams: [{ url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }] },
      { id: 'sample-2', name: 'Sample Sports', logo: '', group: 'Sports', streams: [{ url: 'https://moq-01.akamaized.net/live/eds/Sporty_1/playlist.m3u8' }] }
    ];
    res.json({ channels: sample.slice(0, limit) });
  } catch (e) {
    res.status(500).json({ error: 'channels_failed' });
  }
});

app.post('/api/parse-m3u', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'missing_url' });
    const text = await axios.get(url, { responseType: 'text' }).then((r) => r.data);
    const channels = parseM3U(text);
    res.json({ channels });
  } catch (e) {
    res.status(500).json({ error: 'parse_m3u_failed' });
  }
});

// EPG
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
app.get('/api/epg', async (req, res) => {
  try {
    const { channel = '', source = '' } = req.query;
    if (!source) return res.json({ items: [] });
    const xml = await remember(`epg_${source}`, 10 * 60 * 1000, async () => {
      const r = await axios.get(source, { responseType: 'text' });
      return r.data;
    });
    const j = parser.parse(xml);
    const programmes = j?.tv?.programme || [];
    // Normalize to array
    const list = Array.isArray(programmes) ? programmes : [programmes].filter(Boolean);
    let items = list.map((p) => ({
      channel: p.channel,
      title: typeof p.title === 'object' ? (p.title._ || p.title) : p.title,
      start: p.start,
      end: p.end
    }));
    if (channel) {
      const q = String(channel).toLowerCase();
      items = items.filter((it) => (it.channel || '').toLowerCase().includes(q));
    }
    res.json({ items: items.slice(0, 10) });
  } catch (e) {
    res.status(500).json({ error: 'epg_failed' });
  }
});

// Xtream import
app.post('/api/xtream/import', async (req, res) => {
  try {
    const { host, port = '80', username, password } = req.body || {};
    if (!host || !username || !password) return res.status(400).json({ error: 'missing_fields' });
    const ua = req.header('X-Device-UA') || 'Dalvik/2.1.0 (Linux; U; Android 10) AliTV/1.0';
    const base = host.startsWith('http') ? host : `http://${host}`;
    const api = `${base}:${port}/player_api.php`;
    const http = axios.create({
      headers: { 'User-Agent': ua },
      timeout: 20000
    });
    // auth info (optional)
    await http.get(api, { params: { username, password } }).catch(() => null);
    // live streams
    const live = await http.get(api, { params: { username, password, action: 'get_live_streams' } }).then((r) => r.data);
    const channels = (Array.isArray(live) ? live : []).map((s) => {
      const streamId = s.stream_id || s.streamId || s.streamID || s.id;
      const url = `${base}:${port}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.m3u8`;
      return {
        id: String(streamId),
        name: s.name || `CH ${streamId}`,
        logo: s.stream_icon || s.streamIcon || '',
        group: s.category_name || String(s.category_id || ''),
        streams: [{ url }]
      };
    });
    res.json({ channels });
  } catch (e) {
    res.status(500).json({ error: 'xtream_failed' });
  }
});

// Optional: simple proxy with allowlist (disabled by default)
// app.get('/api/proxy', async (req, res) => { /* ... */ });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AliTV backend listening on :${PORT}`);
});

