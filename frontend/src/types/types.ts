// --- Типы ---
export type SignalType = "my-id" | "offer" | "answer" | "candidate" | "reject";

export type SignalData =
  | RTCSessionDescriptionInit
  | RTCIceCandidateInit
  | string
  | null;

export interface SignalMessage {
  type: SignalType;
  data?: SignalData;
  from?: string;
  to?: string;
}

export interface IncomingCall {
  from: string;
  offer: RTCSessionDescriptionInit;
}

export interface UserData {
  id: number;
  username: string;
  login: string;
  role: string;
  token: string;
}
