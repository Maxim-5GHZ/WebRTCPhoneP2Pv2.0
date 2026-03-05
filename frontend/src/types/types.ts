export interface User {
  id: number;
  username: string;
  token: string;
  role: string;
  login: string;
  activation: 'Enable' | 'Disable';
  inCall?: boolean;
  isTwoFactorEnabled?: boolean;
}

export interface IncomingCall {
    from: string;
    offer: RTCSessionDescriptionInit;
    useTurn?: boolean;
}

export interface SignalMessage {
    type: "connection-success"
    | "user-connected"
    | "user-disconnected"
    | "user-in-call-status-changed"
    | "call-made"
    | "answer-made"
    | "ice-candidate"
    | "call-rejected"
    | "hang-up"
    | "call-user"
    | "make-answer"
    | "request-turn-renegotiation";
    myId?: string;
    data?: unknown;
    userId?: string;
    username?: string;
    inCall?: boolean;
    from?: string;
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
    reason?: string;
    to?: string;
    useTurn?: boolean;
}

export interface NewParticipantMessage {
    id: 'newParticipantArrived';
    name: string;
}

export interface ExistingParticipantsMessage {
    id: 'existingParticipants';
    data: string[];
}

export interface ParticipantLeftMessage {
    id: 'participantLeft';
    name: string;
}

export interface ReceiveVideoAnswerMessage {
    id: 'receiveVideoAnswer';
    name: string;
    sdpAnswer: string;
}

export interface IceCandidateMessage {
    id: 'iceCandidate';
    name: string;
    candidate: RTCIceCandidate;
}

export type ConferenceMessage = NewParticipantMessage | ExistingParticipantsMessage | ParticipantLeftMessage | ReceiveVideoAnswerMessage | IceCandidateMessage;