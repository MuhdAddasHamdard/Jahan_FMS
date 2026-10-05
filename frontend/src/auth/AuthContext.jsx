import { useState, useMemo, useCallback, useEffect } from "react";
import { api, setAuthToken, setUnauthorizedHandler } from "../api/client";
import { AuthContext } from "./auth-context";

const TOKEN_STORAGE_KEY = "jahan_fms_token";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      if (!token) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const data = await api.get("/users/me");
        if (mounted && data?.user) {
          setUser(data.user);
        } else if (mounted) {
          setToken(null);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } catch {
        if (mounted) {
          setToken(null);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, [token]);

  const handleUnauthorized = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
  }, [handleUnauthorized]);

  const login = useCallback(async (email, password) => {
    const data = await api.post("/users/login", { email, password });

    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    setToken(data.token);
    setUser(data.user);

    return data.user;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }, []);

  const updateUser = useCallback(async (payload) => {
    const data = await api.patch("/users/me", payload);
    setUser((current) => ({ ...current, ...data }));
    return data;
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      updateUser,
      isAuthenticated: Boolean(user),
      isAdmin: Boolean(user && user.role === "ADMIN"),
      isFinance: Boolean(user && user.role === "FINANCE"),
      isTeacher: Boolean(user && user.role === "TEACHER"),
      isStudent: Boolean(user && user.role === "STUDENT"),
    }),
    [user, token, loading, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};