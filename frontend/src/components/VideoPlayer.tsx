interface VideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  muted?: boolean;
}

export function VideoPlayer({
  videoRef,
  muted = false,
}: VideoPlayerProps) {
  return (
    <div style={styles.videoWrapper}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        style={styles.videoElement}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  videoWrapper: {
    position: "relative",
    width: 320,
    height: 240,
    background: "#000",
    borderRadius: 8,
    overflow: "hidden",
  },
  videoElement: { width: "100%", height: "100%", objectFit: "cover" },
};
