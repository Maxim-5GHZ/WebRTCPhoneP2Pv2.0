import { useRef, useEffect } from "react";

interface VideoPlayerProps {
  stream: MediaStream | null;
  muted?: boolean;
}

export function VideoPlayer({ stream, muted = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

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
