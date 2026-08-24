'use client';

import { useState, useEffect, useMemo, ReactNode } from 'react';
import SplashScreen from './SplashScreen';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import FloatingAdminChatButton from './FloatingAdminChatButton';
import { usePathname, useRouter } from 'next/navigation';
import { App as CapacitorApp } from '@capacitor/app';

// ─────────────────────────────────────────────────────────────
// Google Safe Wrapper — declared OUTSIDE ClientLayout to avoid
// "creating components during render" lint error.
// Dynamically imports @react-oauth/google only if clientId exists.
// ─────────────────────────────────────────────────────────────
interface GoogleSafeWrapperProps {
  clientId: string;
  children: ReactNode;
}

function GoogleSafeWrapper({ clientId, children }: GoogleSafeWrapperProps) {
  const [provider, setProvider] = useState<{ GoogleOAuthProvider: any } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!clientId) {
        if (!cancelled) setLoaded(true);
        return;
      }
      try {
        const mod = await import('@react-oauth/google');
        if (mod?.GoogleOAuthProvider && !cancelled) {
          setProvider({ GoogleOAuthProvider: mod.GoogleOAuthProvider });
        }
      } catch (err) {
        console.warn('[ClientLayout] Google OAuth provider unavailable:', err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  if (!loaded) return null;

  if (provider?.GoogleOAuthProvider) {
    try {
      const P = provider.GoogleOAuthProvider;
      return <P clientId={clientId}>{children}</P>;
    } catch (err) {
      console.warn('[ClientLayout] Failed to render GoogleOAuthProvider:', err);
    }
  }
  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────
// Safe storage helpers — all guarded against SSR and exceptions
// ─────────────────────────────────────────────────────────────
function safeLSGet(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch { return null; }
}
function safeLSSet(key: string, val: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, val);
  } catch { /* ignore */ }
}
function safeLSRemove(key: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  } catch { /* ignore */ }
}
function safeSSGet(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(key);
  } catch { return null; }
}

// Auth-free routes (no token/guest needed)
const AUTH_FREE = ['/login', '/register', '/complete-profile', '/forgot-password'];

function isAuthFree(path: string): boolean {
  return AUTH_FREE.includes(path);
}

