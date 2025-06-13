import React, { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  AudioConference,
  ControlBar,
  useToken,
} from '@livekit/components-react';
import '@livekit/components-styles';

// --- Main App Component ---
const App = () => {
  const [page, setPage] = useState('landing');
  const [roomId, setRoomId] = useState('');
  const [identity, setIdentity] = useState('');

  // Generate a random user identity
  useEffect(() => {
    setIdentity(`user-${Date.now()}`);
  }, []);

  const goToLobby = (id) => {
    setRoomId(id);
    setPage('lobby');
  };

  const goToChat = () => {
    setPage('chat');
  };

  const leaveRoom = () => {
    setRoomId('');
    setPage('landing');
  };

  const renderPage = () => {
    switch (page) {
      case 'landing':
        return <LandingPage onGoToLobby={goToLobby} />;
      case 'lobby':
        return <Lobby roomId={roomId} onGoToChat={goToChat} />;
      case 'chat':
        return <ChatRoom roomId={roomId} identity={identity} onLeave={leaveRoom} />;
      default:
        return <LandingPage onGoToLobby={goToLobby} />;
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans flex items-center justify-center p-4" style={{backgroundColor: '#000000'}}>
        <div className="w-full max-w-4xl">
            {renderPage()}
        </div>
    </div>
  );
};

// --- Landing Page Component ---
const LandingPage = ({ onGoToLobby }) => {
  const [joinRoomId, setJoinRoomId] = useState('');

  // Create a random room ID
  const createRoom = () => {
    const newRoomId = `room-${Math.random().toString(36).substring(7)}`;
    onGoToLobby(newRoomId);
  };
  
  const joinRoom = () => {
      if(joinRoomId.trim()){
          onGoToLobby(joinRoomId);
      }
  }

  return (
    <div className="w-full max-w-md text-center mx-auto">
      <h1 className="text-5xl font-bold mb-4" style={{color: '#FFFFFF'}}>Anonymous</h1>
      <p className="text-gray-400 mb-8">Private, scalable conversations powered by LiveKit.</p>
      <div className="space-y-4">
        <button onClick={createRoom} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300">
          Create a New Room
        </button>
        <div className="flex items-center space-x-2">
            <input 
                type="text" 
                value={joinRoomId} 
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Enter a Room ID" 
                className="flex-grow bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
            />
            <button onClick={joinRoom} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300">
              Join
            </button>
        </div>
      </div>
    </div>
  );
};

// --- Lobby Component ---
const Lobby = ({ roomId, onGoToChat }) => {
    return (
        <div className="w-full max-w-lg text-center mx-auto bg-gray-800 p-8 rounded-2xl shadow-lg">
          <h2 className="text-3xl font-bold mb-2">Share this Room ID:</h2>
          <p className="text-indigo-400 font-mono bg-gray-900 rounded p-2 mb-6 break-all cursor-pointer" onClick={() => navigator.clipboard.writeText(roomId)}>{roomId}</p>
          <p className="text-gray-400 mb-6">Others can use this ID to join your private room.</p>
              
          <button onClick={onGoToChat} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300">
            Join Chat
          </button>
        </div>
      );
};


// --- Chat Room Component ---
const ChatRoom = ({ roomId, identity, onLeave }) => {
  // Use the useToken hook to fetch the token from your server
  const token = useToken('/api/getToken', roomId, { userInfo: { identity }});

  // Get the LiveKit Server URL from your Vercel Environment Variables
  const serverUrl = process.env.REACT_APP_LIVEKIT_URL;

  if (!serverUrl) {
    return <div className="text-red-500">Error: LiveKit Server URL is not configured. Please set REACT_APP_LIVEKIT_URL.</div>
  }

  return (
    <div className="w-full max-w-4xl h-[80vh] bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col" data-lk-theme="default">
        <h2 className="text-2xl font-bold mb-4">Room: <span className="text-indigo-400 font-mono text-xl">{roomId}</span></h2>
        
        {/* The main LiveKitRoom component connects to the room */}
        <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            // Options for the room
            audio={true}
            video={false}
            onDisconnected={onLeave}
        >
            {/* AudioConference renders all participant tiles */}
            {/* The "talking indicator" is built-in! */}
            <AudioConference />

            {/* ControlBar provides mute/unmute, etc. */}
            <ControlBar />
        </LiveKitRoom>
    </div>
  );
};

export default App;
