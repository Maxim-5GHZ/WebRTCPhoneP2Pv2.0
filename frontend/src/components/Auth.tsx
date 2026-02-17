import { useAuthContext } from "../contexts/AuthProvider";
import { useNavigate } from "react-router-dom";

export function Auth({ mode }: { mode: "login" | "register" }) {
  const {
    loginInput,
    passwordInput,
    usernameInput,
    setAuthMode,
    setLoginInput,
    setPasswordInput,
    setUsernameInput,
    handleAuth,
  } = useAuthContext();
  const navigate = useNavigate();

  const handleSwitchMode = () => {
    if (mode === "login") {
      navigate("/register");
    } else {
      navigate("/login");
    }
  };

  return (
    <div style={styles.container}>
      <h2>{mode === "login" ? "Вход" : "Регистрация"}</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setAuthMode(mode);
          await handleAuth(e);
        }}
        style={styles.form}
      >
        {mode === "register" && (
          <input
            placeholder="Имя пользователя"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            style={styles.input}
            required
          />
        )}
        <input
          placeholder="Логин (email)"
          value={loginInput}
          onChange={(e) => setLoginInput(e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          style={styles.input}
          required
        />
        <button type="submit" style={styles.buttonPrimary}>
          {mode === "login" ? "Войти" : "Зарегистрироваться"}
        </button>
      </form>
      <p style={{ marginTop: 10 }}>
        {mode === "login" ? "Нет аккаунта?" : "Уже есть аккаунт?"}
        <button onClick={handleSwitchMode} style={styles.linkButton}>
          {mode === "login" ? "Создать" : "Войти"}
        </button>
      </p>
    </div>
  );
}

// Простые стили в объекте
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 400,
    margin: "50px auto",
    padding: 20,
    textAlign: "center",
    border: "1px solid #ccc",
    borderRadius: 8,
  },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  input: {
    padding: 10,
    borderRadius: 4,
    border: "1px solid #ccc",
    fontSize: 16,
  },
  buttonPrimary: {
    padding: 10,
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  linkButton: {
    background: "none",
    border: "none",
    color: "#007bff",
    cursor: "pointer",
    textDecoration: "underline",
  },
};