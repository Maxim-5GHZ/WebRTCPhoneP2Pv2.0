import { useState, useEffect, useRef } from "react";
import { useSocket } from "./useSocket";
import { useAuthContext } from "./useAuth";
import { useNavigate } from "react-router-dom";

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

export const useBroadcast = (roomId: string, isBroadcaster: boolean) => {
    const { user } = useAuthContext();
    const { socket } = useSocket();
    const navigate = useNavigate();
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [peers, setPeers] = useState<Record<string, RTCPeerConnection>>({});
    const peerMediaElements = useRef<Record<string, HTMLVideoElement>>({});

    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const localVideoTrackRef = useRef<MediaStreamTrack | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        const startStream = async () => {
            if (isBroadcaster) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                setLocalStream(stream);
                localStreamRef.current = stream;
                localVideoTrackRef.current = stream.getVideoTracks()[0];
            }
        };

        startStream();

        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, [isBroadcaster]);

    useEffect(() => {
        if (!socket || !user) return;
        if (isBroadcaster && !localStream) return;

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            const fromId = message.from;

            switch (message.type) {
                case "offer":
                    handleOffer(message.offer, fromId);
                    break;
                case "answer":
                    handleAnswer(message.answer, fromId);
                    break;
                case "candidate":
                    handleCandidate(message.candidate, fromId);
                    break;
                case "user_joined":
                    if (isBroadcaster) {
                        createPeerConnection(message.userId);
                    }
                    break;
                case "user_left":
                    handleUserLeft(message.userId);
                    break;
                case "start_broadcast":
                    if (!isBroadcaster) {
                        createPeerConnection(message.userId, true);
                    }
                    break;
                default:
                    break;
            }
        };

        const createPeerConnection = (userId: string, isViewer: boolean = false) => {
            const peerConnection = new RTCPeerConnection(ICE_SERVERS);

            if (isBroadcaster) {
                localStream?.getTracks().forEach((track) => {
                    peerConnection.addTrack(track, localStream);
                });
            }

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.send(JSON.stringify({
                        type: "candidate",
                        candidate: event.candidate,
                        to: userId,
                    }));
                }
            };

            peerConnection.ontrack = (event) => {
                const videoElement = peerMediaElements.current[userId];
                if (videoElement) {
                    videoElement.srcObject = event.streams[0];
                }
            };
            
            if (isViewer) {
                // For viewers, we need to send an offer
                peerConnection.createOffer().then(offer => {
                    peerConnection.setLocalDescription(offer);
                    socket.send(JSON.stringify({
                        type: "offer",
                        offer,
                        to: userId,
                    }));
                });
            }

            setPeers((prev) => ({ ...prev, [userId]: peerConnection }));
            return peerConnection;
        };

        const handleOffer = async (offer: RTCSessionDescriptionInit, fromId: string) => {
            const peerConnection = createPeerConnection(fromId);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.send(JSON.stringify({ type: "answer", answer, to: fromId }));
        };

        const handleAnswer = async (answer: RTCSessionDescriptionInit, fromId: string) => {
            const peerConnection = peers[fromId];
            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        };

        const handleCandidate = async (candidate: RTCIceCandidateInit, fromId: string) => {
            const peerConnection = peers[fromId];
            if (peerConnection) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        };

        const handleUserLeft = (userId: string) => {
            if (peers[userId]) {
                peers[userId].close();
                delete peers[userId];
                setPeers({ ...peers });
            }
        };

        if (isBroadcaster) {
            socket.send(JSON.stringify({ type: "start_broadcast", roomId }));
        } else {
            socket.send(JSON.stringify({ type: "join_room", roomId }));
        }

    }, [socket, localStream, user, peers, roomId, isBroadcaster]);

    const addVideoElement = (userId: string, element: HTMLVideoElement) => {
        peerMediaElements.current[userId] = element;
    };

    const stopBroadcast = () => {
        Object.values(peers).forEach(pc => pc.close());
        setPeers({});
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        socket?.send(JSON.stringify({ type: "leaveRoom" }));
        navigate('/start-menu');
    };

    const toggleAudio = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = !track.enabled;
                setIsAudioMuted(!track.enabled);
            });
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach((track) => {
                track.enabled = !track.enabled;
                setIsVideoEnabled(track.enabled);
            });
        }
    };

    const toggleScreenSharing = async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];

                if (localStreamRef.current) {
                    const oldTrack = localStreamRef.current.getVideoTracks()[0];
                    localStreamRef.current.removeTrack(oldTrack);
                    localStreamRef.current.addTrack(screenTrack);

                    for (const peer of Object.values(peers)) {
                        const sender = peer.getSenders().find(s => s.track?.kind === 'video');
                        if (sender) {
                            await sender.replaceTrack(screenTrack);
                        }
                    }
                    setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                }
                
                setIsScreenSharing(true);
                setIsVideoEnabled(true);

                screenTrack.onended = () => toggleScreenSharing();

            } catch (err) {
                console.error("Error sharing screen:", err);
            }
        } else {
            if (localStreamRef.current && localVideoTrackRef.current) {
                const oldTrack = localStreamRef.current.getVideoTracks()[0];
                localStreamRef.current.removeTrack(oldTrack);
                localStreamRef.current.addTrack(localVideoTrackRef.current);

                for (const peer of Object.values(peers)) {
                    const sender = peer.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) {
                        await sender.replaceTrack(localVideoTrackRef.current);
                    }
                }
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
            }
            setIsScreenSharing(false);
        }
    };

    return { 
        localStream, 
        peers, 
        addVideoElement,
        isAudioMuted,
        isVideoEnabled,
        isScreenSharing,
        toggleAudio,
        toggleVideo,
        toggleScreenSharing,
        stopBroadcast
    };
};