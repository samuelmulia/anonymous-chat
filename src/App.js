import React, { useState, useEffect, useRef } from 'react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  useToken,
  useTracks,
  ControlBar, // Import ControlBar for mute/unmute
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

// --- Main App Component ---
const App = () => {
  const [page, setPage] = useState('landing');
  const [roomId, setRoomId] = useState('');
  
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
        return <ChatRoom roomId={roomId} onLeave={leaveRoom} />;
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
      <p className="text-gray-400 mb-8">Private, scalable conversations.</p>
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
    const [micError, setMicError] = useState('');
    const [isCheckingMic, setIsCheckingMic] = useState(false);
    
    // In the lobby, we just get mic permission. No streams are passed.
    const handleJoinChat = async () => {
        setIsCheckingMic(true);
        setMicError('');
        try {
            // Test getting the microphone to trigger the permission prompt
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // We got permission, so we can stop the track immediately.
            // LiveKit will ask for it again in the room.
            stream.getTracks().forEach(track => track.stop());
            onGoToChat();
        } catch (err) {
             console.error("Error accessing microphone:", err);
             setMicError(`Error: ${err.message}. Please check your browser/system permissions.`);
             setIsCheckingMic(false);
        }
    };
  
    return (
        <div className="w-full max-w-lg text-center mx-auto bg-gray-800 p-8 rounded-2xl shadow-lg">
          <h2 className="text-3xl font-bold mb-2">Share this Room ID:</h2>
          <p className="text-indigo-400 font-mono bg-gray-900 rounded p-2 mb-6 break-all cursor-pointer" onClick={() => navigator.clipboard.writeText(roomId)}>{roomId}</p>
          <p className="text-gray-400 mb-6">You will join the room and enable your microphone.</p>
                    
          {micError && <p className="text-red-500 mb-4">{micError}</p>}
    
          <button onClick={handleJoinChat} disabled={isCheckingMic} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
            {isCheckingMic ? 'Checking Mic...' : 'Join Chat'}
          </button>
        </div>
      );
};


// --- Chat Room Component ---
const ChatRoom = ({ roomId, onLeave }) => {
  const [identity] = useState(`user-${Math.random().toString(36).substring(7)}`);
  const token = useToken('/api/getToken', roomId, { userInfo: { identity }});
  const serverUrl = process.env.REACT_APP_LIVEKIT_URL;
  
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone], { onlySubscribed: false });

  if (!serverUrl) {
    return <div className="text-red-500 text-center">Error: LiveKit Server URL is not configured. Please set REACT_APP_LIVEKIT_URL.</div>
  }

  return (
    <div className="w-full max-w-4xl h-[80vh] bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col" data-lk-theme="default">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Room: <span className="text-indigo-400 font-mono text-xl">{roomId}</span></h2>
        </div>
        
        <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            // --- FIX: Let LiveKit handle the audio directly. This is the most stable method. ---
            audio={true}
            video={false}
            onDisconnected={onLeave}
        >
            {/* The GridLayout component arranges your participants in a grid */}
            <GridLayout tracks={tracks} style={{ height: 'calc(100% - 60px)' }}>
              <ParticipantTile />
            </GridLayout>
            
            {/* ControlBar gives us leave, mute, etc. */}
            <ControlBar controls={{
                microphone: true,
                camera: false,
                chat: false,
                screenShare: false,
                leave: true
            }} onLeave={onLeave} />
        </LiveKitRoom>
    </div>
  );
};

export default App;
