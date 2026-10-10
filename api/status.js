module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const hasEnvKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10);
  res.status(200).json({
    hasEnvKey,
    model: 'gemini-3.8-flash',
    deployed: 'vercel'
  });
};
