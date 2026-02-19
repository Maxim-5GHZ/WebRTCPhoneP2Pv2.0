export interface User {
  id: any;
  username: string;
  token: string;
  role: string;
  login: string;
  inCall?: boolean;
}

export interface IncomingCall {
    from: string;
    offer: RTCSessionDescriptionInit;
}

export interface SignalMessage {
    type: string;
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
}