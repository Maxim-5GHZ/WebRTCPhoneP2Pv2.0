import { createContext } from "react";

interface SocketContextType {
  socket: WebSocket | null;
  sendSignal: (message: object) => void;
  isReconnecting: boolean;
  reconnectAttempt: number;
}

export const SocketContext = createContext<SocketContextType | null>(null);
