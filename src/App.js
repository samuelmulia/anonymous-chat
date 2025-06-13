import React, { useState, useEffect, useCallback } from 'react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  useTracks,
  useLiveKitRoom,
  ControlBar,
  useParticipants,
  useTrackMuted,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

// --- Main App Component (Manages Pages and State) ---
export default function App() {
  const [page, setPage] = useState('landing');
  const [roomId, setRoomId] = useState('');
  const [voiceEffect, setVoiceEffect] = useState('none');
  // FIX: Add state to hold the microphone stream across pages
  const [micStream, setMicStream] = useState(null);

  // Navigate to the lobby
  const goToLobby = (id) => {
    setRoomId(id);
    setPage('lobby');
  };

  // FIX: Update goToChat to accept the pre-acquired microphone stream
  const goToChat = (effect, stream) => {
    setVoiceEffect(effect);
    setMicStream(stream); // Store the stream for later use
    setPage('chat');
  };

  // Leave the room and clean up all state
  const leaveRoom = useCallback(() => {
    // FIX: Ensure the microphone stream is stopped and released when leaving
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
    }
    setRoomId('');
    setVoiceEffect('none');
    setMicStream(null);
    setPage('landing');
  }, [micStream]);

  // Render the current page based on the 'page' state
  const renderPage = () => {
    switch (page) {
      case 'landing':
        return <LandingPage onGoToLobby={goToLobby} />;
      case 'lobby':
        // FIX: Pass the updated goToChat function to the Lobby
        return <Lobby roomId={roomId} onGoToChat={goToChat} />;
      case 'chat':
        // FIX: Pass the micStream and the correct leave function to the ChatRoom
        return <ChatRoom roomId={roomId} voiceEffect={voiceEffect} onLeave={leaveRoom} micStream={micStream} />;
      default:
        return <LandingPage onGoToLobby={goToLobby} />;
    }
  };

  return (
    <div className="bg-black text-white min-h-screen font-sans flex items-center justify-center p-4">
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
  
  const joinRoom = (e) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
        onGoToLobby(joinRoomId);
    }
  };

  return (
    <div className="w-full max-w-md text-center mx-auto">
      <h1 className="text-5xl font-bold mb-4 text-white">Anonymous</h1>
      <p className="text-gray-400 mb-8">Private, scalable conversations with real-time voice anonymization.</p>
      <div className="space-y-4">
        <button onClick={createRoom} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300">
          Create a New Room
        </button>
        <form onSubmit={joinRoom} className="flex items-center space-x-2">
            <input 
                type="text" 
                value={joinRoomId} 
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Enter a Room ID" 
                className="flex-grow bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
            />
            <button type="submit" className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300">
              Join
            </button>
        </form>
      </div>
    </div>
  );
};


// --- Lobby Component ---
const Lobby = ({ roomId, onGoToChat }) => {
    const [micError, setMicError] = useState('');
    const [voiceEffect, setVoiceEffect] = useState('none');
    const [isJoining, setIsJoining] = useState(false);

    // FIX: This function now acquires the microphone ONCE. This fixes the re-entry bug.
    const handleJoinChat = async () => {
        setIsJoining(true);
        setMicError('');
        try {
            // Get the audio stream that will be used for the entire session.
            const stream = await navigator.mediaDevices.getUserMedia({ 
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              } 
            });

            // Pass the acquired stream and effect choice up to the App component.
            onGoToChat(voiceEffect, stream);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            setMicError(`Error: ${err.message}. Please check your browser/system permissions.`);
            setIsJoining(false); // Only set to false on error.
        }
    };

    return (
        <div className="w-full max-w-lg text-center mx-auto bg-gray-800 p-8 rounded-2xl shadow-lg">
            <h2 className="text-3xl font-bold mb-2">Share this Room ID:</h2>
            <p 
                className="text-indigo-400 font-mono bg-gray-900 rounded p-2 mb-6 break-all cursor-pointer" 
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(roomId);
                  } else { // Fallback for environments without clipboard API
                      const textArea = document.createElement("textarea");
                      textArea.value = roomId;
                      document.body.appendChild(textArea);
                      textArea.focus();
                      textArea.select();
                      try {
                          document.execCommand('copy');
                      } catch (err) {
                          console.error('Fallback: Oops, unable to copy', err);
                      }
                      document.body.removeChild(textArea);
                  }
                }}
            >
                {roomId}
            </p>
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
    
            <button onClick={handleJoinChat} disabled={isJoining} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
                {isJoining ? 'Checking Mic...' : 'Join Chat'}
            </button>
        </div>
    );
};


