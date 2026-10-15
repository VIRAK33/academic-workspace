import { useState, useEffect, useCallback } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'google' | 'local_demo';
  lastSyncedAt?: string;
}

const AUTH_STORAGE_KEY = 'phd_auth_user';
const CLIENT_ID_STORAGE_KEY = 'phd_google_client_id';

// Default / fallback Client ID (can be overridden via env or user input)
const DEFAULT_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';

/**
 * Decodes a standard Google Identity Services JWT credential payload
 */
function decodeGoogleJwt(token: string): { sub: string; email: string; name: string; picture?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to parse Google JWT payload:', err);
    return null;
  }
}

export function useAuth() {
  // Persistent user state
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  // Online / Offline connectivity tracker
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  // Configurable Google Client ID
  const [googleClientId, setGoogleClientIdState] = useState<string>(() => {
    return localStorage.getItem(CLIENT_ID_STORAGE_KEY) || DEFAULT_CLIENT_ID;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Monitor network online / offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setGoogleClientId = useCallback((clientId: string) => {
    setGoogleClientIdState(clientId);
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId.trim());
  }, []);

  const loginWithGoogleCredential = useCallback((credential: string) => {
    const payload = decodeGoogleJwt(credential);
    if (!payload || !payload.email) {
      console.error('Invalid Google Credential received');
      return false;
    }

    const newUser: AuthUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture,
      provider: 'google',
      lastSyncedAt: new Date().toISOString(),
    };

    setUser(newUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    return true;
  }, []);

  const loginDevGuest = useCallback((name = 'Student Scholar', email = 'scholar@academic.edu') => {
    const guestUser: AuthUser = {
      id: 'usr_guest_' + Math.random().toString(36).substring(2, 9),
      name,
      email,
      provider: 'local_demo',
      lastSyncedAt: new Date().toISOString(),
    };
    setUser(guestUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(guestUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // Revoke GIS prompt if present
    if (typeof (window as any).google?.accounts?.id?.disableAutoSelect === 'function') {
      (window as any).google.accounts.id.disableAutoSelect();
    }
  }, []);

  return {
    user,
    isLoggedIn: !!user,
    isOnline,
    googleClientId,
    setGoogleClientId,
    loginWithGoogleCredential,
    loginDevGuest,
    logout,
    isAuthModalOpen,
    openAuthModal: () => setIsAuthModalOpen(true),
    closeAuthModal: () => setIsAuthModalOpen(false),
  };
}
