import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { X, CheckCircle2, ShieldCheck, Wifi, WifiOff, LogOut, Laptop, Key, Smartphone, HelpCircle } from 'lucide-react';

interface AuthModalProps {
  auth: ReturnType<typeof useAuth>;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ auth, onClose }) => {
  const {
    user,
    isLoggedIn,
    isOnline,
    googleClientId,
    setGoogleClientId,
    loginWithGoogleCredential,
    loginDevGuest,
    logout,
  } = auth;

  const [inputClientId, setInputClientId] = useState(googleClientId);
  const [showClientIdConfig, setShowClientIdConfig] = useState(false);
  const [copiedClientId, setCopiedClientId] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Initialize Google Identity Services button if available
  useEffect(() => {
    const google = (window as any).google;
    if (google && google.accounts && google.accounts.id && googleClientId && googleBtnRef.current) {
      try {
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: any) => {
            if (response?.credential) {
              loginWithGoogleCredential(response.credential);
            }
          },
        });

        google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'signin_with',
          shape: 'rectangular',
        });
      } catch (err) {
        console.warn('Google Identity button initialization:', err);
      }
    }
  }, [googleClientId, loginWithGoogleCredential]);

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleClientId(inputClientId);
    setShowClientIdConfig(false);
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
                Offline-First Local Mode · Optional Google Sign-In
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
            <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${
              isOnline ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
            }`}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            </div>
            <div className="text-xs flex-1">
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>Network Status</span>
                <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                  isOnline
                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                }`}>
                  {isOnline ? 'Online' : 'Offline Mode'}
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                {isOnline
                  ? 'Connected to the internet. Local data is ready to sync with your Google account.'
                  : 'You are currently working offline. All courses, tasks, and lab notes are safely stored on this device.'}
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
                      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{user.name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[10px] font-mono">
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

                <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/60 pt-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Your workspace data is linked to your Google identity. Local changes will sync when online.</span>
                </div>
              </div>
            ) : (
              /* Not Signed In (Local Mode Only) */
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 space-y-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      100% Usable Offline (No Login Required)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      You are using Academic Workspace in local device mode. All schedules, courses, tasks, and notes are saved directly in your browser.
                    </p>
                  </div>
                </div>

                {/* Google Sign-In Container */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                  <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    Connect Google Account (Optional Cloud Sync):
                  </div>

                  {/* Container where GIS renders the official Google Button */}
                  <div ref={googleBtnRef} className="w-full flex justify-center py-1"></div>

                  {/* Fallback & 1-Click Sign-In Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        loginDevGuest('Student Scholar', 'scholar@academic.edu');
                      }}
                      className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition"
                    >
                      <Laptop className="w-3.5 h-3.5 text-slate-500" />
                      <span>Use Demo Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowClientIdConfig(!showClientIdConfig)}
                      className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition"
                    >
                      <Key className="w-3.5 h-3.5 text-slate-500" />
                      <span>Configure Google OAuth</span>
                    </button>
                  </div>

                  {/* Expandable Google Client ID configuration */}
                  {showClientIdConfig && (
                    <form onSubmit={handleSaveClientId} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Google OAuth 2.0 Client ID:
                        </label>
                        <input
                          type="text"
                          value={inputClientId}
                          onChange={(e) => setInputClientId(e.target.value)}
                          placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                          className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400">
                          Create one in Google Cloud Console
                        </span>
                        <button
                          type="submit"
                          className="px-3 py-1 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium"
                        >
                          Save Client ID
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PWA / Install Offline Guide */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 space-y-2 text-xs">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
              <span>Install PWA for 100% Offline App Access</span>
            </div>
            <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 list-disc list-inside">
              <li><strong className="text-slate-700 dark:text-slate-300">Desktop (Chrome / Edge / Safari)</strong>: Click the install icon in your browser address bar.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">iPhone / iPad (Safari)</strong>: Tap Share <span className="font-mono">[⎋]</span> → <em>"Add to Home Screen"</em>.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Android (Chrome)</strong>: Tap Menu <span className="font-mono">[⋮]</span> → <em>"Install App"</em>.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-mono text-slate-400">
            Storage: Browser LocalStorage + ServiceWorker
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
