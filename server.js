/**
 * 🧱 BrickTalk Live - 보안 로컬 AI 프록시 서버 (server.js)
 * - 정적 파일 서빙 (HTML, JS, CSS, 미디어)
 * - /api/chat 엔드포인트: 환경변수 GEMINI_API_KEY를 안전하게 활용하여
 *   클라이언트에 키 노출 없이 실시간 Gemini 3.5 Flash Lite 티키타카 제공
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const API_KEY = process.env.GEMINI_API_KEY || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

// Gemini 3.5 Flash Lite 호출 함수
function callGemini(sysPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    if (!API_KEY) {
      return reject(new Error('서버 환경변수에 GEMINI_API_KEY가 없습니다.'));
    }

    const payload = JSON.stringify({
      systemInstruction: { parts: [{ text: sysPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 350,
        responseMimeType: 'application/json'
      }
    });

    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: '/v1beta/models/gemini-1.5-flash:generateContent',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            return reject(new Error(`Gemini HTTP ${res.statusCode}: ${data}`));
          }
          const parsed = JSON.parse(data);
          const rawText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const result = JSON.parse(cleanJson);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const requestHandler = (req, res) => {
  // CORS & 보안 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. 실시간 대화 AI API
  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50000) req.destroy(); // DoS 방지
    });
    req.on('end', async () => {
      try {
        const { systemPrompt, userMessage } = JSON.parse(body || '{}');
        if (!userMessage) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'userMessage가 필요합니다.' }));
          return;
        }

        const reply = await callGemini(systemPrompt, userMessage);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(reply));
      } catch (err) {
        console.error('[API 에러]:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 2. AI 상태 확인 API
  if (req.url === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      hasEnvKey: Boolean(API_KEY && API_KEY.length > 10),
      model: 'gemini-3.5-flash-lite'
    }));
    return;
  }

  // 3. 정적 파일 서빙
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
};

// 1. HTTP 서버 (PC 로컬호스트용)
const httpServer = http.createServer(requestHandler);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[HTTP] PC 접속용 서버: http://localhost:${PORT}`);
});

// 2. HTTPS 서버 (아이패드 Safari 마이크/카메라 권한 허용용)
const HTTPS_PORT = 8443;
try {
  const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
  };
  const httpsServer = https.createServer(sslOptions, requestHandler);
  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`[HTTPS] 아이패드 접속용 보안 서버: https://192.168.45.19:${HTTPS_PORT}`);
  });
} catch (e) {
  console.warn('[HTTPS 안내] SSL 인증서 파일이 없어 HTTP만 구동됩니다.', e.message);
}
