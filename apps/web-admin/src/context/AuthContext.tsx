"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  license: string;
  specialty: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const loadAuth = () => {
      try {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('authUser');
        
        console.log('🔐 AuthContext - Loading from localStorage:', { 
          hasToken: !!storedToken, 
          hasUser: !!storedUser 
        });
        
        if (storedToken && storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
          try {
            const parsedUser = JSON.parse(storedUser);
            console.log('✅ AuthContext - User loaded:', parsedUser.name);
            setToken(storedToken);
            setUser(parsedUser);
          } catch (error) {
            console.error('❌ Error parsing user:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
          }
        } else {
          console.log('⚠️ AuthContext - No valid session found');
        }
      } catch (error) {
        console.error('❌ Error loading auth:', error);
      } finally {
        setLoading(false);
      }
    };

    // Pequeño delay para asegurar que localStorage esté disponible
    loadAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    console.log('🔐 AuthContext - Saving login:', { token: !!newToken, user: newUser });
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('authUser', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    console.log('✅ AuthContext - Login saved to localStorage');
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};