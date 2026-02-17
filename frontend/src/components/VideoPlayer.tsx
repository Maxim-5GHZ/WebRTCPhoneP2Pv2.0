interface VideoPlayerProps {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
}

export function VideoPlayer({
  localVideoRef,
  remoteVideoRef,
}: VideoPlayerProps) {
  return (
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
  );
}

const styles: Record<string, React.CSSProperties> = {
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
};
