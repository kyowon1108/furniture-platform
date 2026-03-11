/**
 * Auth token storage helpers.
 * Use sessionStorage as the primary store and migrate legacy localStorage tokens.
 */

const TOKEN_KEY = 'token';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getAuthToken(): string | null {
  if (!isBrowser()) return null;

  const sessionToken = window.sessionStorage.getItem(TOKEN_KEY);
  if (sessionToken) {
    return sessionToken;
  }

  const legacyToken = window.localStorage.getItem(TOKEN_KEY);
  if (legacyToken) {
    window.sessionStorage.setItem(TOKEN_KEY, legacyToken);
    window.localStorage.removeItem(TOKEN_KEY);
    return legacyToken;
  }

  return null;
}

export function setAuthToken(token: string) {
  if (!isBrowser()) return;
  window.sessionStorage.setItem(TOKEN_KEY, token);
  window.localStorage.removeItem(TOKEN_KEY);
}

export function removeAuthToken() {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
}
