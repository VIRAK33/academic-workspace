import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { X, CheckCircle2, ShieldCheck, Wifi, WifiOff, LogOut, Laptop, Smartphone } from 'lucide-react';

interface AuthModalProps {
  auth: ReturnType<typeof useAuth>;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ auth, onClose }) => {
  const {
    user,
    isLoggedIn,
    isOnline,
    isLoading,
    googleClientId,
    loginWithGoogleCredential,
    loginWithGoogleProfile,
    loginDevGuest,
    logout,
  } = auth;

  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);
  const [gsiReady, setGsiReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Initialize Google Identity Services button with polling to ensure script is loaded
  useEffect(() => {
    let active = true;

    const initGsi = () => {
      const google = (window as any).google;
      if (!active) return false;

      if (google?.accounts?.id && googleClientId && googleBtnRef.current) {
        try {
          google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response: any) => {
              if (response?.credential) {
                loginWithGoogleCredential(response.credential);
              }
            },
          });

          // Clear previous render to prevent duplicate buttons
          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = '';
          }

          // Note: width MUST be a numeric pixel value (e.g. 320), NOT a percentage like '100%'
          google.accounts.id.renderButton(googleBtnRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
          });

          setGsiReady(true);
          return true;
        } catch (err) {
          console.warn('Google Identity button initialization:', err);
        }
      }
      return false;
    };

    if (initGsi()) return;

    const interval = setInterval(() => {
      if (initGsi()) {
        clearInterval(interval);
      }
    }, 250);

    const timeout = setTimeout(() => clearInterval(interval), 8000);

    return () => {
      active = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [googleClientId, loginWithGoogleCredential]);

  const handleManualPrompt = () => {
    const google = (window as any).google;
    if (!google?.accounts) {
      alert('Google Sign-In is initializing. Please ensure you are online and try again.');
      return;
    }

    try {
      // 1. Always explicitly initialize client_id so it can NEVER be missing
      if (google.accounts.id) {
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: any) => {
            if (response?.credential) {
              loginWithGoogleCredential(response.credential);
            }
          },
        });
      }

      // 2. Prefer standard OAuth2 interactive popup if available
      if (google.accounts.oauth2?.initTokenClient) {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              try {
                const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                if (userRes.ok) {
                  const profile = (await userRes.json()) as any;
                  if (profile && profile.sub && profile.email) {
                    loginWithGoogleProfile(profile);
                  }
                }
              } catch (e) {
                console.error('Failed to retrieve user profile:', e);
              }
            }
          },
        });
        client.requestAccessToken({ prompt: 'select_account' });
        return;
      }

      // 3. Fallback to One Tap prompt
      if (google.accounts.id) {
        google.accounts.id.prompt();
      }
    } catch (err) {
      console.warn('Manual Google sign-in trigger:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs tracking-tight">
              AW
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Workspace Account & Cloud Sync
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Offline-First Local Mode · Cloudflare D1 Synchronization
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Status Banner */}
          <div className="rounded-lg p-3 border bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 flex items-start gap-3">
            <div
              className={`p-1.5 rounded-md shrink-0 mt-0.5 ${
                isOnline
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
              }`}
            >
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            </div>
            <div className="text-xs flex-1">
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>Network Status</span>
                <span
                  className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                    isOnline
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {isOnline ? 'Online' : 'Offline Mode'}
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                {isOnline
                  ? 'Connected to the cloud. Your workspace data syncs automatically with Cloudflare D1.'
                  : 'Working offline. All courses, schedules, and lab notes are safely preserved on this device.'}
              </p>
            </div>
          </div>

          {/* Account & Sync Section */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>Account Status</span>
              <span className="text-[10px] font-mono text-slate-400">
                {isLoggedIn ? 'Cloud Sync Enabled' : 'Local Storage Mode'}
              </span>
            </div>

            {isLoggedIn && user ? (
              /* Signed In Profile Card */
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name}
                        className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{user.name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[10px] font-mono">
                          {user.provider === 'google' ? 'Google' : 'Demo'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={logout}
                    className="px-2.5 py-1.5 rounded-md text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 transition flex items-center gap-1.5"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/60 pt-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Workspace data is linked to your Google identity.</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setSyncing(true);
                      const ok = await (auth as any).syncOfflineToCloud?.();
                      setSyncSuccess(ok);
                      setTimeout(() => setSyncSuccess(null), 3000);
                      setSyncing(false);
                    }}
                    disabled={syncing}
                    className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition shrink-0"
                  >
                    {syncing ? 'Syncing...' : syncSuccess ? 'Synced to Cloud! ✅' : 'Sync Local Data to Cloud'}
                  </button>
                </div>
              </div>
            ) : (
              /* Not Signed In (Ready for 1-Click Sign-In) */
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 space-y-3.5">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Sign In with Google for Cloud Sync
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Sync courses, tasks, and lab notes across devices, and enable background class push alerts.
                    </p>
                  </div>
                </div>

                {/* Official Google Identity Button */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 space-y-2.5">
                  <div
                    ref={googleBtnRef}
                    className="w-full min-h-[44px] flex items-center justify-center"
                  ></div>

                  {/* Fallback button if GIS button is loading or blocked by adblocker */}
                  {!gsiReady && (
                    <button
                      type="button"
                      onClick={handleManualPrompt}
                      className="w-full py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2.5 shadow-2xs transition"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Sign in with Google</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        loginDevGuest('Student Scholar', 'scholar@academic.edu');
                      }}
                      className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition"
                    >
                      <Laptop className="w-3.5 h-3.5 text-slate-500" />
                      <span>Use Demo Guest Profile</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PWA / Install Offline Guide */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 space-y-2 text-xs">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
              <span>Install PWA for 100% Offline App Access</span>
            </div>
            <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 list-disc list-inside">
              <li>
                <strong className="text-slate-700 dark:text-slate-300">Desktop (Chrome / Edge / Safari)</strong>: Click the install icon in your browser address bar.
              </li>
              <li>
                <strong className="text-slate-700 dark:text-slate-300">iPhone / iPad (Safari)</strong>: Tap Share <span className="font-mono">[⎋]</span> → <em>"Add to Home Screen"</em>.
              </li>
              <li>
                <strong className="text-slate-700 dark:text-slate-300">Android (Chrome)</strong>: Tap Menu <span className="font-mono">[⋮]</span> → <em>"Install App"</em>.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
