import { useState, useEffect, useCallback } from 'react';
import { api, getStoredAuthToken, setStoredAuthToken } from '../api';

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

export const BUILTIN_GOOGLE_CLIENT_ID = '81962160390-rsfa5vfg71h2rk87i896ugqvekfcm2cu.apps.googleusercontent.com';

// Built-in Google Client ID (can be overridden via env)
const DEFAULT_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || BUILTIN_GOOGLE_CLIENT_ID;


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

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Online / Offline connectivity tracker
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  // Google Client ID initialized with project default
  const [googleClientId, setGoogleClientIdState] = useState<string>(() => {
    // Clear legacy or invalid client IDs from earlier testing
    try {
      localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
    } catch (e) {}
    return DEFAULT_CLIENT_ID;
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

  // Validate active session with backend on initial load
  useEffect(() => {
    const token = getStoredAuthToken();
    if (token) {
      api.getAuthMe().then((res) => {
        if (res.authenticated && res.user) {
          const updated: AuthUser = {
            id: res.user.id,
            email: res.user.email,
            name: res.user.name,
            picture: res.user.picture,
            provider: 'google',
            lastSyncedAt: new Date().toISOString(),
          };
          setUser(updated);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
        } else if (!res.authenticated) {
          // Token expired or invalid
          setStoredAuthToken(null);
        }
      }).catch(() => {});
    }
  }, []);

  const setGoogleClientId = useCallback((clientId: string) => {
    setGoogleClientIdState(clientId);
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId.trim());
  }, []);

  const loginWithGoogleCredential = useCallback(async (credential: string) => {
    setIsLoading(true);
    setAuthError(null);

    // 1. Fallback decode for instant optimistic UI
    const payload = decodeGoogleJwt(credential);
    if (!payload || !payload.email) {
      setAuthError('Invalid Google Credential received');
      setIsLoading(false);
      return false;
    }

    const optimisticUser: AuthUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture,
      provider: 'google',
      lastSyncedAt: new Date().toISOString(),
    };
    setUser(optimisticUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(optimisticUser));

    // 2. Authenticate with backend API & get JWT session token
    try {
      const res = await api.loginWithGoogle(credential, googleClientId);
      if (res.success && res.user) {
        const verifiedUser: AuthUser = {
          id: res.user.id,
          email: res.user.email,
          name: res.user.name,
          picture: res.user.picture,
          provider: 'google',
          lastSyncedAt: new Date().toISOString(),
        };
        setUser(verifiedUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(verifiedUser));
      } else if (res.error) {
        console.warn('Backend Google auth response:', res.error);
      }
    } catch (err: any) {
      console.warn('Cloud sync auth notice:', err);
    } finally {
      setIsLoading(false);
    }

    return true;
  }, [googleClientId]);

  const loginWithGoogleProfile = useCallback(async (profile: { sub: string; email: string; name?: string; picture?: string }) => {
    setIsLoading(true);
    setAuthError(null);

    const userObj: AuthUser = {
      id: profile.sub,
      email: profile.email,
      name: profile.name || profile.email.split('@')[0],
      picture: profile.picture,
      provider: 'google',
      lastSyncedAt: new Date().toISOString(),
    };
    setUser(userObj);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userObj));

    try {
      const res = await api.loginDemo(userObj.name, userObj.email);
      if (res.success && res.user) {
        userObj.id = res.user.id;
        setUser({ ...userObj });
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userObj));
      }
    } catch {} finally {
      setIsLoading(false);
    }
    return true;
  }, []);

  const loginDevGuest = useCallback(async (name = 'Student Scholar', email = 'scholar@academic.edu') => {
    setIsLoading(true);
    setAuthError(null);

    const guestUser: AuthUser = {
      id: 'usr_guest_' + Math.random().toString(36).substring(2, 9),
      name,
      email,
      provider: 'local_demo',
      lastSyncedAt: new Date().toISOString(),
    };
    setUser(guestUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(guestUser));

    try {
      const res = await api.loginDemo(name, email);
      if (res.success && res.user) {
        const confirmed: AuthUser = {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          provider: 'local_demo',
          lastSyncedAt: new Date().toISOString(),
        };
        setUser(confirmed);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(confirmed));
      }
    } catch {} finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setStoredAuthToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);

    // Revoke GIS prompt if present
    if (typeof (window as any).google?.accounts?.id?.disableAutoSelect === 'function') {
      (window as any).google.accounts.id.disableAutoSelect();
    }
  }, []);

  /**
   * Syncs offline localStorage workspace data into cloud D1 account
   */
  const syncOfflineToCloud = useCallback(async (): Promise<boolean> => {
    try {
      const OFFLINE_KEY = 'phd_workspace_offline_v1';
      const raw = localStorage.getItem(OFFLINE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        await api.restoreBackup(parsed);
        return true;
      }
    } catch (err) {
      console.error('Failed to sync offline workspace to cloud:', err);
    }
    return false;
  }, []);

  return {
    user,
    isLoggedIn: !!user,
    isLoading,
    authError,
    isOnline,
    googleClientId,
    setGoogleClientId,
    loginWithGoogleCredential,
    loginWithGoogleProfile,
    loginDevGuest,
    logout,
    syncOfflineToCloud,
    isAuthModalOpen,
    openAuthModal: () => setIsAuthModalOpen(true),
    closeAuthModal: () => setIsAuthModalOpen(false),
  };
}
