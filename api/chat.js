const https = require('https');

module.exports = async (req, res) => {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' });
    return;
  }

  try {
    const { systemPrompt, userMessage } = req.body || {};
    if (!userMessage) {
      res.status(400).json({ error: 'userMessage가 필요합니다.' });
      return;
    }

    const payload = JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
        responseMimeType: 'application/json'
      }
    });

    const geminiReq = https.request({
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: '/v1beta/models/gemini-3.8-flash:generateContent',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY
      }
    }, (geminiRes) => {
      let data = '';
      geminiRes.on('data', chunk => data += chunk);
      geminiRes.on('end', () => {
        try {
          if (geminiRes.statusCode !== 200) {
            res.status(geminiRes.statusCode).json({ error: `Gemini Error: ${data}` });
            return;
          }
          const parsed = JSON.parse(data);
          const rawText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          try {
            res.status(200).json(JSON.parse(cleanJson));
          } catch (jsonErr) {
            res.status(200).json({
              replyEn: cleanJson.slice(0, 100) || "That sounds so fun, Siwoo! Tell me more!",
              replyKr: "시우야, 듣기만 해도 진짜 재밌다! 조금만 더 들려줄래?",
              suggestions: [
                { emoji: "🧱", en: "I love Legos!", phonetic: "[아이 러브 레고스]", kr: "레고가 좋아요!" },
                { emoji: "❓", en: "How about you, Bricky?", phonetic: "[하우 어바웃 유, 브릭키]", kr: "브릭키 너는 어때?" }
              ]
            });
          }
        } catch (e) {
          res.status(500).json({ error: 'Gemini 처리 오류: ' + e.message });
        }
      });
    });

    geminiReq.on('error', (err) => {
      res.status(500).json({ error: err.message });
    });

    geminiReq.write(payload);
    geminiReq.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
