export interface User {
  id: any;
  username: string;
  token: string;
  role: string;
  login: string;
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
    data?: any;
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