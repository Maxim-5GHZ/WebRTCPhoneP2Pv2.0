import { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { User } from "../types/types";

const API_URL = "/api/auth";

export const AuthContext = createContext<ReturnType<typeof useAuth> | null>(null);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginInput, setLoginInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [usernameInput, setUsernameInput] = useState(""); // Только для регистрации
  const [MfaRequired, setMfaRequired] = useState<boolean>(false)
  const [loginFor2FA, setLoginFor2FA] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);


  const handleAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
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

      if (!res.ok) {
        const errorText = await res.text();
        try {
          const errorData = JSON.parse(errorText);
          setError(errorData.message || 'An error occurred');
        } catch (e) {
          setError(errorText);
        }
        return null;
      }
      const data = await res.json();
      console.log('Server response:', data);
      if (data.message === '2FA_REQUIRED') {
        setMfaRequired(true)
        setLoginFor2FA(loginInput);
      } else {
        setUser(data);
        localStorage.setItem('token', data.token);
      }
      return data;
    } catch (err) {
      setError("Ошибка авторизации: " + err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [authMode, loginInput, passwordInput, usernameInput]);

  const verify2FA = useCallback(async (login:string, code: string) => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`${API_URL}/verify-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, code }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        try {
          const errorData = JSON.parse(errorText);
          setError(errorData.message || 'An error occurred');
        } catch (e) {
          setError(errorText);
        }
        return null;
      }

      const data = await res.json();
      setUser(data);
      setMfaRequired(false)
      localStorage.setItem('token', data.token);


      return data;
    } catch (err) {
      setError("Ошибка верификации 2FA: " + err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('token');
  }, []);

  const toggle2FA = useCallback(async () => {
    const token = localStorage.getItem('token');
    if(!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/toggle-2fa`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        setUser(prevUser => prevUser ? { ...prevUser, isTwoFactorEnabled: data.isTwoFactorEnabled } : null);
      }
    } catch (err) {
      setError("Ошибка при переключении 2FA: " + err);
    } finally {
      setLoading(false);
    }
  }, []);

  return useMemo(() => ({
    user,
    authMode,
    loginInput,
    passwordInput,
    usernameInput,
    MfaRequired,
    loginFor2FA,
    error,
    loading,
    setAuthMode,
    setLoginInput,
    setPasswordInput,
    setUsernameInput,
    handleAuth,
    logout,
    verify2FA,
    toggle2FA,
  }), [user, authMode, loginInput, passwordInput, usernameInput, MfaRequired, loginFor2FA, error, loading, handleAuth, logout, verify2FA, toggle2FA]);
}