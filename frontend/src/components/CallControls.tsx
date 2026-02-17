import { useState } from "react";
import type { IncomingCall } from "../types/types";

interface CallControlsProps {
  status: "idle" | "calling" | "ringing" | "connected";
  myId: string;
  incomingCall: IncomingCall | null;
  onCall: (targetId: string) => void;
  onAccept: () => void;
  onReject: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  isAudioMuted: boolean;
  isVideoEnabled: boolean;
}

export function CallControls({
  status,
  myId,
  incomingCall,
  onCall,
  onAccept,
  onReject,
  onToggleAudio,
  onToggleVideo,
  isAudioMuted,
  isVideoEnabled,
}: CallControlsProps) {
  const [targetIdInput, setTargetIdInput] = useState<string>("");

  return (
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
            onClick={() => onCall(targetIdInput)}
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
            <button onClick={onAccept} style={styles.buttonSuccess}>
              Принять (Видео)
            </button>
            <button onClick={onReject} style={styles.buttonDanger}>
              Отклонить
            </button>
          </div>
        </div>
      )}

      {(status === "calling" || status === "connected") && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onToggleAudio}
            style={isAudioMuted ? styles.buttonWarning : styles.buttonPrimary}
          >
            {isAudioMuted ? "Включить звук" : "Выключить звук"}
          </button>
          <button
            onClick={onToggleVideo}
            style={!isVideoEnabled ? styles.buttonWarning : styles.buttonPrimary}
          >
            {!isVideoEnabled ? "Включить видео" : "Выключить видео"}
          </button>
          <button onClick={onReject} style={styles.buttonDanger}>
            Завершить звонок
          </button>
        </div>
      )}

      <div style={{ marginTop: 10, color: "#666" }}>Статус: {status}</div>
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
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  controls: { textAlign: "center" },
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
    padding: 10,
    background: "#dc3545",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  buttonSuccess: {
    padding: 10,
    background: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  buttonWarning: {
    padding: 10,
    background: "#ffc107",
    color: "#212529",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  connectionInfo: {
    background: "#f8f9fa",
    padding: 10,
    borderRadius: 4,
    marginBottom: 20,
    marginTop: 10,
  },
  incomingBox: {
    background: "#e2e6ea",
    padding: 15,
    borderRadius: 8,
    animation: "pulse 1s infinite",
  },
};
