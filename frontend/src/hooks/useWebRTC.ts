import { useRef, useState, useEffect, useCallback } from "react";
import type { IncomingCall, SignalMessage, User } from "../types/types";
import { useSocket } from "../hooks/useSocket";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "turn:openrelay.metered.ca:80",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

export function useWebRTC(
  setOnlineUsers: React.Dispatch<React.SetStateAction<User[]>>
) {
  const { socket, sendSignal } = useSocket();
  const [myId, setMyId] = useState<string>("");
  const [status, setStatus] = useState<
    "idle" | "calling" | "ringing" | "connected"
  >("idle");
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isRemoteMuted, setIsRemoteMuted] = useState<boolean>(true);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const startStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        localStreamRef.current = stream;
      } catch (err) {
        console.error("Error accessing media devices:", err);
        alert("Не удалось получить доступ к камере/микрофону");
      }
    };
    startStream();

    return () => {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const stopCall = useCallback(() => {
    if (remoteUserIdRef.current) {
      sendSignal({ type: 'hang-up', to: remoteUserIdRef.current });
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setStatus("idle");
    setIncomingCall(null);
    remoteUserIdRef.current = null;
    setRemoteStream(null);
    setIsRemoteMuted(true);
  }, [sendSignal]);

  useEffect(() => {
    if (socket) {
      const handleMessage = async (event: MessageEvent) => {
        const msg: SignalMessage = JSON.parse(event.data);

        switch (msg.type) {
          case "connection-success":
            if (msg.myId) {
              setMyId(msg.myId);
            }
            setOnlineUsers(msg.data as User[]);
            break;
            case "user-connected":
            setOnlineUsers(prev => {
                if (prev.find(user => user.id === msg.userId)) {
                    return prev;
                }
                return [...prev, { id: msg.userId, username: msg.username, inCall: false } as User];
            });
            break;
          case "user-disconnected":
            setOnlineUsers(prev => prev.filter(user => user.id !== msg.userId));
            break;
          case "user-in-call-status-changed":
            setOnlineUsers(prev => prev.map(user => {
                if (user.id === msg.userId) {
                    return { ...user, inCall: msg.inCall ?? false };
                }
                return user;
            }));
            break;
          case "call-made":
            if (msg.from && msg.offer) {
              setIncomingCall({
                from: String(msg.from),
                offer: msg.offer as RTCSessionDescriptionInit,
              });
              setStatus("ringing");
              remoteUserIdRef.current = String(msg.from);
            }
            break;
          case "answer-made":
            if (pcRef.current && msg.answer) {
              await pcRef.current.setRemoteDescription(
                new RTCSessionDescription(
                  msg.answer as RTCSessionDescriptionInit
                )
              );
              setStatus("connected");
              setIsRemoteMuted(false);
            }
            break;
          case "ice-candidate":
            if (pcRef.current?.remoteDescription && msg.candidate) {
              await pcRef.current.addIceCandidate(
                new RTCIceCandidate(msg.candidate as RTCIceCandidateInit)
              );
            }
            break;
          case "call-rejected":
            alert(msg.reason);
            stopCall();
            break;
          case "hang-up":
            stopCall();
            break;
        }
      };
      socket.addEventListener('message', handleMessage);

      return () => {
        socket.removeEventListener('message', handleMessage);
      }
    }
  }, [socket, setOnlineUsers, stopCall]);
  
  const createPC = (remoteId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    localStreamRef.current?.getTracks().forEach((track) => {
      if (localStreamRef.current) {
        pc.addTrack(track, localStreamRef.current);
      }
    });

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStream(remoteStream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate)
        sendSignal({
          type: "ice-candidate",
          candidate: event.candidate.toJSON(),
          to: remoteId,
        });
    };

    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        stopCall();
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const handleCall = async (targetId: string) => {
    if (!targetId || !localStreamRef.current) return;
    try {
      setStatus("calling");
      remoteUserIdRef.current = targetId;

      const pc = createPC(targetId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal({ type: "call-user", offer: offer, to: targetId });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAccept = async () => {
    if (!incomingCall || !localStreamRef.current) return;
    try {
      setStatus("connected");

      const pc = createPC(incomingCall.from);
      await pc.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer)
      );
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal({ type: "make-answer", answer: answer, to: incomingCall.from });
      setIncomingCall(null);
      setIsRemoteMuted(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = () => {
    const id = incomingCall?.from;
    if (id) sendSignal({ type: "hang-up", to: id });
    stopCall();
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

  return {
    myId,
    status,
    incomingCall,
    isAudioMuted,
    isVideoEnabled,
    localStream,
    remoteStream,
    isRemoteMuted,
    handleCall,
    handleAccept,
    handleReject,
    stopCall,
    toggleAudio,
    toggleVideo,
  };
}

