import { createContext, useContext, useEffect, useState } from "react";
import { request } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cc_user")) || null; } catch { return null; }
  });
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem("cc_token")));

  useEffect(() => {
    const token = localStorage.getItem("cc_token");
    if (!token) return;
    request({ url: "/auth/me", method: "GET" })
      .then((d) => setUser(d.user))
      .catch(() => { localStorage.removeItem("cc_token"); localStorage.removeItem("cc_user"); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const d = await request({ url: "/auth/login", method: "POST", data: { email, password } });
    localStorage.setItem("cc_token", d.token);
    localStorage.setItem("cc_user", JSON.stringify(d.user));
    setUser(d.user);
    return d.user;
  };

  const register = async (data) => {
    const d = await request({ url: "/auth/register", method: "POST", data });
    localStorage.setItem("cc_token", d.token);
    localStorage.setItem("cc_user", JSON.stringify(d.user));
    setUser(d.user);
    return d.user;
  };

  const logout = () => {
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser((current) => {
      const next = { ...current, ...updates };
      localStorage.setItem("cc_user", JSON.stringify(next));
      return next;
    });
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);