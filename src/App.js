import React, { useState } from 'react';
import {
  LiveKitRoom,
  AudioConference,
  ControlBar
} from '@livekit/components-react';
import '@livekit/components-styles';

// --- Main App Component ---
export default function App() {
  const [roomId, setRoomId] = useState('');
  const [token, setToken] = useState(null); // NEW: Token is now in component state

  // Get the LiveKit Server URL from Vercel Environment Variables
  const serverUrl = process.env.REACT_APP_LIVEKIT_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      // Generate a simple random identity for the user
      const identity = `user-${Math.random().toString(36).substring(7)}`;

      try {
        // 1. Fetch the token MANUALLY from our serverless function
        const resp = await fetch(`/api/getToken?roomName=${roomId}&identity=${identity}`);
        const data = await resp.json();
        
        if (data.token) {
          // 2. Store the token in state, which will trigger the render of LiveKitRoom
          setToken(data.token);
        } else {
          console.error("Failed to get a token:", data.error);
          alert("Could not get access token. Please check server logs.");
        }
      } catch (err) {
        console.error("Error fetching token:", err);
        alert("There was an error fetching the access token.");
      }
    }
  };

  const handleLeave = () => {
    // Clear the token to exit the room and return to the join form
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
          audio={true} // Now that we have a token, LiveKit can safely ask for the mic
          video={false}
          onDisconnected={handleLeave}
        >
          {/* AudioConference handles the grid layout, participant tiles, and talking indicators. */}
          <AudioConference />
          
          {/* ControlBar provides mute, leave, etc. */}
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
        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300">
          Join Room
        </button>
      </form>
    </div>
  );
}
