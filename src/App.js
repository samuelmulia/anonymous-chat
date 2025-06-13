import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, onSnapshot, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_APIKEY,
  authDomain: process.env.REACT_APP_AUTHDOMAIN,
  projectId: process.env.REACT_APP_PROJECTID,
  storageBucket: process.env.REACT_APP_STORAGEBUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGINGSENDERID,
  appId: process.env.REACT_APP_APPID
};

// --- Initialize Firebase ---
let db;
try {
  if (firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

// --- STUN servers for WebRTC ---
const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// --- Main App Component ---
const App = () => {
  const [page, setPage] = useState('landing');
  const [roomId, setRoomId] = useState('');
  const [voiceEffect, setVoiceEffect] = useState('none');
  const [error, setError] = useState('');
  const localStreamRef = useRef(null); 

  useEffect(() => {
    if (!process.env.REACT_APP_APIKEY) {
      setError('Firebase is not configured. The app may not work online.');
    }
  }, []);

  const goToLobby = (id) => {
    setRoomId(id);
    setPage('lobby');
  };

  const goToChat = (stream) => {
    localStreamRef.current = stream;
    setPage('chat');
  };

  const leaveRoom = () => {
    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
    }
    setRoomId('');
    setPage('landing');
  };

  const renderPage = () => {
    switch (page) {
      case 'landing':
        return <LandingPage onGoToLobby={goToLobby} />;
      case 'lobby':
        return <Lobby roomId={roomId} onGoToChat={goToChat} voiceEffect={voiceEffect} setVoiceEffect={setVoiceEffect} />;
      case 'chat':
        return <ChatRoom roomId={roomId} voiceEffect={voiceEffect} onLeave={leaveRoom} localStream={localStreamRef.current} />;
      default:
        return <LandingPage onGoToLobby={goToLobby} />;
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans flex items-center justify-center p-4" style={{backgroundColor: '#000000'}}>
        <div className="w-full max-w-4xl">
            {error && <div className="bg-yellow-500 text-black p-3 rounded-lg text-center mb-4 font-semibold">{error}</div>}
            {renderPage()}
        </div>
    </div>
  );
};

// --- Landing Page Component ---
const LandingPage = ({ onGoToLobby }) => {
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createRoom = async () => {
    if (!db) {
      alert("Cannot create room: Firebase is not configured correctly. Please check your environment variables.");
      return;
    }
    setIsCreating(true);
    try {
        const roomRef = collection(db, 'rooms');
        const newRoomRef = await addDoc(roomRef, { createdAt: new Date() }); 
        onGoToLobby(newRoomRef.id);
    } catch (error) {
        console.error("Error creating room: ", error);
        alert("Could not create a room. Please ensure your Firebase security rules are set to test mode.");
        setIsCreating(false);
    }
  };
  
  const joinRoom = () => {
      if(joinRoomId.trim()){
          onGoToLobby(joinRoomId);
      }
  }

  return (
    <div className="w-full max-w-md text-center mx-auto">
      <h1 className="text-5xl font-bold mb-4" style={{color: '#FFFFFF'}}>Anonymous</h1>
      <p className="text-gray-400 mb-8">Private, peer-to-peer conversations with real-time voice anonymization.</p>
      <div className="space-y-4">
        <button onClick={createRoom} disabled={isCreating} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed">
          {isCreating ? 'Creating...' : 'Create a New Room'}
        </button>
        <div className="flex items-center space-x-2">
            <input 
                type="text" 
                value={joinRoomId} 
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Enter a Room ID" 
                className="flex-grow bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
const Lobby = ({ roomId, onGoToChat, voiceEffect, setVoiceEffect }) => {
    const [micLevel, setMicLevel] = useState(0);
    const [isMicAccessGranted, setIsMicAccessGranted] = useState(false);
    const [micError, setMicError] = useState('');
    const localStreamRef = useRef(null);
    const animationFrameId = useRef(null);
    
    const handleJoinChat = async () => {
        if (!isMicAccessGranted) {
             setMicError('Please grant microphone access first.');
             return;
        }
        if (localStreamRef.current) {
            onGoToChat(localStreamRef.current);
        } else {
            setMicError('Could not access microphone. Please check browser permissions.');
        }
    };

    const getMicAccess = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            setIsMicAccessGranted(true);
            setMicError('');
            
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const source = context.createMediaStreamSource(stream);
            const analyser = context.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            const draw = () => {
                animationFrameId.current = requestAnimationFrame(draw);
                analyser.getByteFrequencyData(dataArray);
                let sum = dataArray.reduce((a, b) => a + b, 0);
                let avg = sum / dataArray.length;
                setMicLevel(Math.min(100, (avg / 128) * 100));
            };
            draw();
        } catch (err) {
             console.error("Error accessing microphone:", err);
             setMicError(`Error: ${err.message}. Please check your browser/system permissions.`);
             setIsMicAccessGranted(false);
        }
    };

    useEffect(() => {
      return () => {
          if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      }
    }, []);
  
    return (
        <div className="w-full max-w-lg text-center mx-auto bg-gray-800 p-8 rounded-2xl shadow-lg">
          <h2 className="text-3xl font-bold mb-2">Share this Room ID:</h2>
          <p className="text-indigo-400 font-mono bg-gray-900 rounded p-2 mb-6 break-all cursor-pointer" onClick={() => navigator.clipboard.writeText(roomId)}>{roomId}</p>
          <p className="text-gray-400 mb-6">Others can use this ID to join your private room.</p>
          
          <div className="bg-gray-900 p-6 rounded-lg mb-6">
            <h3 className="text-xl font-semibold mb-4">Select Voice Effect</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {['none', 'helium', 'deep', 'robot'].map(effect => (
                     <button key={effect} onClick={() => setVoiceEffect(effect)} className={`capitalize py-3 px-4 rounded-lg transition duration-200 ${voiceEffect === effect ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                        {effect}
                    </button>
                ))}
            </div>
          </div>
    
          <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Microphone Test</h3>
              {micError && <p className="text-red-500 mb-2">{micError}</p>}
              {!isMicAccessGranted && (
                  <button onClick={getMicAccess} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 mb-4">
                      Grant Mic Access
                  </button>
              )}
              <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div className="bg-green-500 h-4 rounded-full transition-all duration-100" style={{width: `${micLevel}%`}}></div>
              </div>
          </div>
    
          <button onClick={handleJoinChat} disabled={!isMicAccessGranted} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
            Join Chat
          </button>
        </div>
      );
};


// --- Chat Room Component ---
const ChatRoom = ({ roomId, voiceEffect, onLeave, localStream }) => {
    const [participants, setParticipants] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const pc = useRef(new RTCPeerConnection(servers));
    const remoteAudioRef = useRef();
    
    // --- FIX: Add role management and more robust state ---
    const localId = useRef(`user_${Date.now()}`).current;
    const role = useRef(null); // 'caller' or 'callee'

    useEffect(() => {
        if (!db || !localStream) {
          console.error("Firestore or local stream is not available.");
          setConnectionStatus('failed');
          return;
        }
        
        const roomRef = doc(db, 'rooms', roomId);
        let unsubscribes = [];

        // --- FIX: Add ICE restart logic ---
        const handleConnectionStateChange = async () => {
            console.log(`Connection state: ${pc.current.connectionState}`);
            setConnectionStatus(pc.current.connectionState);
            
            if (pc.current.connectionState === 'connected') {
                const roomDoc = await getDoc(roomRef);
                const roomData = roomDoc.data();
                const remoteRole = role.current === 'caller' ? 'callee' : 'caller';
                setParticipants([
                    {id: localId, name: 'You'},
                    {id: roomData[remoteRole], name: 'Guest'}
                ]);
            }

            // This triggers an ICE restart if the connection fails
            if (pc.current.connectionState === 'failed') {
                await pc.current.createOffer({ iceRestart: true });
            }
        };
        
        // --- FIX: Add negotiation needed logic ---
        // This handles re-negotiation for ICE restarts
        const handleNegotiationNeeded = async () => {
            if (role.current !== 'caller') return; // Only caller initiates offers
            console.log('Negotiation needed, creating offer...');
            try {
                const offer = await pc.current.createOffer();
                await pc.current.setLocalDescription(offer);
                await updateDoc(roomRef, { offer: { sdp: offer.sdp, type: offer.type } });
            } catch (err) {
                console.error('Error during negotiation:', err);
            }
        };

        const setupWebRTC = async () => {
            pc.current.onconnectionstatechange = handleConnectionStateChange;
            pc.current.onnegotiationneeded = handleNegotiationNeeded;

            localStream.getTracks().forEach(track => {
                pc.current.addTrack(track, localStream);
            });

            pc.current.ontrack = event => {
                if (remoteAudioRef.current && event.streams[0]) {
                    remoteAudioRef.current.srcObject = event.streams[0];
                }
            };
            
            const roomDoc = await getDoc(roomRef);
            const roomData = roomDoc.data();

            if (!roomData.caller) { // This user is the first one, becomes the caller
                role.current = 'caller';
                setParticipants([{id: localId, name: 'You'}]);
                
                // Set up ICE candidate listener
                const callerCandidates = collection(roomRef, 'callerCandidates');
                pc.current.onicecandidate = event => event.candidate && addDoc(callerCandidates, event.candidate.toJSON());
                
                // Set this user as the caller in Firestore
                await updateDoc(roomRef, { caller: localId });
                
                // Listen for an answer from the callee
                unsubscribes.push(onSnapshot(roomRef, (snapshot) => {
                    const data = snapshot.data();
                    if (!pc.current.currentRemoteDescription && data?.answer) {
                        console.log('Got answer, setting remote description');
                        pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
                    }
                }));

                // Listen for ICE candidates from the callee
                const calleeCandidates = collection(roomRef, 'calleeCandidates');
                unsubscribes.push(onSnapshot(calleeCandidates, snapshot => {
                    snapshot.docChanges().forEach(change => change.type === 'added' && pc.current.addIceCandidate(new RTCIceCandidate(change.doc.data())));
                }));

            } else { // This user is the second one, becomes the callee
                role.current = 'callee';
                
                // Set up ICE candidate listener
                const calleeCandidates = collection(roomRef, 'calleeCandidates');
                pc.current.onicecandidate = event => event.candidate && addDoc(calleeCandidates, event.candidate.toJSON());
                
                // Set remote description from the offer
                await pc.current.setRemoteDescription(new RTCSessionDescription(roomData.offer));
                
                // Create and set answer
                const answerDescription = await pc.current.createAnswer();
                await pc.current.setLocalDescription(answerDescription);
                await updateDoc(roomRef, { 
                    answer: { sdp: answerDescription.sdp, type: answerDescription.type },
                    callee: localId
                });
                
                // Listen for ICE candidates from the caller
                const callerCandidates = collection(roomRef, 'callerCandidates');
                unsubscribes.push(onSnapshot(callerCandidates, snapshot => {
                    snapshot.docChanges().forEach(change => change.type === 'added' && pc.current.addIceCandidate(new RTCIceCandidate(change.doc.data())));
                }));
            }
        };

        setupWebRTC().catch(console.error);
        
        return () => {
            unsubscribes.forEach(unsub => unsub());
            if (pc.current) {
                pc.current.close();
            }
        };
    }, [roomId, localStream, localId]);
    
    // --- FIX: More robust leave logic ---
    const handleLeave = async () => {
        if (db) {
            try {
                const roomRef = doc(db, 'rooms', roomId);
                const roomDoc = await getDoc(roomRef);
                if (!roomDoc.exists()) {
                    onLeave();
                    return;
                }

                // Delete the entire room document on leave.
                // This is a simple but effective strategy for a two-person chat
                // to ensure no stale data prevents rejoining.
                await deleteDoc(roomRef);

            } catch (error) {
                console.error("Error cleaning up room:", error);
            }
        }
        onLeave();
    }
    
    const toggleMute = () => {
        if(localStream){
            localStream.getAudioTracks()[0].enabled = !isMuted;
            setIsMuted(!isMuted);
        }
    }

  return (
    <div className="w-full max-w-4xl h-[80vh] bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
            <h2 className="text-2xl font-bold">Room: <span className="text-indigo-400 font-mono text-xl">{roomId}</span></h2>
            <p className="text-gray-400 capitalize">Status: <span className="font-semibold text-indigo-400">{connectionStatus}</span></p>
        </div>
        <button onClick={handleLeave} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300">
          Leave Room
        </button>
      </div>

      <div className="flex-grow bg-gray-900 rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-min content-start">
        {participants.map(p => (
            <div key={p.id} className={`p-4 rounded-lg flex flex-col items-center justify-center transition-all bg-gray-700`}>
                <div className={`w-16 h-16 rounded-full mb-3 flex items-center justify-center text-2xl font-bold transition-colors bg-indigo-500`}>
                    {p.name.charAt(0)}
                </div>
                <p className="font-semibold">{p.name}</p>
            </div>
        ))}
      </div>
      
      <div className="mt-4 flex justify-center">
            <button onClick={toggleMute} className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors ${isMuted ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isMuted ? 'Unmute' : 'Mute'}
            </button>
      </div>

      <audio ref={remoteAudioRef} autoPlay playsInline />
    </div>
  );
};

export default App;
