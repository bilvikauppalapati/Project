import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { TOKEN_KEY } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  const saveSession = useCallback(({ token: newToken, user: newUser }) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .get('/auth/me')
      .then((res) => !cancelled && setUser(res.user))
      .catch(() => !cancelled && logout())
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  useEffect(() => {
    window.addEventListener('pawshare:unauthorized', logout);
    return () => window.removeEventListener('pawshare:unauthorized', logout);
  }, [logout]);

  const login = useCallback(async (email, password) => saveSession(await api.post('/auth/login', { email, password })), [saveSession]);
  const register = useCallback(async (data) => saveSession(await api.post('/auth/register', data)), [saveSession]);

  const updateProfile = useCallback(async (data) => {
    const res = await api.patch('/auth/me', data);
    setUser(res.user);
    return res.user;
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.get('/auth/me');
    setUser(res.user);
    return res.user;
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, updateProfile, refreshUser, setUser }),
    [user, token, loading, login, register, logout, updateProfile, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
