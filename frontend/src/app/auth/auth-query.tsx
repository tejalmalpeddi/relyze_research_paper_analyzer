'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserLogin, UserProfile, UserEdit, AuthContextType } from './auth-types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BASE_URL = 'http://localhost:8000';

const requestWrapper = async <TResponse, TBody = undefined>(
  url: string,
  method: string,
  body?: TBody
): Promise<TResponse> => {
  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'requestWrapper failed');
  return data;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await requestWrapper<UserProfile>('/auth/get-user-details', 'GET');
      setUser(data);
      setError(null);
    } catch (err: any) {
      setUser(null);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  //auth functions
  const signup = async (logincredentials: UserEdit) => {
    return requestWrapper('/auth/signup', 'POST', logincredentials);
  };

  const login = async (logincredentials: UserLogin) => {
    const res = await requestWrapper('/auth/login', 'POST', logincredentials);
    await fetchUser();
    return res;
  };

  const logout = async () => {
    const res = await requestWrapper('/auth/logout', 'POST');
    setUser(null);
    return res;
  };

  const loginAnonymously = async () => {
    const res = await requestWrapper('/auth/login-anonymous', 'POST');
    await fetchUser();
    return res;
  };

  const editUser = async (dataUpdate: UserEdit) => {
    const res = await requestWrapper('/auth/edit-user', 'PUT', dataUpdate);
    await fetchUser();
    return res;
  };

  const deleteUser = async () => {
    const res = await requestWrapper('/auth/delete-user', 'POST');
    setUser(null);
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        isAuthenticated: !!user,
        signup,
        login,
        loginAnonymously,
        logout,
        editUser,
        deleteUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('AuthContext Error!!!!!!');
  }
  return context;
}