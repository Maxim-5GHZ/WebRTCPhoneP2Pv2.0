import {
  useEffect,
  useState,
  useRef,
  useCallback
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
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/signal?token=${user.token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setSocket(ws);
      setIsReconnecting(false);
      setReconnectAttempt(0);
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onclose = () => {
      setSocket(null);
      if (!reconnectTimer.current) {
        setIsReconnecting(true);
        reconnectTimer.current = setTimeout(() => {
          setReconnectAttempt(prev => prev + 1);
          connect();
          reconnectTimer.current = null;
        }, 1000 * Math.pow(2, Math.min(reconnectAttempt, 4))); // Exponential backoff, max 16 seconds
      }
    };

    ws.onerror = () => {
      ws.close();
    }

    return ws;
  }, [user, reconnectAttempt]);


  useEffect(() => {
    const ws = connect();

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (ws) {
        ws.onclose = null; // Prevent reconnection on unmount
        ws.close();
      }
    };
  }, [connect]);

  const sendSignal = (message: object) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  };

  return (
    <SocketContext.Provider value={{ socket, sendSignal, isReconnecting, reconnectAttempt }}>
      {children}
    </SocketContext.Provider>
  );
}

export { SocketContext };