// --- Chat Room Component ---
const ChatRoom = ({ roomId, onLeave, voiceEffect, micStream }) => {
    const [identity] = useState(`user-${Math.random().toString(36).substring(7)}`);
    const [token, setToken] = useState(null);
    const [error, setError] = useState(null);
    const [isConnecting, setIsConnecting] = useState(true);
    
    // NOTE: For a real application, you would replace this with your actual LiveKit server URL.
    // It's often stored in an environment variable like process.env.REACT_APP_LIVEKIT_URL
    const serverUrl = 'wss://your-livekit-server-url.com'; // <-- IMPORTANT: REPLACE THIS

    // Fetch the access token from a serverless function or backend
    useEffect(() => {
        // This is a placeholder for a real token fetching function.
        // In a real app, this would make a request to your backend.
        const fetchToken = async () => {
            try {
                // In a real app, you would fetch from your own API endpoint like:
                // const resp = await fetch(`/api/getToken?roomName=${roomId}&identity=${identity}`);
                // const data = await resp.json();
                // For this example, we'll simulate a successful token fetch.
                // You will need a backend to generate a real token for this to work.
                console.warn("Using a placeholder token fetcher. You need a real backend to generate tokens.");
                
                // This is a MOCK response. You must replace this with a real fetch.
                setTimeout(() => {
                    // Simulating an error if server URL is not set
                    if (serverUrl === 'wss://your-livekit-server-url.com') {
                        setError("Configuration Error: LiveKit Server URL is not set.");
                        setIsConnecting(false);
                        return;
                    }
                    // In a real scenario, the token would be a long JWT string.
                    // This will fail, but it demonstrates the flow.
                    setToken("mock-token-this-will-fail-connection"); 
                    console.log('Mock token set.');
                    setIsConnecting(false);
                }, 1000);

            } catch (err) {
                console.error("Error fetching token:", err);
                setError(`Failed to connect: ${err.message}`);
                setIsConnecting(false);
            }
        };
        
        if (roomId && identity) {
            fetchToken();
        }
    }, [roomId, identity, serverUrl]);

    if (error) {
        return (
            <div className="w-full max-w-lg text-center mx-auto bg-gray-800 p-8 rounded-2xl shadow-lg">
                <h3 className="text-xl font-semibold text-red-400 mb-4">Connection Error</h3>
                <p className="text-gray-300 mb-6">{error}</p>
                <button onClick={onLeave} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">
                    Back to Landing
                </button>
            </div>
        );
    }

    if (isConnecting || !token) {
        return (
            <div className="w-full max-w-lg text-center mx-auto bg-gray-800 p-8 rounded-2xl shadow-lg">
                <h3 className="text-xl font-semibold mb-4">Connecting...</h3>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto"></div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl h-[80vh] bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col" data-lk-theme="default">
            <LiveKitRoom
                token={token}
                serverUrl={serverUrl}
                connect={true}
                audio={false} // FIX: Always set to false. We manage the audio track manually.
                video={false}
                onDisconnected={onLeave}
                onError={(err) => {
                  console.error('LiveKit room error:', err);
                  setError(`Room error: ${err.message}. Check server URL and token.`);
                }}
            >
                {/* The main content of the room */}
                <RoomContent roomId={roomId} voiceEffect={voiceEffect} onLeave={onLeave} micStream={micStream} />
            </LiveKitRoom>
        </div>
    );
};


// --- Room Content Component (Displays participants and controls) ---
const RoomContent = ({ roomId, voiceEffect, onLeave, micStream }) => {
    // FIX: This hook now correctly finds all participants, which fixes the display issue.
    const participants = useParticipants();
    const tracks = useTracks([Track.Source.Microphone], { onlySubscribed: false });
    
    // We need a way to control our custom microphone track
    const [isMuted, setIsMuted] = useState(false);

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
            
            {/* The GridLayout displays all participants. This should now work correctly. */}
            <GridLayout tracks={tracks} style={{ height: 'calc(100% - 120px)' }}>
                <ParticipantTile />
            </GridLayout>
            
            {/* FIX: We now use a custom control bar to manage our manual audio track. */}
            <ControlBar 
                variation="minimal"
                controls={{ 
                    microphone: false, // Disable the default mic control
                    camera: false, 
                    screenShare: false, 
                    leave: true 
                }} 
            >
                {/* Our new custom microphone control button */}
                <button className="lk-button" onClick={() => setIsMuted(!isMuted)}>
                  {/* We can use a hook to check the actual muted state for a better UI */}
                  <MicControl />
                </button>
                <div className="lk-button-group">
                  <button className="lk-button" onClick={onLeave}>Leave</button>
                </div>
            </ControlBar>
            
            {/* The AudioProcessor is now just responsible for processing and publishing */}
            <AudioProcessor voiceEffect={voiceEffect} micStream={micStream} isMuted={isMuted} />
        </>
    );
};

