import { useEffect, useRef, useState } from "react";

// --- Строгая типизация данных ---
type SignalType = "my-id" | "offer" | "answer" | "candidate" | "reject";

/**
 * Данные, которые могут передаваться в сигнальном сообщении.
 * Мы объединяем возможные типы WebRTC и базовые типы.
 */
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

// Конфигурация ICE-серверов (Google STUN)
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function App() {
  // Состояния интерфейса
  const [myId, setMyId] = useState<string>("");
  const [targetIdInput, setTargetIdInput] = useState<string>("");
  const [status, setStatus] = useState<
    "idle" | "calling" | "ringing" | "connected"
  >("idle");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Рефы для работы с API
  const socketRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- Вспомогательные функции ---

  // Отправка сообщения через сокет с типами
  const sendSignal = (type: SignalType, data?: SignalData, to?: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, data, to }));
    }
  };

  // Копирование ссылки в буфер обмена
  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}${window.location.pathname}?callId=${myId}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // Остановка всех процессов (сброс звонка)
  const stopCall = () => {
    pcRef.current?.close();
    pcRef.current = null;
    setStatus("idle");
    setActiveChatId(null);
    setIncomingCall(null);
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  };

  // Инициализация RTCPeerConnection
  const createPC = (remoteId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Добавляем наши аудио-треки в соединение
    localStreamRef.current?.getTracks().forEach((track) => {
      if (localStreamRef.current) {
        pc.addTrack(track, localStreamRef.current);
      }
    });

    // Когда получаем поток от собеседника
    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    // Когда генерируется ICE-кандидат
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("candidate", event.candidate.toJSON(), remoteId);
      }
    };

    // Следим за состоянием соединения
    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        stopCall();
      }
    };

    pcRef.current = pc;
    return pc;
  };

  // --- Обработчики кнопок ---

  const handleCall = async () => {
    if (!targetIdInput) return;
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setStatus("calling");
      setActiveChatId(targetIdInput);

      const pc = createPC(targetIdInput);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal("offer", offer, targetIdInput);
    } catch (err) {
      console.error("Доступ к микрофону запрещен:", err);
      alert("Не удалось получить доступ к микрофону");
    }
  };

  const handleAccept = async () => {
    if (!incomingCall) return;
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const { from, offer } = incomingCall;

      setStatus("connected");
      setActiveChatId(from);

      const pc = createPC(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal("answer", answer, from);
      setIncomingCall(null);
    } catch (err) {
      console.error("Ошибка при принятии вызова:", err);
    }
  };

  const handleReject = () => {
    const id = activeChatId || incomingCall?.from;
    if (id) sendSignal("reject", null, id);
    stopCall();
  };

  // --- Эффекты ---

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080/signal");
    socketRef.current = ws;

    ws.onmessage = async (event: MessageEvent) => {
      const msg: SignalMessage = JSON.parse(event.data as string);

      switch (msg.type) {
        case "my-id":
          if (typeof msg.data === "string") {
            setMyId(msg.data);
            // Проверка URL на наличие callId
            const params = new URLSearchParams(window.location.search);
            const callIdFromUrl = params.get("callId");
            if (callIdFromUrl && callIdFromUrl !== msg.data) {
              setTargetIdInput(callIdFromUrl);
            }
          }
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

    return () => {
      ws.close();
      stopCall();
    };
  }, []);

  // --- Рендер ---
  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
        maxWidth: "400px",
        margin: "0 auto",
      }}
    >
      <h1>Audio Call</h1>

      <div
        style={{
          background: "#f0f0f0",
          padding: "1rem",
          borderRadius: "8px",
          marginBottom: "1rem",
        }}
      >
        <p style={{ margin: 0 }}>
          Ваш ID: <strong>{myId || "Подключение..."}</strong>
        </p>
        <button
          onClick={copyInviteLink}
          disabled={!myId}
          style={{ marginTop: "10px", width: "100%", cursor: "pointer" }}
        >
          {copySuccess
            ? "✅ Ссылка скопирована"
            : "🔗 Создать ссылку на звонок"}
        </button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <strong>Статус:</strong> {status}
      </div>

      {status === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input
            value={targetIdInput}
            onChange={(e) => setTargetIdInput(e.target.value)}
            placeholder="Введите ID собеседника"
            style={{ padding: "8px" }}
          />
          <button
            onClick={handleCall}
            disabled={!targetIdInput}
            style={{
              padding: "10px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Позвонить
          </button>
        </div>
      )}

      {status === "ringing" && (
        <div
          style={{
            background: "#e3f2fd",
            padding: "1rem",
            borderRadius: "8px",
          }}
        >
          <p>
            Входящий звонок: <strong>{incomingCall?.from}</strong>
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleAccept}
              style={{
                flex: 1,
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                padding: "10px",
                borderRadius: "4px",
              }}
            >
              Принять
            </button>
            <button
              onClick={handleReject}
              style={{
                flex: 1,
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                padding: "10px",
                borderRadius: "4px",
              }}
            >
              Отклонить
            </button>
          </div>
        </div>
      )}

      {(status === "calling" || status === "connected") && (
        <div style={{ textAlign: "center" }}>
          <p>
            Разговор с: <strong>{activeChatId}</strong>
          </p>
          <button
            onClick={handleReject}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Завершить
          </button>
        </div>
      )}

      {/* Скрытый элемент аудио для воспроизведения голоса */}
      <audio ref={remoteAudioRef} autoPlay />
    </div>
  );
}

export default App;
