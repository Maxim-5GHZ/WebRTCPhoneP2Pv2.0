import { useRef, useState } from "react";

// --- Типы ---
type SignalType = "my-id" | "offer" | "answer" | "candidate" | "reject";

type SignalData =
  | RTCSessionDescriptionInit
  | RTCIceCandidateInit
  | string
  | null;

interface SignalMessage {
  type: SignalType;
  data?: SignalData;
  from?: string;
  to?: string;
}

interface IncomingCall {
  from: string;
  offer: RTCSessionDescriptionInit;
}

interface UserData {
  id: number;
  username: string;
  login: string;
  role: string;
  token: string;
}

// Конфигурация WebRTC
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const API_URL = "http://localhost:8080/api/auth";

function App() {
  // --- Состояния Auth ---
  const [user, setUser] = useState<UserData | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginInput, setLoginInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [usernameInput, setUsernameInput] = useState(""); // Только для регистрации

  // --- Состояния WebRTC ---
  const [myId, setMyId] = useState<string>("");
  const [targetIdInput, setTargetIdInput] = useState<string>("");
  const [status, setStatus] = useState<
    "idle" | "calling" | "ringing" | "connected"
  >("idle");
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  // --- Рефы ---
  const socketRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Видео элементы
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // --- API Функции ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === "login" ? "/login" : "/register";
    const body =
      authMode === "login"
        ? { login: loginInput, password: passwordInput }
        : {
            username: usernameInput,
            login: loginInput,
            password: passwordInput,
          };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(await res.text());

      const data: UserData = await res.json();
      setUser(data);
      // После успешного входа подключаемся к сокету
      connectSocket();
    } catch (err) {
      alert("Ошибка авторизации: " + err);
    }
  };

  const logout = () => {
    setUser(null);
    if (socketRef.current) socketRef.current.close();
    stopCall();
  };

  // --- WebRTC Логика ---

  const connectSocket = () => {
    if (socketRef.current) return;

    // В реальном проекте можно передавать токен в параметрах: ?token=${user.token}
    const ws = new WebSocket("ws://localhost:8080/signal");
    socketRef.current = ws;

    ws.onmessage = async (event) => {
      const msg: SignalMessage = JSON.parse(event.data);

      switch (msg.type) {
        case "my-id":
          if (typeof msg.data === "string") setMyId(msg.data);
          break;
        case "offer":
          if (msg.from && msg.data) {
            setIncomingCall({
              from: msg.from,
              offer: msg.data as RTCSessionDescriptionInit,
            });
            setStatus("ringing");
          }
          break;
        case "answer":
          if (pcRef.current && msg.data) {
            await pcRef.current.setRemoteDescription(
              new RTCSessionDescription(msg.data as RTCSessionDescriptionInit),
            );
            setStatus("connected");
          }
          break;
        case "candidate":
          if (pcRef.current?.remoteDescription && msg.data) {
            await pcRef.current.addIceCandidate(
              new RTCIceCandidate(msg.data as RTCIceCandidateInit),
            );
          }
          break;
        case "reject":
          stopCall();
          break;
      }
    };

    ws.onclose = () => {
      socketRef.current = null;
    };
  };

  const createPC = (remoteId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Добавляем треки (аудио + видео)
    localStreamRef.current?.getTracks().forEach((track) => {
      if (localStreamRef.current) {
        pc.addTrack(track, localStreamRef.current);
      }
    });

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate)
        sendSignal("candidate", event.candidate.toJSON(), remoteId);
    };

    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        stopCall();
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const sendSignal = (type: SignalType, data?: SignalData, to?: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, data, to }));
    }
  };

  const startLocalStream = async () => {
    try {
      // ЗАПРОС ВИДЕО И АУДИО
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert("Не удалось получить доступ к камере/микрофону");
      throw err;
    }
  };

  const handleCall = async () => {
    if (!targetIdInput) return;
    try {
      await startLocalStream();
      setStatus("calling");

      const pc = createPC(targetIdInput);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal("offer", offer, targetIdInput);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAccept = async () => {
    if (!incomingCall) return;
    try {
      await startLocalStream();
      setStatus("connected");

      const pc = createPC(incomingCall.from);
      await pc.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer),
      );
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal("answer", answer, incomingCall.from);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = () => {
    const id = incomingCall?.from; // Нужно знать кому отправить отбой
    if (id) sendSignal("reject", null, id);
    stopCall();
  };

  const stopCall = () => {
    // Остановить треки камеры/микрофона
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setStatus("idle");
    setIncomingCall(null);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  // --- Рендер ---

  if (!user) {
    return (
      <div style={styles.container}>
        <h2>{authMode === "login" ? "Вход" : "Регистрация"}</h2>
        <form onSubmit={handleAuth} style={styles.form}>
          {authMode === "register" && (
            <input
              placeholder="Имя пользователя"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              style={styles.input}
              required
            />
          )}
          <input
            placeholder="Логин (email)"
            value={loginInput}
            onChange={(e) => setLoginInput(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.buttonPrimary}>
            {authMode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>
        <p style={{ marginTop: 10 }}>
          {authMode === "login" ? "Нет аккаунта?" : "Уже есть аккаунт?"}
          <button
            onClick={() =>
              setAuthMode(authMode === "login" ? "register" : "login")
            }
            style={styles.linkButton}
          >
            {authMode === "login" ? "Создать" : "Войти"}
          </button>
        </p>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <div>
          <h3>Привет, {user.username}!</h3>
          <small>
            Роль: {user.role} | Логин: {user.login}
          </small>
        </div>
        <button onClick={logout} style={styles.buttonDanger}>
          Выйти
        </button>
      </header>

      <div style={styles.connectionInfo}>
        <p>
          Ваш ID соединения: <strong>{myId || "..."}</strong>
        </p>
        <button
          onClick={() => navigator.clipboard.writeText(myId)}
          style={styles.buttonSecondary}
        >
          Копировать ID
        </button>
      </div>

      <div style={styles.videoContainer}>
        {/* Локальное видео (Я) */}
        <div style={styles.videoWrapper}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted // Важно заглушить себя, чтобы не слышать эхо
            style={styles.videoElement}
          />
          <span style={styles.videoLabel}>Вы</span>
        </div>

        {/* Удаленное видео (Собеседник) */}
        <div style={styles.videoWrapper}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={styles.videoElement}
          />
          <span style={styles.videoLabel}>Собеседник</span>
        </div>
      </div>

      <div style={styles.controls}>
        {status === "idle" && (
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={targetIdInput}
              onChange={(e) => setTargetIdInput(e.target.value)}
              placeholder="ID собеседника"
              style={styles.input}
            />
            <button
              onClick={handleCall}
              disabled={!targetIdInput}
              style={styles.buttonPrimary}
            >
              Видеозвонок
            </button>
          </div>
        )}

        {status === "ringing" && (
          <div style={styles.incomingBox}>
            <p>Входящий от: {incomingCall?.from}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleAccept} style={styles.buttonSuccess}>
                Принять (Видео)
              </button>
              <button onClick={handleReject} style={styles.buttonDanger}>
                Отклонить
              </button>
            </div>
          </div>
        )}

        {(status === "calling" || status === "connected") && (
          <button onClick={handleReject} style={styles.buttonDangerWide}>
            Завершить звонок
          </button>
        )}

        <div style={{ marginTop: 10, color: "#666" }}>Статус: {status}</div>
      </div>
    </div>
  );
}

// Простые стили в объекте
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 400,
    margin: "50px auto",
    padding: 20,
    textAlign: "center",
    border: "1px solid #ccc",
    borderRadius: 8,
  },
  appContainer: {
    maxWidth: 800,
    margin: "0 auto",
    padding: 20,
    fontFamily: "sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #eee",
    paddingBottom: 10,
    marginBottom: 20,
  },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  input: {
    padding: 10,
    borderRadius: 4,
    border: "1px solid #ccc",
    fontSize: 16,
  },
  buttonPrimary: {
    padding: 10,
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  buttonSecondary: {
    padding: "5px 10px",
    background: "#6c757d",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    marginLeft: 10,
  },
  buttonDanger: {
    padding: "5px 10px",
    background: "#dc3545",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  buttonDangerWide: {
    padding: 10,
    background: "#dc3545",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    width: "100%",
  },
  buttonSuccess: {
    padding: 10,
    background: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  linkButton: {
    background: "none",
    border: "none",
    color: "#007bff",
    cursor: "pointer",
    textDecoration: "underline",
  },
  connectionInfo: {
    background: "#f8f9fa",
    padding: 10,
    borderRadius: 4,
    marginBottom: 20,
  },
  videoContainer: {
    display: "flex",
    justifyContent: "center",
    gap: 20,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  videoWrapper: {
    position: "relative",
    width: 320,
    height: 240,
    background: "#000",
    borderRadius: 8,
    overflow: "hidden",
  },
  videoElement: { width: "100%", height: "100%", objectFit: "cover" },
  videoLabel: {
    position: "absolute",
    bottom: 10,
    left: 10,
    color: "#fff",
    background: "rgba(0,0,0,0.5)",
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 12,
  },
  controls: { textAlign: "center" },
  incomingBox: {
    background: "#e2e6ea",
    padding: 15,
    borderRadius: 8,
    animation: "pulse 1s infinite",
  },
};

export default App;
