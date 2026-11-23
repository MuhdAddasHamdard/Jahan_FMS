import { useState, useMemo, useCallback, useEffect } from "react";
import { api, clearOfflineSession, setAuthToken, setUnauthorizedHandler } from "../api/client";
import { downloadOfflineLists } from "../api/offlineLists";
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
          downloadOfflineLists(data.user);
        } else if (mounted) {
          setToken(null);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } catch (error) {
        if (mounted) {
          setUser(null);
          if (error.status === 401) {
            setToken(null);
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          }
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
    clearOfflineSession();
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(null);
  }, [handleUnauthorized]);

  useEffect(() => {
    const restoreOnReconnect = async () => {
      if (!token) return;
      try {
        const { user: currentUser } = await api.get("/users/me");
        if (localStorage.getItem(TOKEN_STORAGE_KEY) === token) {
          setUser(currentUser);
          downloadOfflineLists(currentUser);
        }
      } catch {
        // The current offline session stays open if the API is still unreachable.
      }
    };
    const followOtherTabs = (event) => {
      if (event.key !== TOKEN_STORAGE_KEY || event.newValue === token) return;
      setAuthToken(event.newValue);
      setUser(null);
      setLoading(Boolean(event.newValue));
      setToken(event.newValue);
    };
    window.addEventListener("online", restoreOnReconnect);
    window.addEventListener("storage", followOtherTabs);
    return () => {
      window.removeEventListener("online", restoreOnReconnect);
      window.removeEventListener("storage", followOtherTabs);
    };
  }, [token]);

  const login = useCallback(async (email, password) => {
    const data = await api.post("/users/login", { email, password });

    setAuthToken(data.token);
    let profile;
    try {
      profile = await api.get("/users/me");
    } catch (error) {
      setAuthToken(null);
      throw error;
    }
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    setToken(data.token);
    setUser(profile.user);

    return profile.user;
  }, []);

  const logout = useCallback(() => {
    clearOfflineSession();
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }, []);

  const updateUser = useCallback(async (payload) => {
    const data = await api.patch("/users/me", payload);
    if (payload.password) logout();
    else setUser((current) => ({ ...current, ...data }));
    return data;
  }, [logout]);

  const hasPermission = useCallback(
    (permission) =>
      Boolean(
        user &&
          (user.role === "ADMIN" || user.permissions?.includes(permission)),
      ),
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      updateUser,
      hasPermission,
      isAuthenticated: Boolean(user),
      isAdmin: Boolean(user && user.role === "ADMIN"),
      isFinance: Boolean(user && user.role === "FINANCE"),
      isTeacher: Boolean(user && user.role === "TEACHER"),
      isStudent: Boolean(user && user.role === "STUDENT"),
    }),
    [user, token, loading, login, logout, updateUser, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
