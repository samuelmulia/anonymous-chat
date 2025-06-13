import React, { useState } from 'react';
import {
  LiveKitRoom,
  AudioConference,
  useToken,
  ControlBar
} from '@livekit/components-react';
import '@livekit/components-styles';

// --- Main App Component ---
export default function App() {
  const [roomId, setRoomId] = useState('');
  const [identity] = useState(`user-${Math.random().toString(36).substring(7)}`);
  const [isInRoom, setIsInRoom] = useState(false);

  // The useToken hook safely fetches a token from our Vercel Serverless Function
  // It will only run when roomId is not an empty string.
  const token = useToken('/api/getToken', roomId, { userInfo: { identity }});
  
  // Get the LiveKit Server URL from Vercel Environment Variables
  const serverUrl = process.env.REACT_APP_LIVEKIT_URL;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      setIsInRoom(true);
    }
  };

  const handleLeave = () => {
    setIsInRoom(false);
    setRoomId('');
  }

  // If we are in the room, render the LiveKit components
  if (isInRoom) {
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
          audio={true} // Let LiveKit handle the microphone directly. This is the most stable method.
          video={false}
          onDisconnected={handleLeave} // Use our handleLeave function for the ControlBar
        >
          {/* AudioConference handles the grid layout and participant tiles automatically. */}
          {/* The talking indicator is built-in. */}
          <AudioConference />
          
          {/* ControlBar provides mute, leave, etc. */}
          <ControlBar controls={{ microphone: true, camera: false, screenShare: false, leave: true }} />
        </LiveKitRoom>
      </div>
    );
  }

  // Otherwise, render the landing/join page
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
