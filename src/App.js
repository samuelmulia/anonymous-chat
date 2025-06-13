import React, { useState, useEffect, useRef } from 'react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  useToken,
  useTracks,
  useLiveKitRoom,
  ControlBar,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

// --- Main App Component ---
const App = () => {
  const [page, setPage] = useState('landing');
  const [roomId, setRoomId] = useState('');
  const [voiceEffect, setVoiceEffect] = useState('none');
  const originalStreamRef = useRef(null);

  const goToLobby = (id) => {
    setRoomId(id);
    setPage('lobby');
  };

  const goToChat = (stream, effect) => {
    originalStreamRef.current = stream;
    setVoiceEffect(effect);
    setPage('chat');
  };

  const leaveRoom = () => {
    if (originalStreamRef.current) {
        originalStreamRef.current.getTracks().forEach(track => track.stop());
        originalStreamRef.current = null;
    }
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
        return <ChatRoom roomId={roomId} onLeave={leaveRoom} originalStream={originalStreamRef.current} voiceEffect={voiceEffect} />;
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
    const [isJoining, setIsJoining] = useState(false);
    
    // In the lobby, we just get the original stream and pass it along with the effect choice.
    const handleJoinChat = async () => {
        setIsJoining(true);
        setMicError('');
        try {
            const originalStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            onGoToChat(originalStream, voiceEffect);
        } catch (err) {
             console.error("Error accessing microphone:", err);
             setMicError(`Error: ${err.message}. Please check your browser/system permissions.`);
             setIsJoining(false);
        }
    };
  
    return (
        <div className="w-full max-w-lg text-center mx-auto bg-gray-800 p-8 rounded-2xl shadow-lg">
          <h2 className="text-3xl font-bold mb-2">Share this Room ID:</h2>
          <p className="text-indigo-400 font-mono bg-gray-900 rounded p-2 mb-6 break-all cursor-pointer" onClick={() => navigator.clipboard.writeText(roomId)}>{roomId}</p>
          <p className="text-gray-400 mb-6">Others can use this ID to join your private room.</p>
          
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
    
          <button onClick={handleJoinChat} disabled={isJoining} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
            {isJoining ? 'Joining...' : 'Join Chat'}
          </button>
        </div>
      );
};

// --- NEW Best Practice Component: Audio Processor & Publisher ---
// This component safely handles all audio processing and publishing inside the LiveKitRoom context.
const AudioProcessor = ({ originalStream, voiceEffect }) => {
  const { room } = useLiveKitRoom();

  useEffect(() => {
    // Only run if we have a room connection and a stream to process
    if (!room || !originalStream) return;

    let processedTrack = null;
    let audioContext = null;
    
    const setupAndPublish = async () => {
      // Get the original audio track
      const originalTrack = originalStream.getAudioTracks()[0];

      if (voiceEffect === 'none') {
        // If no effect, we will just publish the original track
        processedTrack = originalTrack;
      } else {
        // If there's an effect, create the audio processing pipeline
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(new MediaStream([originalTrack]));
        const destination = audioContext.createMediaStreamDestination();
        
        // Create the pitch-shifting filter
        const biquadFilter = audioContext.createBiquadFilter();
        biquadFilter.type = 'lowpass'; // Using detune on a lowpass filter is a good hack for pitch shifting
        biquadFilter.detune.value = voiceEffect === 'male' ? -600 : 700; // Cents. Negative for lower pitch, positive for higher.
        
        // Connect the nodes: microphone -> filter -> destination
        source.connect(biquadFilter);
        biquadFilter.connect(destination);

        // The processed track is now in the destination
        processedTrack = destination.stream.getAudioTracks()[0];
      }

      try {
        // Publish the final track (either original or processed) to the room.
        await room.localParticipant.publishTrack(processedTrack, {
            name: 'microphone', // Important for LiveKit to identify it
            source: Track.Source.Microphone
        });
      } catch (error) {
        console.error("Failed to publish audio track:", error);
      }
    };

    setupAndPublish();

    // Cleanup function: This runs when the component unmounts (e.g., when you leave the room)
    return () => {
      if (processedTrack) {
        room.localParticipant.unpublishTrack(processedTrack);
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [room, originalStream, voiceEffect]);

  return null; // This component doesn't render anything visible
};


// --- Chat Room Component ---
const ChatRoom = ({ roomId, onLeave, originalStream, voiceEffect }) => {
  const [identity] = useState(`user-${Math.random().toString(36).substring(7)}`);
  const token = useToken('/api/getToken', roomId, { userInfo: { identity }});
  const serverUrl = process.env.REACT_APP_LIVEKIT_URL;
  
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone], { onlySubscribed: false });

  if (!originalStream) {
    return (
        <div className="w-full max-w-lg text-center mx-auto bg-gray-800 p-8 rounded-2xl shadow-lg">
            <h3 className="text-2xl font-bold mb-4 text-red-500">Microphone Not Ready</h3>
            <p className="text-gray-400">Could not get your microphone stream. Please go back and try rejoining the room.</p>
            <button onClick={onLeave} className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">
              Back to Lobby
            </button>
        </div>
    );
  }

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
            audio={false} // We are handling audio manually with our AudioProcessor
            video={false}
            onDisconnected={onLeave}
        >
            <GridLayout tracks={tracks} style={{ height: 'calc(100% - 60px)' }}>
              <ParticipantTile />
            </GridLayout>
            
            <ControlBar controls={{ microphone: true, camera: false, chat: false, screenShare: false, leave: true }} onLeave={onLeave} />
            
            {/* Use the new processor to handle audio publishing */}
            <AudioProcessor originalStream={originalStream} voiceEffect={voiceEffect} />
        </LiveKitRoom>
    </div>
  );
};

export default App;
