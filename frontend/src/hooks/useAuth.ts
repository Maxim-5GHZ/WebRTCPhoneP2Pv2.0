import { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import type { User } from "../types/types";

const API_URL = "/api/auth";

// Helper to decode JWT
function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
}

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
  const [loading, setLoading] = useState(true); // Start with loading true for initial auth check

  const processLoginResponse = useCallback((data: { token: string }) => {
    const decodedToken = decodeJwt(data.token);
    if (decodedToken) {
      const userData: User = {
        id: decodedToken.id,
        username: decodedToken.sub,
        login: decodedToken.login,
        role: decodedToken.roles[0], // Assuming the first role is the primary one
        token: data.token,
        isTwoFactorEnabled: decodedToken.isTwoFactorEnabled,
        activation: decodedToken.activation,
      };
      setUser(userData);
      localStorage.setItem('token', data.token);
    } else {
      setError("Failed to process user data from token.");
    }
  }, []);

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

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'An error occurred');
        return null;
      }
      
      if (data.message === '2FA_REQUIRED') {
        setMfaRequired(true)
        setLoginFor2FA(loginInput);
      } else if (data.token) {
        processLoginResponse(data);
      }
      return data;
    } catch (err) {
      setError("Ошибка авторизации: " + err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [authMode, loginInput, passwordInput, usernameInput, processLoginResponse]);

  const verify2FA = useCallback(async (login:string, code: string) => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`${API_URL}/verify-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, code }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'An error occurred');
        return null;
      }

      if(data.token) {
        setMfaRequired(false);
        processLoginResponse(data);
      }
      return data;
    } catch (err) {
      setError("Ошибка верификации 2FA: " + err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [processLoginResponse]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('token');
  }, []);

  // Check for existing token on initial load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      processLoginResponse({ token });
    }
    setLoading(false);
  }, [processLoginResponse]);

  const toggle2FA = useCallback(async () => {
    const token = localStorage.getItem('token');
    if(!token || !user) return; // Ensure user is not null

    const originalTwoFactorEnabled = user.isTwoFactorEnabled;
    setUser(prevUser => prevUser ? { ...prevUser, isTwoFactorEnabled: !originalTwoFactorEnabled } : null);

    try {
      setLoading(true);
      const res = await fetch(`/api/user/2fa/toggle`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
      } else {
        setUser(prevUser => prevUser ? { ...prevUser, isTwoFactorEnabled: originalTwoFactorEnabled } : null);
        const errorText = await res.text();
        const errorData = JSON.parse(errorText);
        setError(errorData.message || 'An error occurred');
        alert(errorData.message || 'An error occurred');
      }
    } catch (err) {
      setUser(prevUser => prevUser ? { ...prevUser, isTwoFactorEnabled: originalTwoFactorEnabled } : null);
      const errorMessage = "Ошибка при переключении 2FA: " + err;
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const isAdmin = useMemo(() => user?.role === 'Admin', [user]);

  return useMemo(() => ({
    user,
    isAdmin,
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
  }), [user, isAdmin, authMode, loginInput, passwordInput, usernameInput, MfaRequired, loginFor2FA, error, loading, handleAuth, logout, verify2FA, toggle2FA]);
}