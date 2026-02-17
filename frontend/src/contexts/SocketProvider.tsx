import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";

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
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const socketRef = useRef(socket);
  socketRef.current = socket;

  useEffect(() => {
    if (user && !socketRef.current) {
      const ws = new WebSocket(`ws://localhost:8080/signal?token=${user.token}`);
      setSocket(ws);

      ws.onclose = () => {
        setSocket(null);
      };

      return () => {
        ws.close();
      };
    }
  }, [user]);

  const sendSignal = (type: string, data?: any, to?: string) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, data, to }));
    }
  };

  return (
    <SocketContext.Provider value={{ socket, sendSignal }}>
      {children}
    </SocketContext.Provider>
  );
}
