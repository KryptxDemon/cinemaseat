import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../api/client';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email?: string, name?: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_TOKEN_KEY = 'cinemaseat_auth_token';
const STORAGE_USER_KEY = 'cinemaseat_auth_user';

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth state from localStorage on startup
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
      const storedUserJson = localStorage.getItem(STORAGE_USER_KEY);

      if (storedToken && storedUserJson) {
        const parsedUser: User = JSON.parse(storedUserJson);
        setToken(storedToken);
        setUser(parsedUser);
        apiClient.setAuthToken(storedToken);
      }
    } catch (e) {
      console.warn('Failed to restore auth state from localStorage:', e);
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email?: string, name?: string) => {
    const userEmail = email || 'cinema.viewer@example.com';
    const userName = name || userEmail.split('@')[0] || 'Cinema Fan';
    const generatedToken = `mock_bearer_token_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

    const newUser: User = {
      id: `usr-${Date.now().toString(36)}`,
      email: userEmail,
      name: userName,
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80`,
    };

    setToken(generatedToken);
    setUser(newUser);
    apiClient.setAuthToken(generatedToken);

    try {
      localStorage.setItem(STORAGE_TOKEN_KEY, generatedToken);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(newUser));
    } catch {
      // ignore storage failure
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    apiClient.setAuthToken(null);

    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
    } catch {
      // ignore storage failure
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
