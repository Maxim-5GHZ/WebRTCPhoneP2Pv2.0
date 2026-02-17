import { createContext, useContext, useState } from "react";
import type { UserData } from "../types/types";

const API_URL = "http://localhost:8080/api/auth";

export const AuthContext = createContext<ReturnType<typeof useAuth> | null>(null);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

export function useAuth() {
  const [user, setUser] = useState<UserData | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginInput, setLoginInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [usernameInput, setUsernameInput] = useState(""); // Только для регистрации

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === "login" ? "/login" : "/register";
    const body =
      authMode === "login"
        ? { login: loginInput, password: passwordInput }
        : {
            username: usernameInput,
            login: loginInput,
            password: passwordInput,
          };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(await res.text());

      const data: UserData = await res.json();
      setUser(data);
      return data;
    } catch (err) {
      alert("Ошибка авторизации: " + err);
      return null;
    }
  };

  const logout = () => {
    setUser(null);
  };

  return {
    user,
    authMode,
    loginInput,
    passwordInput,
    usernameInput,
    setAuthMode,
    setLoginInput,
    setPasswordInput,
    setUsernameInput,
    handleAuth,
    logout,
  };
}
