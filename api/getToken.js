// File: /api/getToken.js
import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req, res) {
  const { roomName, identity } = req.query;

  if (!roomName || !identity) {
    return res.status(400).json({ error: 'Missing "roomName" or "identity" query parameter' });
  }

  // We will get these from Vercel's "Environment Variables"
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
      return res.status(500).json({ error: 'Server is not configured with LiveKit keys.' });
  }

  // This creates a new "ticket" (access token)
  const at = new AccessToken(apiKey, apiSecret, { identity });

  // These are the permissions for the user holding the ticket
  at.addGrant({ 
    room: roomName, 
    roomJoin: true, 
    canPublish: true, // can they send audio? yes.
    canSubscribe: true // can they receive audio? yes.
  });

  // The ticket is valid for 1 hour
  const token = await at.toJwt();

  // Send the ticket back to the app
  res.status(200).json({ token });
}