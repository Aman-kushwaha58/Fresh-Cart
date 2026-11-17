import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { apiRequest, setAuthTokenProvider } from '../services/api.ts';
import { UserProfile } from '../types/index.ts';

const SESSION_KEY = 'freshcart_session_token';

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  loginWithEmail: (email: string, password: string, rememberMe?: boolean) => Promise<UserProfile>;
  registerWithEmail: (
    fullName: string,
    email: string,
    password: string
  ) => Promise<{ user: UserProfile; verificationPath: string; message: string }>;
  loginWithGoogle: () => Promise<UserProfile>;
  verifyEmailToken: (token: string) => Promise<{ user: UserProfile; message: string }>;
  resendVerification: (email: string) => Promise<{ message: string; verificationPath?: string }>;
  refreshProfile: () => Promise<UserProfile | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredSessionToken(): string | null {
  return localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
}

function storeSessionToken(token: string, rememberMe = true) {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  if (rememberMe) {
    localStorage.setItem(SESSION_KEY, token);
  } else {
    sessionStorage.setItem(SESSION_KEY, token);
  }
}

function clearStoredSessionToken() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const firebaseUserRef = useRef<FirebaseUser | null>(null);

  const getToken = useCallback(async (): Promise<string | null> => {
    const localToken = getStoredSessionToken();
    if (localToken) return localToken;
    if (firebaseUserRef.current) {
      return await firebaseUserRef.current.getIdToken();
    }
    return null;
  }, []);

  useEffect(() => {
    setAuthTokenProvider(getToken);
  }, [getToken]);

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      return null;
    }
    try {
      const data = await apiRequest<{ user: UserProfile }>('/api/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      clearStoredSessionToken();
      setUser(null);
      return null;
    }
  }, [getToken]);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      firebaseUserRef.current = fbUser;
      const localToken = getStoredSessionToken();

      if (localToken || fbUser) {
        await refreshProfile();
      } else if (active) {
        setUser(null);
      }

      if (active) {
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [refreshProfile]);

  const loginWithEmail = async (
    email: string,
    password: string,
    rememberMe = true
  ): Promise<UserProfile> => {
    const data = await apiRequest<{ token: string; user: UserProfile }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, rememberMe }),
      }
    );
    storeSessionToken(data.token, rememberMe);
    setUser(data.user);
    return data.user;
  };

  const registerWithEmail = async (
    fullName: string,
    email: string,
    password: string
  ) => {
    return apiRequest<{ user: UserProfile; verificationPath: string; message: string }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password }),
      }
    );
  };

  const loginWithGoogle = async (): Promise<UserProfile> => {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    firebaseUserRef.current = cred.user;
    clearStoredSessionToken();
    const profile = await refreshProfile();
    if (!profile) {
      throw new Error('Failed to synchronize Google account with FreshCart.');
    }
    return profile;
  };

  const verifyEmailToken = async (token: string) => {
    const data = await apiRequest<{ token: string; user: UserProfile; message: string }>(
      '/api/auth/verify-email',
      {
        method: 'POST',
        body: JSON.stringify({ token }),
      }
    );
    storeSessionToken(data.token, true);
    setUser(data.user);
    return { user: data.user, message: data.message };
  };

  const resendVerification = async (email: string) => {
    return apiRequest<{ message: string; verificationPath?: string }>(
      '/api/auth/resend-verification',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
  };

  const logout = async () => {
    clearStoredSessionToken();
    if (firebaseUserRef.current) {
      await firebaseSignOut(auth);
      firebaseUserRef.current = null;
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        isVerified: Boolean(user?.emailVerified),
        isAdmin: user?.role === 'admin',
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        verifyEmailToken,
        resendVerification,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
