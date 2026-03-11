import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { useAuthContext } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import type { User } from "../types/types";

const ConnectionTypes = {
    CONFERENCE: "CONFERENCE",
    P2P: "P2P",
    BROADCAST: "BROADCAST",
};

function StartMenuPage() {
    const { user, logout, toggle2FA } = useAuthContext();
    const { socket, sendSignal } = useSocket();
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (socket) {
            socket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.type === "user_list" && message.connectionType === selectedType) {
                    setUsers(message.users);
                }
            };
        }
    }, [socket, selectedType]);
    
    useEffect(() => {
        if (selectedType === ConnectionTypes.P2P) {
            navigate("/p2p");
        }
    }, [selectedType, navigate]);

    const handleSelectType = (type: string) => {
        setSelectedType(type);
        sendSignal({ type: "select_connection_type", connectionType: type });
    };

    const handleCall = (userId: number) => {
        navigate(`/conference/${userId}`);
    };

    const handleBroadcast = (isBroadcaster: boolean, roomName: string) => {
        navigate(`/broadcast/${roomName}`, { state: { isBroadcaster } });
    };

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div style={styles.container}>
            <Header user={user} onLogout={logout} onToggle2FA={toggle2FA} />
            <div style={styles.body}>
                {!selectedType ? (
                    <div style={styles.selectionContainer}>
                        <h2>Выберите тип соединения</h2>
                        <button onClick={() => handleSelectType(ConnectionTypes.CONFERENCE)} style={styles.button}>
                            Конференция
                        </button>
                        <button onClick={() => handleSelectType(ConnectionTypes.P2P)} style={styles.button}>
                            pure p2p
                        </button>
                        <button onClick={() => handleSelectType(ConnectionTypes.BROADCAST)} style={styles.button}>
                            turn p2p
                        </button>
                    </div>
                ) : (
                    <div style={styles.usersContainer}>
                        <button onClick={() => setSelectedType(null)} style={styles.backButton}>Назад</button>
                        <h3>Пользователи в ожидании ({users.length})</h3>
                        {selectedType === ConnectionTypes.BROADCAST && (
                            <button onClick={() => handleBroadcast(true, user.id.toString())} style={styles.callButton}>
                                Начать трансляцию
                            </button>
                        )}
                        <ul style={styles.userList}>
                            {users.map((u) => (
                                <li key={u.id} style={styles.userItem}>
                                    {u.username} {u.inCall ? "(В звонке)" : ""}
                                    {selectedType === ConnectionTypes.CONFERENCE && (
                                        <button onClick={() => handleCall(u.id)} style={styles.callButton}>
                                            Позвонить
                                        </button>
                                    )}
                                    {selectedType === ConnectionTypes.BROADCAST && u.inCall && (
                                        <button onClick={() => handleBroadcast(false, u.id.toString())} style={styles.callButton}>
                                            Смотреть
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StartMenuPage;

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
        justifyContent: "center",
        alignItems: "center",
    },
    selectionContainer: {
        display: "flex",
        flexDirection: "column",
        gap: 20,
    },
    button: {
        padding: "15px 30px",
        fontSize: "18px",
        cursor: "pointer",
        borderRadius: "8px",
        border: "1px solid #ccc",
        backgroundColor: "#f0f0f0",
    },
    usersContainer: {
        width: "100%",
        maxWidth: "600px",
    },
    userList: {
        listStyle: "none",
        padding: 0,
    },
    userItem: {
        padding: "10px",
        borderBottom: "1px solid #eee",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    backButton: {
        marginBottom: 20,
        padding: "10px 15px",
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