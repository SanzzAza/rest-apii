const https = require('https');
const { URL } = require('url');

function send(res, status, body, contentType = 'application/json; charset=utf-8') {
  res.statusCode = status;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(body);
}
const sendJson = (res, status, data) => send(res, status, JSON.stringify(data, null, 2));

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function isValidHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

function fetchText(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: '*/*' } }, (resp) => {
      const code = resp.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(code) && resp.headers.location && maxRedirects > 0) {
        const next = new URL(resp.headers.location, url).toString();
        resp.resume();
        return resolve(fetchText(next, maxRedirects - 1));
      }

      let data = '';
      resp.on('data', (chunk) => (data += chunk));
      resp.on('end', () => resolve({ code, data, finalUrl: url }));
    });
    req.on('error', reject);
  });
}

async function resolveTikTokUrl(inputUrl) {
  const result = await fetchText(inputUrl);
  if (result.code >= 400) throw new Error(`TikTok URL error ${result.code}`);
  return result.finalUrl;
}

async function fetchTikTokOEmbed(inputUrl) {
  const canonicalUrl = await resolveTikTokUrl(inputUrl);
  const endpoint = new URL('https://www.tiktok.com/oembed');
  endpoint.searchParams.set('url', canonicalUrl);

  const response = await fetchText(endpoint.toString());
  if (response.code < 200 || response.code >= 300) {
    throw new Error(`oEmbed error ${response.code}. Coba pakai link full /@username/video/id`);
  }

  let data;
  try { data = JSON.parse(response.data); } catch { throw new Error('Invalid oEmbed JSON'); }

  return {
    status: true,
    source: 'tiktok_oembed',
    result: data,
    normalized_url: canonicalUrl
  };
}

function renderPage(host) {
  return `<!doctype html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Downloader API</title>
<style>body{font-family:Arial;background:#0d0820;color:#fff;margin:0}.wrap{max-width:980px;margin:0 auto;padding:20px}.card{background:#171032;border:1px solid #362a64;border-radius:12px;padding:16px;margin-bottom:16px}input,button,textarea{width:100%;padding:12px;border-radius:8px;border:1px solid #362a64;background:#120c29;color:#fff}button{background:#9f84ff;color:#140d30;font-weight:700}</style></head>
<body><div class="wrap"><h1>Downloader Landing Page</h1><p>Gunakan link TikTok. Shortlink akan dicoba dinormalisasi otomatis.</p>
<div class="card"><h2>TikTok DL</h2><input id="url" placeholder="https://vt.tiktok.com/..."/><br/><br/><button id="go">EXECUTE API</button><p><small>POST ${host}/api/tiktok</small></p><textarea id="out" rows="14" readonly>{"status":true}</textarea></div>
<div class="card"><b>Tips:</b> kalau gagal, coba paste link full: <code>https://www.tiktok.com/@user/video/123</code></div></div>
<script>go.onclick=async()=>{out.value='Loading...';const r=await fetch('/api/tiktok',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url.value.trim()})});out.value=JSON.stringify(await r.json(),null,2);};</script></body></html>`;
}

async function handler(req, res) {
  const host = req.headers.host || 'localhost:3000';
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const u = new URL(req.url, `${proto}://${host}`);

  if (req.method === 'OPTIONS') return send(res, 204, '', 'text/plain; charset=utf-8');
  if (req.method === 'GET' && u.pathname === '/') return send(res, 200, renderPage(`${proto}://${host}`), 'text/html; charset=utf-8');
  if (req.method === 'GET' && u.pathname === '/docs') return sendJson(res, 200, { endpoint: 'POST /api/tiktok', note: 'Supports shortlink normalization' });

  if (req.method === 'POST' && u.pathname === '/api/tiktok') {
    try {
      const body = await parseJsonBody(req);
      if (!body.url || !isValidHttpUrl(body.url)) return sendJson(res, 400, { status: false, message: 'Invalid url' });
      const data = await fetchTikTokOEmbed(body.url);
      return sendJson(res, 200, data);
    } catch (err) {
      return sendJson(res, 502, { status: false, message: 'Gagal ambil data TikTok', error: err && err.message ? err.message : String(err) });
    }
  }

  return sendJson(res, 404, { status: false, message: 'Not found' });
}

module.exports = handler;
module.exports.handler = handler;
