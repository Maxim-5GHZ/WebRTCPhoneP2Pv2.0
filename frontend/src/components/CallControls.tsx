import { useState } from "react";
import type { IncomingCall, User } from "../types/types";

interface CallControlsProps {
  myId: string,
  status: "idle" | "calling" | "ringing" | "connected";
  onlineUsers: User[];
  incomingCall: IncomingCall | null;
  onCall: (targetId: string) => void;
  onAccept: () => void;
  onReject: () => void;
  onHangUp: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  isAudioMuted: boolean;
  isVideoEnabled: boolean;
}

export function CallControls({
  myId,
  status,
  onlineUsers,
  incomingCall,
  onCall,
  onAccept,
  onReject,
  onHangUp,
  onToggleAudio,
  onToggleVideo,
  isAudioMuted,
  isVideoEnabled,
}: CallControlsProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  return (
    <div style={styles.controls}>
      {status === "idle" && (
        <div style={{ display: "flex", gap: 10 }}>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            style={styles.input}
          >
            <option value="">Выберите пользователя</option>
            {onlineUsers.filter(user => user.id !== myId).map((user) => (
              <option key={user.id} value={user.id} disabled={user.inCall}>
                {user.username} {user.inCall ? " (в звонке)" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={() => onCall(selectedUserId)}
            disabled={!selectedUserId}
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
          <button onClick={onHangUp} style={styles.buttonDanger}>
            Завершить звонок
          </button>
        </div>
      )}

      <div style={{ marginTop: 10, color: "#666" }}>Статус: {status}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  controls: { textAlign: "center", marginTop: 20 },
  input: {
    padding: 10,
    borderRadius: 4,
    border: "1px solid #ccc",
    fontSize: 16,
    flexGrow: 1,
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