// ─────────────────────────────────────────────────────────────
// Main ClientLayout component
// ─────────────────────────────────────────────────────────────
export default function ClientLayout({ children }: { children: ReactNode }) {
  // ─── HOOKS — declare ALL hooks BEFORE any early returns ───
  const pathname = usePathname();
  const router = useRouter();

  const [showSplash, setShowSplash] = useState(true);
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  // This useMemo MUST run before any early returns (hooks rules)
  const googleClientId: string = useMemo(() => {
    try {
      return String(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '');
    } catch {
      return '';
    }
  }, []);

  // ─── Auth check (runs AFTER hooks) ───
  const checkAuth = () => {
    try {
      if (typeof window === 'undefined') return;
      // Force wipe all old data once to bypass Android Auto Backup restoring old tokens
      if (!safeLSGet('eaqari_system_reset_v4')) {
        safeLSRemove('eaqari_local_users');
        safeLSRemove('eaqari_token');
        safeLSRemove('eaqari_user');
        safeLSSet('eaqari_system_reset_v4', 'true');
      }
      const token = safeLSGet('eaqari_token');
      // Check guest state from both in-memory and sessionStorage (survives navigation)
      const isGuest = ((window as any).__eaqariGuest === true) || safeSSGet('eaqari_guest') === 'true';
      if (isGuest) {
        (window as any).__eaqariGuest = true; // restore in-memory from session
      }
      setIsAuth(!!token || isGuest);
      setIsReady(true);
    } catch {
      setIsAuth(false);
      setIsReady(true);
    }
  };

  // ─── Effects ───
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).__fetchPatched) {
      const originalFetch = window.fetch;
      window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        const newInit = init || {};
        newInit.headers = {
          ...newInit.headers,
          'Bypass-Tunnel-Reminder': 'true',
          'ngrok-skip-browser-warning': 'true'
        };
        return originalFetch(input, newInit);
      };
      (window as any).__fetchPatched = true;
    }
    // Mark mounted after first client-side paint
    // NOTE: This warning exists in ESLint because setState directly in effect can
    // cascade, but for hydration guards it's the correct pattern — setTimeout defers it.
    const id = setTimeout(() => setMounted(true), 0);

    // Setup Android Back Button handling
    let listener: any = null;
    let lastBackPressed = 0;
    try {
      CapacitorApp.addListener('backButton', async ({ canGoBack }) => {
        const now = Date.now();
        if (!canGoBack || window.location.pathname === '/' || window.location.pathname === '/login') {
          if (now - lastBackPressed < 2000) {
            CapacitorApp.exitApp();
          } else {
            lastBackPressed = now;
            try {
              const { Toast } = await import('@capacitor/toast');
              await Toast.show({
                text: 'اضغط رجوع مرة اخري للخروج من التطبيق',
                duration: 'short'
              });
            } catch (e) {
              console.warn('[ClientLayout] Toast failed', e);
            }
          }
        } else {
          window.history.back();
        }
      }).then(l => listener = l);
    } catch (e) {
      console.warn('[ClientLayout] Capacitor App plugin failed to attach backButton listener', e);
    }

    return () => {
      clearTimeout(id);
      if (listener && typeof listener.remove === 'function') listener.remove();
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Show splash only once per app session - use sessionStorage for persistence across navigations
    try {
      const hasShownSplash = safeSSGet('eaqari_splash_shown') === 'true';
      if (hasShownSplash) {
        setShowSplash(false);
      }
    } catch { /* ignore */ }

    checkAuth();

    // Listen for login/logout events dispatched from login & register pages
    try {
      const onAuthChanged = () => checkAuth();
      window.addEventListener('auth-changed', onAuthChanged);
      return () => window.removeEventListener('auth-changed', onAuthChanged);
    } catch {
      return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, mounted]);

  useEffect(() => {
    if (!mounted || !isReady || isAuth === null) return;
    if (!isAuth && !isAuthFree(pathname)) {
      try {
        router.replace('/login');
      } catch {
        if (typeof window !== 'undefined') {
          window.location.replace('/login');
        }
      }
    }
  }, [mounted, isReady, isAuth, pathname, router]);

  const handleSplashFinish = () => {
    setShowSplash(false);
    try {
      // Use sessionStorage so splash doesn't repeat on navigation within same app session
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('eaqari_splash_shown', 'true');
        (window as any).__hasShownSplash = true;
      }
    } catch { /* ignore */ }
  };

  // ─── SSR Guard ───
  // Prevent interactive children from rendering on the server to avoid
  // hydration mismatches and localStorage access during SSR
  if (!mounted) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50" />
    );
  }

  if (showSplash) return <SplashScreen onFinish={handleSplashFinish} />;
  if (!isReady || isAuth === null) return null;

  if (!isAuth && !isAuthFree(pathname)) return null;

  const hideChrome = isAuthFree(pathname);

  return (
    <GoogleSafeWrapper clientId={googleClientId}>
      <div className="flex flex-col min-h-screen" style={{ paddingBottom: hideChrome ? 0 : 72 }}>
        {!hideChrome && <AppHeader />}
        {hideChrome ? (
          <>{children}</>
        ) : (
          <main className="flex-1 w-full max-w-md mx-auto px-4 py-4">
            {children}
          </main>
        )}
        {!hideChrome && <BottomNav />}

        {/* Floating Admin Chat Button - only for logged-in users */}
        {!hideChrome && isAuth && (
          <FloatingAdminChatButton />
        )}
      </div>
    </GoogleSafeWrapper>
  );
}
