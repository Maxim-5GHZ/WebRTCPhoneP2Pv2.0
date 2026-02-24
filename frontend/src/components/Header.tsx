import type { User } from "../types/types";
import { Link } from "react-router-dom";
import { useSocket } from "../hooks/useSocket";

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onToggle2FA: () => void;
}

export function Header({ user, onLogout, onToggle2FA }: HeaderProps) {
  const { isReconnecting, reconnectAttempt } = useSocket();

  return (
    <header style={styles.header}>
      {isReconnecting && (
        <div style={styles.reconnectStatus}>
          Потеряно соединение с сервером. Пытаемся переподключиться... (попытка {reconnectAttempt})
        </div>
      )}
      <div>
        <h3>Привет, {user.username}!</h3>
        <small>
          Роль: {user.role} | Логин: {user.login}
        </small>
      </div>
      <div>
        {user.role === 'Admin' && (
          <Link to="/admin" style={styles.buttonSecondary}>
            Admin Panel
          </Link>
        )}
        <button onClick={onToggle2FA} style={styles.buttonSecondary}>
          {user.isTwoFactorEnabled ? "Отключить 2FA" : "Включить 2FA"}
        </button>
        <button onClick={onLogout} style={styles.buttonDanger}>
          Выйти
        </button>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #eee",
    paddingBottom: 10,
    marginBottom: 20,
    position: 'relative',
  },
  buttonDanger: {
    padding: "5px 10px",
    background: "#dc3545",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    marginLeft: 10,
  },
  buttonSecondary: {
    padding: "5px 10px",
    background: "#6c757d",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    textDecoration: 'none',
    marginRight: '10px'
  },
  reconnectStatus: {
    position: 'absolute',
    top: '-35px',
    left: 0,
    right: 0,
    background: '#ffc107',
    color: '#333',
    padding: '5px',
    textAlign: 'center',
    fontSize: '14px',
  }
};
