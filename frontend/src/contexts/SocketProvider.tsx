import { createContext, useContext, useEffect, useRef } from "react";
import type { SignalMessage } from "../types/types";

interface SocketContextType {
  socket: WebSocket | null;
  sendSignal: (type: string, data?: any, to?: string) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}

export function SocketProvider({
  user,
  children,
}: {
  user: any;
  children: React.ReactNode;
}) {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (user) {
      const ws = new WebSocket(`ws://localhost:8080/signal?token=${user.token}`);
      socketRef.current = ws;

      ws.onmessage = async (event) => {
        const msg: SignalMessage = JSON.parse(event.data);
        // Logic to handle incoming messages will be in useWebRTC hook
        // This is just to demonstrate the connection
        console.log("Received message:", msg);
      };

      ws.onclose = () => {
        socketRef.current = null;
      };

      return () => {
        ws.close();
      };
    }
  }, [user]);

  const sendSignal = (type: string, data?: any, to?: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, data, to }));
    }
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, sendSignal }}>
      {children}
    </SocketContext.Provider>
  );
}
