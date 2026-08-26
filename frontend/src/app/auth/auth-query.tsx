"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthMessageResponse, UserLogin, UserProfile, UserEdit, AuthContextType } from './auth-types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BASE_URL = 'http://localhost:8000';

function toError(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error : new Error(fallbackMessage);
}

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
    } catch (err: unknown) {
      setUser(null);
      setError(toError(err, 'Failed to fetch user'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    requestWrapper<UserProfile>('/auth/get-user-details', 'GET')
      .then((data) => {
        if (!isActive) return;
        setUser(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!isActive) return;
        setUser(null);
        setError(toError(err, 'Failed to fetch user'));
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const signup = async (logincredentials: UserLogin) => {
    return requestWrapper<AuthMessageResponse, UserLogin>('/auth/signup', 'POST', logincredentials);
  };

  const login = async (logincredentials: UserLogin) => {
    const res = await requestWrapper<AuthMessageResponse, UserLogin>('/auth/login', 'POST', logincredentials);
    await fetchUser();
    return res;
  };

  const logout = async () => {
    const res = await requestWrapper<AuthMessageResponse>('/auth/logout', 'POST');
    setUser(null);
    return res;
  };

  const loginAnonymously = async () => {
    const res = await requestWrapper<AuthMessageResponse>('/auth/login-anonymous', 'POST');
    await fetchUser();
    return res;
  };

  const editUser = async (dataUpdate: UserEdit) => {
    const res = await requestWrapper<AuthMessageResponse, UserEdit>('/auth/edit-user', 'PUT', dataUpdate);
    if (!dataUpdate.password) {
      await fetchUser();
    }
    return res;
  };

  const deleteUser = async (logincredentials: UserLogin) => {
    await requestWrapper<AuthMessageResponse, UserLogin>('/auth/login', 'POST', logincredentials);
    const res = await requestWrapper<AuthMessageResponse>('/auth/delete-user', 'POST');
    setUser(null);
    return res;
  };

  const requestPasswordReset = async (email: string) => {
    return requestWrapper<AuthMessageResponse, { email: string }>(
      '/auth/forgot-password-request',
      'POST',
      { email }
    );
  };

  const recoveryCode = async (email: string, code: string) => {
    const res = await requestWrapper<AuthMessageResponse, { email: string; token: string }>(
      '/auth/recovery-code',
      'POST',
      { email: email, token: code }
    );
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
        requestPasswordReset,
        recoveryCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
