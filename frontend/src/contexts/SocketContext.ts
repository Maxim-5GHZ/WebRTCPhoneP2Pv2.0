import { createContext } from "react";

interface SocketContextType {
  socket: WebSocket | null;
  sendSignal: (message: object) => void;
}

export const SocketContext = createContext<SocketContextType | null>(null);
