import React, { useState, useEffect, useRef } from 'react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  useTracks,
  useLiveKitRoom,
  ControlBar,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

// --- Main App Component (Manages Pages and State) ---
export default function App() {
  const [page, setPage] = useState('landing');
  const [roomId, setRoomId] = useState('');
  const [voiceEffect, setVoiceEffect] = useState('none');
  
  const goToLobby = (id) => {
    setRoomId(id);
    setPage('lobby');
  };

  const goToChat = (effect) => {
    setVoiceEffect(effect);
    setPage('chat');
  };

  const leaveRoom = () => {
    setRoomId('');
    setVoiceEffect('none');
    setPage('landing');
  };

  const renderPage = () => {
    switch (page) {
      case 'landing':
        return <LandingPage onGoToLobby={goToLobby} />;
      case 'lobby':
        return <Lobby roomId={roomId} onGoToChat={goToChat} />;
      case 'chat':
        return <ChatRoom roomId={roomId} voiceEffect={voiceEffect} onLeave={leaveRoom} />;
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
      <p className="text-gray-400 mb-8">Private, scalable conversations with real-time voice anonymization.</p>
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
    const [voiceEffect, setVoiceEffect] = useState('none');
    const [isCheckingMic, setIsCheckingMic] = useState(false);
    
    // In the lobby, we just get mic permission and pass the effect choice.
    const handleJoinChat = async () => {
        setIsCheckingMic(true);
        setMicError('');
        try {
            // Test getting the microphone to trigger the permission prompt.
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // We can stop the track immediately. LiveKit will ask for it again in the room.
            stream.getTracks().forEach(track => track.stop());
            onGoToChat(voiceEffect);
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
          <p className="text-gray-400 mb-6">Choose a voice effect before joining the room.</p>
          
          <div className="bg-gray-900 p-6 rounded-lg mb-6">
            <h3 className="text-xl font-semibold mb-4">Select Voice Anonymizer</h3>
            <div className="grid grid-cols-3 gap-4">
                {['none', 'male', 'female'].map(effect => (
                     <button key={effect} onClick={() => setVoiceEffect(effect)} className={`capitalize py-3 px-4 rounded-lg transition duration-200 ${voiceEffect === effect ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                        {effect}
                    </button>
                ))}
            </div>
          </div>
          
          {micError && <p className="text-red-500 mb-4">{micError}</p>}
    
          <button onClick={handleJoinChat} disabled={isCheckingMic} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
            {isCheckingMic ? 'Checking Mic...' : 'Join Chat'}
          </button>
        </div>
      );
};


// --- Best Practice: Audio Processor Component ---
const AudioProcessor = ({ voiceEffect }) => {
  const { room } = useLiveKitRoom();

  useEffect(() => {
    if (!room || voiceEffect === 'none') return;

    let audioContext;
    let originalStream;
    let processedTrack;

    const setupAndPublish = async () => {
      try {
        originalStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const originalTrack = originalStream.getAudioTracks()[0];

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(new MediaStream([originalTrack]));
        const destination = audioContext.createMediaStreamDestination();
        
        const biquadFilter = audioContext.createBiquadFilter();
        biquadFilter.type = 'lowpass';
        biquadFilter.detune.value = voiceEffect === 'male' ? -600 : 700;
        
        source.connect(biquadFilter);
        biquadFilter.connect(destination);

        processedTrack = destination.stream.getAudioTracks()[0];
        
        await room.localParticipant.publishTrack(processedTrack, {
            name: 'microphone',
            source: Track.Source.Microphone,
        });
      } catch (error) {
        console.error("Failed to get mic or publish processed track:", error);
      }
    };

    setupAndPublish();

    return () => {
      if (processedTrack) {
        room.localParticipant.unpublishTrack(processedTrack);
      }
      if (originalStream) {
        originalStream.getTracks().forEach(track => track.stop());
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [room, voiceEffect]);

  return null;
};

// --- Chat Room Component ---
const ChatRoom = ({ roomId, onLeave, voiceEffect }) => {
  const [identity] = useState(`user-${Math.random().toString(36).substring(7)}`);
  const [token, setToken] = useState(null);
  const serverUrl = process.env.REACT_APP_LIVEKIT_URL;

  // Fetch the access token from our serverless function
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const resp = await fetch(`/api/getToken?roomName=${roomId}&identity=${identity}`);
        const data = await resp.json();
        if (data.token) {
          setToken(data.token);
        } else {
          console.error("Failed to get token:", data.error);
        }
      } catch (err) {
        console.error("Error fetching token:", err);
      }
    };
    if(roomId && identity) {
        fetchToken();
    }
  }, [roomId, identity]);

  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone], { onlySubscribed: false });

  // Show a loading state while fetching the token
  if (!token) {
    return (
        <div className="w-full max-w-lg text-center mx-auto bg-gray-800 p-8 rounded-2xl shadow-lg">
            <h3 className="text-xl font-semibold">Connecting to room...</h3>
        </div>
    );
  }

  return (
    <div className="w-full max-w-4xl h-[80vh] bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col" data-lk-theme="default">
        <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            // Let LiveKit handle audio only if no effect is selected.
            // Otherwise, our AudioProcessor component will handle it.
            audio={voiceEffect === 'none'} 
            video={false}
            onDisconnected={onLeave}
        >
            <h2 className="text-2xl font-bold mb-4">Room: <span className="text-indigo-400 font-mono text-xl">{roomId}</span></h2>
            <GridLayout tracks={tracks} style={{ height: 'calc(100% - 120px)' }}>
              <ParticipantTile />
            </GridLayout>
            <ControlBar controls={{ microphone: true, camera: false, screenShare: false, leave: true }} onLeave={onLeave}/>
            
            {/* Conditionally render our audio processor if an effect is chosen */}
            {voiceEffect !== 'none' && <AudioProcessor voiceEffect={voiceEffect} />}
        </LiveKitRoom>
    </div>
  );
};
