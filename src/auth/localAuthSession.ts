export interface LocalAuthUser {
  sub: string;
  name: string;
  email: string;
}

const STORAGE_KEY = "gravweb.currentUser";
const AUTH_EVENT = "gravweb-auth-changed";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildUserId(email: string) {
  return `local-user:${normalizeEmail(email)}`;
}

export function getLocalAuthUser(): LocalAuthUser | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as LocalAuthUser;
    if (!parsed.sub || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalAuthUser(input: {
  name: string;
  email: string;
}): LocalAuthUser {
  const email = normalizeEmail(input.email);
  const name = input.name.trim() || email.split("@")[0] || "Usuario local";
  const user = {
    sub: buildUserId(email),
    name,
    email,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: user }));
  return user;
}

export function saveDefaultLocalAuthUser() {
  return saveLocalAuthUser({
    name: "Gravitacional Local",
    email: "local@gravitacional.dev",
  });
}

export function clearLocalAuthUser() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

export function subscribeLocalAuth(listener: () => void) {
  window.addEventListener(AUTH_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(AUTH_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
