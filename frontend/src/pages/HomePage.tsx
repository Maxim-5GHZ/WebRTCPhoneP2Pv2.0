import { useRef } from "react";
import { useAuthContext } from "../hooks/useAuth";
import { useWebRTC } from "../hooks/useWebRTC";
import { Header } from "../components/Header";
import { VideoPlayer } from "../components/VideoPlayer";
import { CallControls } from "../components/CallControls";
import { SocketProvider } from "../contexts/SocketProvider";

function HomePageContent() {
  const { user, logout } = useAuthContext();
  const localVideoRef = useRef<HTMLVideoElement>(null!);
  const remoteVideoRef = useRef<HTMLVideoElement>(null!);
  const {
    myId,
    status,
    incomingCall,
    isAudioMuted,
    isVideoEnabled,
    handleCall,
    handleAccept,
    handleReject,
    toggleAudio,
    toggleVideo,
  } = useWebRTC(localVideoRef, remoteVideoRef);

  if (!user) {
    return null; // Or a loading indicator
  }

  return (
    <div style={styles.appContainer}>
      <Header user={user} onLogout={logout} />
      <VideoPlayer
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
      />
      <CallControls
        status={status}
        myId={myId}
        incomingCall={incomingCall}
        onCall={handleCall}
        onAccept={handleAccept}
        onReject={handleReject}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        isAudioMuted={isAudioMuted}
        isVideoEnabled={isVideoEnabled}
      />
    </div>
  );
}

function HomePage() {
  const { user } = useAuthContext();

  return (
    <SocketProvider user={user}>
      <HomePageContent />
    </SocketProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    maxWidth: 800,
    margin: "0 auto",
    padding: 20,
    fontFamily: "sans-serif",
  },
};

export default HomePage;