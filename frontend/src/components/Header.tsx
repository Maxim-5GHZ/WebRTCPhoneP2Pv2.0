import type { User } from "../types/types";

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  return (
    <header style={styles.header}>
      <div>
        <h3>Привет, {user.username}!</h3>
        <small>
          Роль: {user.role} | Логин: {user.login}
        </small>
      </div>
      <button onClick={onLogout} style={styles.buttonDanger}>
        Выйти
      </button>
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
  },
};
