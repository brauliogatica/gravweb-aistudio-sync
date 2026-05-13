export function isLocalDevAuthEnabled() {
  if (typeof window === "undefined") return false;

  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

export const LOCAL_DEV_USER = {
  sub: "local-dev-user",
  name: "Gravitacional local",
  email: "local@gravitacional.dev",
};
