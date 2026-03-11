import React from 'react';
import { useBroadcast } from '../hooks/useBroadcast';
import { VideoPlayer } from '../components/VideoPlayer';
import { useParams, useLocation } from "react-router-dom";
import { CallControls } from '../components/CallControls';

const BroadcastPage: React.FC = () => {
    const { roomName } = useParams<{ roomName: string }>();
    const location = useLocation();
    const isBroadcaster = location.state?.isBroadcaster || false;
    const { 
        localStream, 
        peers, 
        addVideoElement,
        isAudioMuted,
        isVideoEnabled,
        isScreenSharing,
        toggleAudio,
        toggleVideo,
        toggleScreenSharing,
        stopBroadcast
    } = useBroadcast(roomName ?? "default-room", isBroadcaster);

    return (
        <div>
            <h1>Broadcast Page</h1>
            <h2>Room: {roomName}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                {isBroadcaster && localStream && (
                    <div key="local">
                        <p>You (Broadcaster)</p>
                        <VideoPlayer stream={localStream} muted={true} />
                    </div>
                )}
                {Object.keys(peers).map((peerId) => (
                    <div key={peerId}>
                        <p>{peerId}</p>
                        <video
                            ref={(videoElement) => {
                                if (videoElement) {
                                    addVideoElement(peerId, videoElement);
                                }
                            }}
                            autoPlay
                            playsInline
                            muted={false}
                        />
                    </div>
                ))}
            </div>
            {isBroadcaster && (
                 <CallControls 
                    status="connected"
                    onToggleAudio={toggleAudio}
                    onToggleVideo={toggleVideo}
                    onToggleScreenSharing={toggleScreenSharing}
                    onHangUp={stopBroadcast}
                    isAudioMuted={isAudioMuted}
                    isVideoEnabled={isVideoEnabled}
                    isScreenSharing={isScreenSharing}
                    // Dummy props to satisfy CallControls interface
                    myId=""
                    onlineUsers={[]}
                    incomingCall={null}
                    renegotiationRequired={false}
                    onCall={() => {}}
                    onAccept={() => {}}
                    onReject={() => {}}
                    onRenegotiate={() => {}}
                />
            )}
        </div>
    );
};

export default BroadcastPage;