const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();


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

function httpsJsonRequest(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers }, (resp) => {
      let data = '';
      resp.on('data', (chunk) => (data += chunk));
      resp.on('end', () => {
        const code = resp.statusCode || 0;
        let parsed;
        try { parsed = data ? JSON.parse(data) : {}; } catch { parsed = { raw: data }; }
        resolve({ code, data: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function fetchFromRapidApi(inputUrl) {
  const rapidKey = process.env.RAPIDAPI_KEY;
  const rapidHost = process.env.RAPIDAPI_HOST || 'social-media-video-downloader.p.rapidapi.com';
  const rapidPath = process.env.RAPIDAPI_PATH || '/';

  if (!rapidKey || !rapidHost) {
    throw new Error('RAPIDAPI_KEY belum diset di environment.');
  }

  const endpoint = new URL(`https://${rapidHost}${rapidPath}`);
  endpoint.searchParams.set('url', inputUrl);

  const { code, data } = await httpsJsonRequest(endpoint.toString(), {
    method: 'GET',
    headers: {
      'x-rapidapi-key': rapidKey,
      'x-rapidapi-host': rapidHost
    }
  });

  if (code < 200 || code >= 300) {
    throw new Error(`RapidAPI error ${code}`);
  }

  return {
    status: true,
    source: 'rapidapi',
    provider: rapidHost,
    result: data
  };
}

function renderPage(host) {
  return `<!doctype html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Downloader API</title>
<style>body{font-family:Arial;background:#0d0820;color:#fff;margin:0}.wrap{max-width:980px;margin:0 auto;padding:20px}.card{background:#171032;border:1px solid #362a64;border-radius:12px;padding:16px;margin-bottom:16px}input,button,textarea{width:100%;padding:12px;border-radius:8px;border:1px solid #362a64;background:#120c29;color:#fff}button{background:#9f84ff;color:#140d30;font-weight:700}</style></head>
<body><div class="wrap"><h1>TikTok Downloader API (RapidAPI)</h1><p>Paste URL TikTok lalu execute. Backend akan request ke provider RapidAPI.</p>
<div class="card"><h2>TikTok DL</h2><input id="url" placeholder="https://vt.tiktok.com/..."/><br/><br/><button id="go">EXECUTE API</button><p><small>POST ${host}/api/tiktok</small></p><textarea id="out" rows="14" readonly>{"status":true}</textarea></div>
<div class="card"><b>Setup wajib:</b> set env <code>RAPIDAPI_KEY</code>, <code>RAPIDAPI_HOST</code>, opsional <code>RAPIDAPI_PATH</code>.</div></div>
<script>go.onclick=async()=>{out.value='Loading...';const r=await fetch('/api/tiktok',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url.value.trim()})});out.value=JSON.stringify(await r.json(),null,2);};</script></body></html>`;
}

async function handler(req, res) {
  const host = req.headers.host || 'localhost:3000';
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const u = new URL(req.url, `${proto}://${host}`);

  if (req.method === 'OPTIONS') return send(res, 204, '', 'text/plain; charset=utf-8');
  if (req.method === 'GET' && u.pathname === '/') return send(res, 200, renderPage(`${proto}://${host}`), 'text/html; charset=utf-8');
  if (req.method === 'GET' && u.pathname === '/docs') return sendJson(res, 200, { endpoint: 'POST /api/tiktok', source: 'RapidAPI', default_host: 'social-media-video-downloader.p.rapidapi.com', env: ['RAPIDAPI_KEY', 'RAPIDAPI_HOST(optional)', 'RAPIDAPI_PATH(optional)'] });

  if (req.method === 'POST' && u.pathname === '/api/tiktok') {
    try {
      const body = await parseJsonBody(req);
      if (!body.url || !isValidHttpUrl(body.url)) return sendJson(res, 400, { status: false, message: 'Invalid url' });
      const data = await fetchFromRapidApi(body.url);
      return sendJson(res, 200, data);
    } catch (err) {
      return sendJson(res, 502, { status: false, message: 'Gagal request ke RapidAPI', error: err && err.message ? err.message : String(err) });
    }
  }

  return sendJson(res, 404, { status: false, message: 'Not found' });
}

module.exports = handler;
module.exports.handler = handler;
