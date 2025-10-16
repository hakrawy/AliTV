import express from "express";
import axios from "axios";
import cors from "cors";
import NodeCache from "node-cache";
import cron from "node-cron";
import Redis from "ioredis";
import xml2js from "xml2js";

const app = express();
app.use(express.json());

// ====== ENV ======
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const CACHE_TTL = Number(process.env.CACHE_TTL_SECONDS || 21600);
const IPTV_ORG_INDEX_URL = process.env.IPTV_ORG_INDEX_URL || "https://iptv-org.github.io/iptv/index.m3u";
const TMDB_API_KEY = process.env.TMDB_API_KEY || "0775f71fe7655df78ef9d1738087d4e6";
const DEFAULT_EPG = process.env.EPG_URL || ""; // e.g. https://iptv-org.github.io/epg/guides/sa-ar.xml

// ====== CORS ======
app.use(cors({
  origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN.split(","),
  methods: ["GET","POST","OPTIONS"]
}));

// ====== Cache ======
const redisUrl = process.env.REDIS_URL || "";
const redis = redisUrl ? new Redis(redisUrl) : null;
const mem = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 120 });

async function cacheGet(key){ if (redis) { const v = await redis.get(key); if (v) return JSON.parse(v); } return mem.get(key) ?? null; }
async function cacheSet(key, val, ttl=CACHE_TTL){ if (redis) await redis.set(key, JSON.stringify(val), "EX", ttl); mem.set(key, val, ttl); }
async function safeGet(url, opts={}){ return axios.get(url, { timeout: 20000, ...opts }); }

// ====== M3U Parser ======
function parseM3U(text){
  const lines = text.split(/\r?\n/);
  const channels = [];
  let cur = null;
  for (const raw of lines){
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#EXTINF:")){
      const name = (line.match(/,(.*)$/) || [, "Unknown"])[1].trim();
      const logo = (line.match(/tvg-logo="(.*?)"/) || [, ""])[1];
      const group = (line.match(/group-title="(.*?)"/) || [, "Others"])[1];
      const tvgId = (line.match(/tvg-id="(.*?)"/) || [, ""])[1];
      cur = { id: tvgId || undefined, name, logo, group, streams: [] };
    } else if (/^https?:\/\//i.test(line)){
      if (!cur) cur = { name: line, logo: "", group: "Others", streams: [] };
      cur.streams.push({ url: line, status:"unknown", last_check:null, latency_ms:null });
      channels.push(cur);
      cur = null;
    }
  }
  return channels;
}

// ====== IPTV-org index ======
app.get("/api/channels", async (req, res)=>{
  try {
    let list = await cacheGet("iptv:index");
    if (!list){
      const r = await safeGet(IPTV_ORG_INDEX_URL, { responseType:"text" });
      list = parseM3U(r.data);
      await cacheSet("iptv:index", list);
    }
    const q = (req.query.q||"").toLowerCase();
    const group = (req.query.group||"").toLowerCase();
    let filtered = list;
    if (q) filtered = filtered.filter(c => (c.name||"").toLowerCase().includes(q) || (c.group||"").toLowerCase().includes(q));
    if (group && group !== "all") filtered = filtered.filter(c => (c.group||"").toLowerCase().includes(group));
    const page = Math.max(1, parseInt(req.query.page||"1",10));
    const limit = Math.min(200, Math.max(10, parseInt(req.query.limit||"120",10)));
    const start = (page-1)*limit;
    res.json({ status:"ok", total: filtered.length, page, limit, channels: filtered.slice(start, start+limit) });
  } catch (e) {
    res.status(500).json({ error:"Failed to fetch iptv-org index" });
  }
});

// ====== M3U import ======
app.post("/api/parse-m3u", async (req, res)=>{
  try {
    const { url, content } = req.body || {};
    if (!url && !content) return res.status(400).json({ error:"Provide url or content" });
    let text = content;
    if (url){ const r = await safeGet(url, { responseType:"text" }); text = r.data; }
    const channels = parseM3U(text);
    res.json({ status:"ok", count: channels.length, channels });
  } catch (e) {
    res.status(500).json({ error:"Failed to parse m3u" });
  }
});

