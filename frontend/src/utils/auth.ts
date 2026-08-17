export interface UserSession {
  id: number;
  full_name: string;
  phone: string;
  role: 'User' | 'Admin' | 'Moderator' | 'Super Admin' | 'Owner' | string;
  governorate?: string;
  city?: string;
  [key: string]: any;
}

function safeGetItem(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
      return null;
    }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors (quota, private mode, etc.)
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

export function saveSession(token: string, user: UserSession) {
  safeSetItem('eaqari_token', token);
  safeSetItem('eaqari_user', JSON.stringify(user));
}

export function getSession(): { token: string | null; user: UserSession | null } {
  const token = safeGetItem('eaqari_token');
  const userJson = safeGetItem('eaqari_user');
  let user: UserSession | null = null;
  if (userJson) {
    try {
      user = JSON.parse(userJson);
    } catch {
      // Corrupted JSON — clear it
      safeRemoveItem('eaqari_token');
      safeRemoveItem('eaqari_user');
      return { token: null, user: null };
    }
  }
  return { token, user };
}

export function clearSession() {
  safeRemoveItem('eaqari_token');
  safeRemoveItem('eaqari_user');
}

export function isLoggedIn(): boolean {
  return safeGetItem('eaqari_token') !== null;
}
