import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserPublic } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: UserPublic | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (ident: string, pass: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  quickDemoLogin: (role: 'admin' | 'organizer' | 'judge1' | 'judge2' | 'judge3' | 'participant' | 'alice' | 'charlie') => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserPublic | null>(() => {
    const cached = localStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  useEffect(() => {
    const handleLogoutEvent = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth-logout', handleLogoutEvent);
    return () => window.removeEventListener('auth-logout', handleLogoutEvent);
  }, []);

  const login = async (ident: string, pass: string) => {
    const res = await authApi.login(ident, pass);
    localStorage.setItem('token', res.access_token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setToken(res.access_token);
    setUser(res.user);
  };

  const register = async (data: any) => {
    const res = await authApi.register(data);
    localStorage.setItem('token', res.access_token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setToken(res.access_token);
    setUser(res.user);
  };

  const quickDemoLogin = async (role: 'admin' | 'organizer' | 'judge1' | 'judge2' | 'judge3' | 'participant' | 'alice' | 'charlie') => {
    const creds: Record<string, { u: string; p: string }> = {
      admin: { u: 'admin@example.local', p: 'DemoPassword123!' },
      organizer: { u: 'organizer@example.local', p: 'DemoPassword123!' },
      judge1: { u: 'judge1@example.local', p: 'DemoPassword123!' },
      judge2: { u: 'judge2@example.local', p: 'DemoPassword123!' },
      judge3: { u: 'judge3@example.local', p: 'DemoPassword123!' },
      participant: { u: 'participant@example.local', p: 'DemoPassword123!' },
      alice: { u: 'alice@example.local', p: 'DemoPassword123!' },
      charlie: { u: 'charlie@example.local', p: 'DemoPassword123!' },
    };
    const target = creds[role];
    if (target) {
      await login(target.u, target.p);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const me = await authApi.getMe();
        setUser(me);
        localStorage.setItem('user', JSON.stringify(me));
      } catch (err) {
        logout();
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        register,
        quickDemoLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