// ====== Xtream Codes ======
app.post("/api/xtream", async (req, res)=>{
  try {
    const { host, username, password } = req.body || {};
    if (!host || !username || !password) return res.status(400).json({ error:"host, username, password required" });
    let base = host.trim();
    if (!/^https?:\/\//.test(base)) base = "http://" + base;
    if (base.endsWith("/")) base = base.slice(0,-1);
    const url = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    const r = await safeGet(url, { responseType:"json", validateStatus:()=>true });
    res.json({ status:"ok", data:r.data });
  } catch (e) {
    res.status(500).json({ error:"xtream fetch failed" });
  }
});

// ====== TMDB (Arabic) ======
const tmdb = axios.create({ baseURL:"https://api.themoviedb.org/3", timeout:15000, params:{ api_key: TMDB_API_KEY, language:"ar-SA" }});

app.get("/api/tmdb/trending", async (req, res)=>{
  try {
    const type = (req.query.type||"all").toLowerCase();
    const r = await tmdb.get(`/trending/${type}/day`);
    res.json(r.data);
  } catch { res.status(500).json({ error:"tmdb trending failed" }); }
});

app.get("/api/tmdb/movie/:id", async (req,res)=>{
  try {
    const id = req.params.id;
    const [d,v,cr,sm] = await Promise.all([
      tmdb.get(`/movie/${id}`),
      tmdb.get(`/movie/${id}/videos`),
      tmdb.get(`/movie/${id}/credits`),
      tmdb.get(`/movie/${id}/similar`)
    ]);
    res.json({ detail:d.data, videos:v.data, credits:cr.data, similar:sm.data });
  } catch { res.status(500).json({ error:"tmdb movie failed" }); }
});

app.get("/api/tmdb/tv/:id", async (req,res)=>{
  try {
    const id = req.params.id;
    const [d,v,cr,sm] = await Promise.all([
      tmdb.get(`/tv/${id}`),
      tmdb.get(`/tv/${id}/videos`),
      tmdb.get(`/tv/${id}/credits`),
      tmdb.get(`/tv/${id}/similar`)
    ]);
    res.json({ detail:d.data, videos:v.data, credits:cr.data, similar:sm.data });
  } catch { res.status(500).json({ error:"tmdb tv failed" }); }
});

// ====== EPG ======
app.get("/api/epg", async (req, res)=>{
  try {
    const src = (req.query.source || "").trim() || DEFAULT_EPG;
    if (!src) return res.status(400).json({ error:"EPG not configured (set EPG_URL or pass ?source=)" });
    const { channel } = req.query;
    const r = await axios.get(src, { responseType:"text", timeout:30000 });
    const parsed = await xml2js.parseStringPromise(r.data, { explicitArray:false, mergeAttrs:true });
    let progs = parsed?.tv?.programme || [];
    if (!Array.isArray(progs)) progs = [progs];
    if (channel) progs = progs.filter(p => p.channel === channel);
    res.json({ source:src, channel, count: progs.length, items: progs.slice(0,200) });
  } catch { res.status(500).json({ error:"EPG fetch failed" }); }
});

// ====== Cron refresh ======
cron.schedule("0 */6 * * *", async ()=>{
  try {
    const r = await safeGet(IPTV_ORG_INDEX_URL, { responseType:"text" });
    await cacheSet("iptv:index", parseM3U(r.data));
    console.log("Cron: iptv index refreshed");
  } catch (e) { console.error("Cron failed:", e?.message || e); }
});

app.get("/api/stats", async (req,res)=>{
  res.json({ uptime: process.uptime(), redis: !!redis, iptv_cached: !!(await cacheGet("iptv:index")) });
});

app.listen(PORT, ()=> console.log(`AliTV Arabic backend on ${PORT}`));