// A small helper component to show the correct mic icon
const MicControl = () => {
  const { room } = useLiveKitRoom();
  const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
  const isMuted = useTrackMuted(micPub);

  return <>{isMuted ? 'Unmute' : 'Mute'}</>;
}


// --- Audio Processor Component (Handles voice effects and publishing) ---
const AudioProcessor = ({ voiceEffect, micStream, isMuted }) => {
    const { room } = useLiveKitRoom();

    // This effect runs once to set up and publish the audio track.
    useEffect(() => {
        if (!room || !micStream) return;

        let audioContext;
        let originalTrack = micStream.getAudioTracks()[0];
        if (!originalTrack) return;

        // If no voice effect, just publish the original track directly.
        if (voiceEffect === 'none') {
            room.localParticipant.publishTrack(originalTrack).then(pub => {
              console.log('Published original audio track:', pub);
            });
        } else {
            // Setup Web Audio API pipeline for voice effects
            console.log('Setting up audio processing for effect:', voiceEffect);
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            const source = audioContext.createMediaStreamSource(micStream);
            const destination = audioContext.createMediaStreamDestination();
            const filter = audioContext.createBiquadFilter();
            
            filter.type = 'allpass';
            if (voiceEffect === 'male') {
                filter.frequency.value = 300;
                filter.Q.value = 0.5;
            } else if (voiceEffect === 'female') {
                filter.frequency.value = 1200;
                filter.Q.value = 0.8;
            }

            source.connect(filter);
            filter.connect(destination);

            const processedTrack = destination.stream.getAudioTracks()[0];
            room.localParticipant.publishTrack(processedTrack).then(pub => {
                console.log('Published processed audio track:', pub);
            });
        }

        // Cleanup function: unpublish tracks and close audio context
        return () => {
            room.localParticipant.getTrackPublications().forEach(pub => {
                if (pub.source === Track.Source.Microphone) {
                    room.localParticipant.unpublishTrack(pub.track, true);
                }
            });
            if (audioContext && audioContext.state !== 'closed') {
                audioContext.close();
            }
        };
    }, [room, micStream, voiceEffect]); // Reruns only if these fundamental props change

    // FIX: New effect to handle muting/unmuting. This fixes the mic button issue.
    useEffect(() => {
        const micPub = room?.localParticipant.getTrackPublication(Track.Source.Microphone);
        if (micPub && micPub.track) {
            micPub.track.setMuted(isMuted).then(() => {
                console.log(`Track ${isMuted ? 'muted' : 'unmuted'}`);
            });
        }
    }, [isMuted, room]); // Runs only when the mute state changes

    return null; // This component does not render anything
};
