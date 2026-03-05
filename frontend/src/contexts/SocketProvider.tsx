import {
  useEffect,
  useState,
  useRef
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

  useEffect(() => {
    if (!user?.token) {
      if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.close();
      }
    }
  }, [user?.token, socket]);

  useEffect(() => {
    if (!user?.token) {
      return;
    }

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
      if (!reconnectTimer.current) { // Only try to reconnect if not already scheduled
        setIsReconnecting(true);
        reconnectTimer.current = setTimeout(() => {
          setReconnectAttempt(prev => prev + 1);
        }, 1000 * Math.pow(2, Math.min(reconnectAttempt, 4))); // Exponential backoff, max 16 seconds
      }
    };

    ws.onerror = () => {
      ws.close();
    }

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.onclose = null; // Prevent onclose from triggering reconnect on *this* cleanup
        ws.close();
      }
    };
  }, [user?.token, reconnectAttempt]); // Depend only on the token and reconnect attempt

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
