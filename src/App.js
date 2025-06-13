import React, { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  AudioConference,
  ControlBar
} from '@livekit/components-react';
import '@livekit/components-styles';
import { AccessToken } from 'livekit-server-sdk'; // Import for client-side token generation

// --- Main App Component ---
export default function App() {
  const [roomId, setRoomId] = useState('');
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get the LiveKit Server URL and credentials from Vercel Environment Variables
  const serverUrl = process.env.REACT_APP_LIVEKIT_URL;
  const apiKey = process.env.REACT_APP_LIVEKIT_API_KEY;
  const apiSecret = process.env.REACT_APP_LIVEKIT_API_SECRET;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      setIsLoading(true);

      if (!apiKey || !apiSecret) {
        alert("LiveKit API Key or Secret is not configured. Please check your Vercel Environment Variables.");
        setIsLoading(false);
        return;
      }
      
      // Generate a simple random identity for the user
      const identity = `user-${Math.random().toString(36).substring(7)}`;

      // --- FIX: Generate token on the client-side for this workaround ---
      const at = new AccessToken(apiKey, apiSecret, { identity });
      at.addGrant({ 
        room: roomId, 
        roomJoin: true, 
        canPublish: true, 
        canSubscribe: true 
      });
      const generatedToken = await at.toJwt();
      setToken(generatedToken);
      
      setIsLoading(false);
    }
  };

  const handleLeave = () => {
    setToken(null); 
    setRoomId('');
  }

  // If we have a token, render the LiveKit room.
  if (token) {
    if (!serverUrl) {
      return (
        <div className="w-full max-w-md text-center mx-auto text-red-500">
          Error: LiveKit Server URL is not configured. Please check your Vercel Environment Variables.
        </div>
      );
    }

    return (
      <div className="w-full max-w-4xl h-[80vh] bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col" data-lk-theme="default">
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={handleLeave}
        >
          <AudioConference />
          <ControlBar controls={{ microphone: true, camera: false, screenShare: false, leave: true }} />
        </LiveKitRoom>
      </div>
    );
  }

  // Otherwise, render the join form.
  return (
    <div className="w-full max-w-md text-center mx-auto">
      <h1 className="text-5xl font-bold mb-4" style={{color: '#FFFFFF'}}>Anonymous</h1>
      <p className="text-gray-400 mb-8">Private, scalable conversations.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
            type="text" 
            value={roomId} 
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter a Room Name" 
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
            required
        />
        <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 disabled:bg-indigo-400">
          {isLoading ? 'Joining...' : 'Join Room'}
        </button>
      </form>
    </div>
  );
}
