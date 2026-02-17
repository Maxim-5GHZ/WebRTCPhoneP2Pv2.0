import { useRef, useState, useEffect } from "react";
import type { IncomingCall, SignalMessage } from "../types/types";
import { useSocket } from "../contexts/SocketProvider";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useWebRTC(
  localVideoRef: React.RefObject<HTMLVideoElement>,
  remoteVideoRef: React.RefObject<HTMLVideoElement>
) {
  const { socket, sendSignal } = useSocket();
  const [myId, setMyId] = useState<string>("");
  const [status, setStatus] = useState<
    "idle" | "calling" | "ringing" | "connected"
  >("idle");
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (socket) {
      socket.onmessage = async (event: MessageEvent) => {
        const msg: SignalMessage = JSON.parse(event.data);

        switch (msg.type) {
          case "my-id":
            if (typeof msg.data === "string") setMyId(msg.data);
            break;
          case "offer":
            if (msg.from && msg.data) {
              setIncomingCall({
                from: msg.from,
                offer: msg.data as RTCSessionDescriptionInit,
              });
              setStatus("ringing");
            }
            break;
          case "answer":
            if (pcRef.current && msg.data) {
              await pcRef.current.setRemoteDescription(
                new RTCSessionDescription(
                  msg.data as RTCSessionDescriptionInit
                )
              );
              setStatus("connected");
            }
            break;
          case "candidate":
            if (pcRef.current?.remoteDescription && msg.data) {
              await pcRef.current.addIceCandidate(
                new RTCIceCandidate(msg.data as RTCIceCandidateInit)
              );
            }
            break;
          case "reject":
            stopCall();
            break;
        }
      };
    }
  }, [socket]);

  const createPC = (remoteId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    localStreamRef.current?.getTracks().forEach((track) => {
      if (localStreamRef.current) {
        pc.addTrack(track, localStreamRef.current);
      }
    });

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate)
        sendSignal("candidate", event.candidate.toJSON(), remoteId);
    };

    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        stopCall();
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert("Не удалось получить доступ к камере/микрофону");
      throw err;
    }
  };

  const handleCall = async (targetIdInput: string) => {
    if (!targetIdInput) return;
    try {
      await startLocalStream();
      setStatus("calling");

      const pc = createPC(targetIdInput);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal("offer", offer, targetIdInput);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAccept = async () => {
    if (!incomingCall) return;
    try {
      await startLocalStream();
      setStatus("connected");

      const pc = createPC(incomingCall.from);
      await pc.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer)
      );
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal("answer", answer, incomingCall.from);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = () => {
    const id = incomingCall?.from;
    if (id) sendSignal("reject", null, id);
    stopCall();
  };

  const stopCall = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setStatus("idle");
    setIncomingCall(null);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
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
    handleCall,
    handleAccept,
    handleReject,
    stopCall,
    toggleAudio,
    toggleVideo,
  };
}
