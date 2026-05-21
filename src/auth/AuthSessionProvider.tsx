import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Auth0Provider,
  type AppState,
  type RedirectLoginOptions,
  useAuth0,
} from "@auth0/auth0-react";
import {
  clearLocalAuthUser,
  getLocalAuthUser,
  saveLocalAuthUser,
  subscribeLocalAuth,
  type LocalAuthUser,
} from "./localAuthSession";

export interface AuthSessionUser {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
}

interface LoginOptions {
  returnTo?: string;
  screenHint?: "signup";
}

interface AuthSessionContextValue {
  user?: AuthSessionUser;
  userId?: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  source: "auth0" | "local-dev";
  login: (options?: LoginOptions) => Promise<void>;
  logout: () => void;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

const defaultAuth0Domain = "dev-cjqveyhkp561bx8d.us.auth0.com";
const defaultAuth0ClientId = "TXh13oNxc7PPup241n4c2Vt7gYqUDR2Y";

const auth0Domain =
  import.meta.env.VITE_AUTH0_DOMAIN?.trim() || defaultAuth0Domain;
const auth0ClientId =
  import.meta.env.VITE_AUTH0_CLIENT_ID?.trim() || defaultAuth0ClientId;
const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE?.trim() ?? "";

function isAuth0Enabled() {
  return Boolean(auth0Domain && auth0ClientId);
}

function getRedirectUri() {
  if (typeof window === "undefined") return undefined;
  return import.meta.env.VITE_AUTH0_REDIRECT_URI?.trim() || window.location.origin;
}

function normalizeLocalUser(user: LocalAuthUser | null): AuthSessionUser | undefined {
  if (!user) return undefined;
  return user;
}

function Auth0SessionBridge({ children }: { children: React.ReactNode }) {
  const auth0 = useAuth0();

  const login = useCallback(
    async (options?: LoginOptions) => {
      const authorizationParams: RedirectLoginOptions["authorizationParams"] = {};

      if (options?.screenHint) {
        authorizationParams.screen_hint = options.screenHint;
      }

      if (auth0Audience) {
        authorizationParams.audience = auth0Audience;
      }

      await auth0.loginWithRedirect({
        appState: { returnTo: options?.returnTo ?? "/analisis" },
        authorizationParams,
      });
    },
    [auth0]
  );

  const logout = useCallback(() => {
    auth0.logout({
      logoutParams: {
        returnTo: typeof window === "undefined" ? undefined : window.location.origin,
      },
    });
  }, [auth0]);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      user: auth0.user,
      userId: auth0.user?.sub,
      isAuthenticated: auth0.isAuthenticated,
      isLoading: auth0.isLoading,
      source: "auth0",
      login,
      logout,
    }),
    [auth0.isAuthenticated, auth0.isLoading, auth0.user, login, logout]
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

function LocalAuthSessionBridge({ children }: { children: React.ReactNode }) {
  const [localUser, setLocalUser] = useState(() => getLocalAuthUser());

  useEffect(() => {
    return subscribeLocalAuth(() => setLocalUser(getLocalAuthUser()));
  }, []);

  const login = useCallback(async () => {
    saveLocalAuthUser({
      name: "Gravitacional Local",
      email: "local@gravitacional.dev",
    });
  }, []);

  const logout = useCallback(() => clearLocalAuthUser(), []);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      user: normalizeLocalUser(localUser),
      userId: localUser?.sub,
      isAuthenticated: Boolean(localUser),
      isLoading: false,
      source: "local-dev",
      login,
      logout,
    }),
    [localUser, login, logout]
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  if (!isAuth0Enabled()) {
    return <LocalAuthSessionBridge>{children}</LocalAuthSessionBridge>;
  }

  return (
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      cacheLocation="localstorage"
      useRefreshTokens
      authorizationParams={{
        redirect_uri: getRedirectUri(),
        ...(auth0Audience ? { audience: auth0Audience } : {}),
      }}
      onRedirectCallback={(appState?: AppState) => {
        const returnTo =
          typeof appState?.returnTo === "string" ? appState.returnTo : "/analisis";
        window.history.replaceState({}, document.title, returnTo);
      }}
    >
      <Auth0SessionBridge>{children}</Auth0SessionBridge>
    </Auth0Provider>
  );
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error("useAuthSession debe usarse dentro de AuthSessionProvider");
  }
  return context;
}

export function getAuthMode() {
  return isAuth0Enabled() ? "auth0" : "local-dev";
}
