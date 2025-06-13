import React, { useState, useEffect } from 'react';
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
}

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
  };

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
    
    const handleJoinChat = async () => {
        setIsCheckingMic(true);
        setMicError('');
        try {
            // Test getting the microphone to trigger the permission prompt.
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the tracks immediately - LiveKit will handle audio from here
            stream.getTracks().forEach(track => track.stop());
            
            // Small delay to ensure cleanup before proceeding
            setTimeout(() => {
                onGoToChat(voiceEffect);
            }, 100);
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

// --- FIXED Audio Processor Component ---
const AudioProcessor = ({ voiceEffect }) => {
  const { room } = useLiveKitRoom();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!room || voiceEffect === 'none' || isProcessing) return;

    let audioContext;
    let originalStream;
    let processedTrack;
    let source;
    let filter;
    let destination;

    const setupAndPublish = async () => {
      try {
        setIsProcessing(true);
        console.log('Setting up audio processing for effect:', voiceEffect);

        // Wait a bit to ensure LiveKit is ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get fresh microphone stream
        originalStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        const originalTrack = originalStream.getAudioTracks()[0];
        if (!originalTrack) {
          throw new Error('No audio track found');
        }

        // Create audio processing pipeline with better error handling
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Resume context if suspended (required in some browsers)
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        source = audioContext.createMediaStreamSource(new MediaStream([originalTrack]));
        destination = audioContext.createMediaStreamDestination();
        
        // Create and configure the filter
        filter = audioContext.createBiquadFilter();
        filter.type = 'allpass'; // Changed from 'lowpass' to 'allpass' for better voice quality
        
        // Better frequency manipulation for voice effects
        if (voiceEffect === 'male') {
          filter.frequency.value = 300;
          filter.Q.value = 0.5;
        } else if (voiceEffect === 'female') {
          filter.frequency.value = 1200;
          filter.Q.value = 0.8;
        }
        
        // Connect the audio nodes
        source.connect(filter);
        filter.connect(destination);

        processedTrack = destination.stream.getAudioTracks()[0];
        
        if (!processedTrack) {
          throw new Error('Failed to create processed audio track');
        }

        // Publish the processed track to LiveKit
        await room.localParticipant.publishTrack(processedTrack, {
            name: 'microphone',
            source: Track.Source.Microphone,
        });

        console.log('Audio processing setup complete');
        
      } catch (error) {
        console.error("Failed to setup audio processing:", error);
        setIsProcessing(false);
        
        // Fallback: let LiveKit handle audio normally
        try {
          if (originalStream) {
            originalStream.getTracks().forEach(track => track.stop());
          }
        } catch (cleanupError) {
          console.error("Error during cleanup:", cleanupError);
        }
      }
    };

    setupAndPublish();

    // Cleanup function
    return () => {
      console.log('Cleaning up audio processor');
      try {
        if (processedTrack && room?.localParticipant) {
          room.localParticipant.unpublishTrack(processedTrack);
        }
        if (originalStream) {
          originalStream.getTracks().forEach(track => track.stop());
        }
        if (source) {
          source.disconnect();
        }
        if (filter) {
          filter.disconnect();
        }
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close();
        }
      } catch (error) {
        console.error("Error during audio processor cleanup:", error);
      } finally {
        setIsProcessing(false);
      }
    };
  }, [room, voiceEffect, isProcessing]);

  return null;
};

// --- FIXED Chat Room Component ---
const ChatRoom = ({ roomId, onLeave, voiceEffect }) => {
  const [identity] = useState(`user-${Math.random().toString(36).substring(7)}`);
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  
  const serverUrl = process.env.REACT_APP_LIVEKIT_URL;

  // Fetch the access token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        setIsConnecting(true);
        setError(null);
        
        console.log('Fetching token for room:', roomId, 'identity:', identity);
        
        const resp = await fetch(`/api/getToken?roomName=${roomId}&identity=${identity}`);
        
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }
        
        const data = await resp.json();
        
        if (data.token) {
          setToken(data.token);
          console.log('Token received successfully');
        } else {
          throw new Error(data.error || 'No token received');
        }
      } catch (err) {
        console.error("Error fetching token:", err);
        setError(`Failed to connect: ${err.message}`);
      } finally {
        setIsConnecting(false);
      }
    };
    
    if (roomId && identity) {
      fetchToken();
    }
  }, [roomId, identity]);

  // Show error state
  if (error) {
    return (
      <div className="w-full max-w-lg text-center mx-auto bg-gray-800 p-8 rounded-2xl shadow-lg">
        <h3 className="text-xl font-semibold text-red-400 mb-4">Connection Error</h3>
        <p className="text-gray-300 mb-6">{error}</p>
        <button 
          onClick={onLeave}
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  // Show loading state while fetching token
  if (isConnecting || !token) {
    return (
      <div className="w-full max-w-lg text-center mx-auto bg-gray-800 p-8 rounded-2xl shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Connecting to room...</h3>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto"></div>
      </div>
    );
  }

  // Validate serverUrl
  if (!serverUrl) {
    return (
      <div className="w-full max-w-lg text-center mx-auto bg-gray-800 p-8 rounded-2xl shadow-lg">
        <h3 className="text-xl font-semibold text-red-400 mb-4">Configuration Error</h3>
        <p className="text-gray-300 mb-6">LiveKit server URL is not configured. Please set REACT_APP_LIVEKIT_URL environment variable.</p>
        <button 
          onClick={onLeave}
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl h-[80vh] bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col" data-lk-theme="default">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        audio={voiceEffect === 'none'} // Only let LiveKit handle audio if no effect
        video={false}
        onDisconnected={() => {
          console.log('Disconnected from room');
          onLeave();
        }}
        onError={(error) => {
          console.error('LiveKit room error:', error);
          setError(`Room error: ${error.message}`);
        }}
      >
        <RoomContent roomId={roomId} voiceEffect={voiceEffect} onLeave={onLeave} />
      </LiveKitRoom>
    </div>
  );
};

// --- Separate Room Content Component ---
const RoomContent = ({ roomId, voiceEffect, onLeave }) => {
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone], { onlySubscribed: false });

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">
          Room: <span className="text-indigo-400 font-mono text-xl">{roomId}</span>
        </h2>
        {voiceEffect !== 'none' && (
          <span className="bg-indigo-900 text-indigo-200 px-3 py-1 rounded-full text-sm">
            Voice: {voiceEffect}
          </span>
        )}
      </div>
      
      <GridLayout tracks={tracks} style={{ height: 'calc(100% - 120px)' }}>
        <ParticipantTile />
      </GridLayout>
      
      <ControlBar 
        controls={{ 
          microphone: true, 
          camera: false, 
          screenShare: false, 
          leave: true 
        }} 
        onLeave={onLeave}
      />
      
      {/* Only render AudioProcessor if voice effect is selected */}
      {voiceEffect !== 'none' && <AudioProcessor voiceEffect={voiceEffect} />}
    </>
  );
};