import {
  useEffect,
  useState,
} from "react";
import type { User } from "../types/types";
import { SocketContext } from "./SocketContext";

export function SocketProvider({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (user) {
      const ws = new WebSocket(`ws://localhost:8080/signal?token=${user.token}`);
      
      ws.onopen = () => {
        setSocket(ws);
      }

      ws.onclose = () => {
        setSocket(null);
      };

      return () => {
        ws.close();
      };
    }
  }, [user]);

  const sendSignal = (message: object) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  };

  return (
    <SocketContext.Provider value={{ socket, sendSignal }}>
      {children}
    </SocketContext.Provider>
  );
}

export { SocketContext };
