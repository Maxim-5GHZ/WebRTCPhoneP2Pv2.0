import type { User } from "../types/types";

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onToggle2FA: () => void;
}

export function Header({ user, onLogout, onToggle2FA }: HeaderProps) {
  return (
    <header style={styles.header}>
      <div>
        <h3>Привет, {user.username}!</h3>
        <small>
          Роль: {user.role} | Логин: {user.login}
        </small>
      </div>
      <div>
        <button onClick={onToggle2FA} style={styles.buttonSecondary}>
          Переключить 2FA
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
  },
};
