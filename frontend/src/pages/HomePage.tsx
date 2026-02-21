import React, { useState } from "react";
import { VideoPlayer } from "../components/VideoPlayer";
import { CallControls } from "../components/CallControls";
import { Header } from "../components/Header";
import { useAuthContext } from "../hooks/useAuth";
import { SocketProvider } from "../contexts/SocketProvider";
import { useWebRTC } from "../hooks/useWebRTC";
import type { User } from "../types/types";

function HomePageContent() {
    const { user, logout, toggle2FA } = useAuthContext();
    const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

    const {
        myId,
        status,
        incomingCall,
        isAudioMuted,
        isVideoEnabled,
        localStream,
        remoteStream,
        isRemoteMuted,
        handleCall,
        handleAccept,
        handleReject,
        stopCall,
        toggleAudio,
        toggleVideo,
    } = useWebRTC(setOnlineUsers);

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div style={styles.container}>
            <Header user={user} onLogout={logout} onToggle2FA={toggle2FA} />

            <div style={styles.body}>
                <div style={styles.videoContainer}>
                    <VideoPlayer stream={localStream} muted />
                    <VideoPlayer stream={remoteStream} muted={isRemoteMuted} />
                </div>

                <div style={styles.usersContainer}>
                    <h3>Онлайн ({onlineUsers.length})</h3>
                    <ul style={styles.userList}>
                        {onlineUsers.map((onlineUser) => (
                            <li key={onlineUser.id} style={styles.userItem}>
                                {onlineUser.username} ({onlineUser.id}) {onlineUser.inCall ? "В звонке" : ""}
                                {String(onlineUser.id) !== myId && (
                                    <button
                                        onClick={() => handleCall(String(onlineUser.id))}
                                        disabled={status !== "idle"}
                                        style={styles.callButton}
                                    >
                                        Позвонить
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <CallControls
                status={status}
                isAudioMuted={isAudioMuted}
                isVideoEnabled={isVideoEnabled}
                incomingCall={incomingCall}
                onAccept={handleAccept}
                onReject={handleReject}
                onHangUp={stopCall}
                onToggleAudio={toggleAudio}
                onToggleVideo={toggleVideo}
                myId={myId}
                onlineUsers={onlineUsers}
                onCall={handleCall}
            />
        </div>
    );
}

export function HomePage() {
    const { user } = useAuthContext();
    if (!user) {
        return <div>Loading...</div>;
    }
    return (
        <SocketProvider user={user}>
            <HomePageContent />
        </SocketProvider>
    );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    padding: 20,
  },
  body: {
    flex: 1,
    display: "flex",
    gap: 20,
  },
  videoContainer: {
    flex: 3,
    display: "flex",
    flexDirection: "row",
    gap: 10,
  },
  usersContainer: {
    flex: 1,
    borderLeft: "1px solid #eee",
    paddingLeft: 20,
  },
  userList: {
    listStyle: "none",
    padding: 0,
  },
  userItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
  },
  callButton: {
    padding: "5px 10px",
    background: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
};