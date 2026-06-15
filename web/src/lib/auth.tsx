import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, User } from './api';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nawris_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((r) => setUser(r.user))
      .catch(() => localStorage.removeItem('nawris_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const r = await api.login(username, password);
    localStorage.setItem('nawris_token', r.token);
    setUser(r.user);
  }

  function logout() {
    localStorage.removeItem('nawris_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
