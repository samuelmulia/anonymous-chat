// File: /api/getToken.js
const { AccessToken } = require('livekit-server-sdk');

// This is a Vercel Serverless Function using standard CommonJS syntax.
module.exports = async (req, res) => {
  const { roomName, identity } = req.query;

  if (typeof roomName !== 'string' || typeof identity !== 'string') {
    return res.status(400).json({ error: 'Missing "roomName" or "identity" query parameter' });
  }

  // These MUST be stored as Environment Variables on Vercel.
  // They are NOT prefixed with REACT_APP_ because this is server code.
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'LiveKit API Key or Secret is not configured on the server.' });
  }

  const at = new AccessToken(apiKey, apiSecret, { identity: identity });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();

  res.status(200).json({ token });
};
