import React, { useState } from 'react';
import { useConference } from '../hooks/useConference';
import { VideoPlayer } from '../components/VideoPlayer';
import { useAuthContext } from "../hooks/useAuth.ts";
import {SocketProvider} from "../contexts/SocketProvider.tsx";

const ConferencePageContent: React.FC = () => {
    const [roomName, setRoomName] = useState('test-room');
    const [joined, setJoined] = useState(false);
    const { participants } = useConference(joined ? roomName : '');

    const handleJoin = () => {
        if (roomName.trim()) {
            setJoined(true);
        }
    };

    return (
        <div>
            <h1>Conference Page</h1>
            {!joined ? (
                <div>
                    <input
                        type="text"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="Enter room name"
                    />
                    <button onClick={handleJoin}>Join Room</button>
                </div>
            ) : (
                <div>
                    <h2>Room: {roomName}</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                        {Object.values(participants).map(p => (
                            <div key={p.id}>
                                <p>{p.name}</p>
                                <VideoPlayer stream={p.stream} muted={false} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const ConferencePage: React.FC = () => {
    const { user } = useAuthContext();
    if (!user) {
        return <div>Loading...</div>;
    }
    return (
        <SocketProvider user={user}>
            <ConferencePageContent />
        </SocketProvider>
    );
}

export default ConferencePage;
