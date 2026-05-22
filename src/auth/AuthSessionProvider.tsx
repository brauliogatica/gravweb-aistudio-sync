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
const AUTH0_PREVIEW_SESSION_KEY = "gravweb.auth0PreviewSession";
const AUTH0_PREVIEW_RETURN_TO_KEY = "gravweb.auth0PreviewReturnTo";
const AUTH0_PREVIEW_EVENT = "gravweb-auth0-preview-session";
const AUTH0_PREVIEW_MESSAGE = "gravweb-auth0-preview-authenticated";

function isAuth0Enabled() {
  return Boolean(auth0Domain && auth0ClientId);
}

function getRedirectUri() {
  if (typeof window === "undefined") return undefined;
  return import.meta.env.VITE_AUTH0_REDIRECT_URI?.trim() || window.location.origin;
}

function isEmbeddedPreview() {
  if (typeof window === "undefined") return false;

  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isAiStudioRuntime() {
  if (typeof window === "undefined") return false;

  const { hostname, ancestorOrigins } = window.location;
  const isPreviewHost =
    hostname === "aistudio.google.com" ||
    hostname.endsWith(".run.app") ||
    hostname.endsWith(".googleusercontent.com");
  const hasAiStudioAncestor =
    Boolean(ancestorOrigins) &&
    Array.from(ancestorOrigins).some((origin) =>
      origin.includes("aistudio.google.com")
    );

  return isEmbeddedPreview() || isPreviewHost || hasAiStudioAncestor;
}

function pickAuthUser(user: AuthSessionUser | undefined): AuthSessionUser | undefined {
  if (!user) return undefined;

  return {
    sub: user.sub,
    name: user.name,
    email: user.email,
    picture: user.picture,
  };
}

function getStoredPreviewReturnTo() {
  if (typeof window === "undefined") return "/analisis";
  return window.sessionStorage.getItem(AUTH0_PREVIEW_RETURN_TO_KEY) || "/analisis";
}

function rememberPreviewReturnTo(returnTo: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AUTH0_PREVIEW_RETURN_TO_KEY, returnTo);
}

function clearPreviewReturnTo() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(AUTH0_PREVIEW_RETURN_TO_KEY);
}

function loadPreviewSession(): AuthSessionUser | undefined {
  if (typeof window === "undefined") return undefined;

  const raw = window.localStorage.getItem(AUTH0_PREVIEW_SESSION_KEY);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as AuthSessionUser;
    return parsed.sub || parsed.email ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function savePreviewSession(user: AuthSessionUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH0_PREVIEW_SESSION_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent(AUTH0_PREVIEW_EVENT));
}

function clearPreviewSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH0_PREVIEW_SESSION_KEY);
  window.dispatchEvent(new CustomEvent(AUTH0_PREVIEW_EVENT));
}

async function openAuthUrl(url: string) {
  if (typeof window === "undefined") return;

  window.location.assign(url);
}

function openUrlInCurrentWindow(url: string) {
  if (typeof window === "undefined") return;
  window.location.assign(url);
}

function normalizeLocalUser(user: LocalAuthUser | null): AuthSessionUser | undefined {
  if (!user) return undefined;
  return user;
}

function Auth0SessionBridge({ children }: { children: React.ReactNode }) {
  const auth0 = useAuth0();
  const [previewUser, setPreviewUser] = useState(() => loadPreviewSession());

  useEffect(() => {
    const updatePreviewSession = () => setPreviewUser(loadPreviewSession());

    window.addEventListener(AUTH0_PREVIEW_EVENT, updatePreviewSession);
    window.addEventListener("storage", updatePreviewSession);

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const payload = event.data as
        | {
            type?: string;
            returnTo?: string;
            user?: AuthSessionUser;
          }
        | undefined;

      if (payload?.type !== AUTH0_PREVIEW_MESSAGE || !payload.user) return;

      savePreviewSession(payload.user);
      window.location.assign(payload.returnTo || "/analisis");
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener(AUTH0_PREVIEW_EVENT, updatePreviewSession);
      window.removeEventListener("storage", updatePreviewSession);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    if (!auth0.isAuthenticated || !auth0.user || isAiStudioRuntime()) return;
    if (!window.opener || window.opener.closed) return;

    const returnTo = getStoredPreviewReturnTo();
    const user = pickAuthUser(auth0.user);
    if (!user) return;

    savePreviewSession(user);
    clearPreviewReturnTo();
    window.opener.postMessage(
      {
        type: AUTH0_PREVIEW_MESSAGE,
        returnTo,
        user,
      },
      window.location.origin
    );

    window.setTimeout(() => window.close(), 350);
  }, [auth0.isAuthenticated, auth0.user]);

  const login = useCallback(
    async (options?: LoginOptions) => {
      const returnTo = options?.returnTo ?? "/analisis";
      const authorizationParams: RedirectLoginOptions["authorizationParams"] = {};

      if (options?.screenHint) {
        authorizationParams.screen_hint = options.screenHint;
      }

      if (auth0Audience) {
        authorizationParams.audience = auth0Audience;
      }

      if (isAiStudioRuntime()) {
        rememberPreviewReturnTo(returnTo);

        try {
          await auth0.loginWithPopup(
            {
              authorizationParams: {
                ...authorizationParams,
                redirect_uri: getRedirectUri(),
              },
            },
            {
              timeoutInSeconds: 180,
            }
          );

          const claims = await auth0.getIdTokenClaims();
          const user = pickAuthUser({
            sub: claims?.sub ?? auth0.user?.sub,
            name:
              typeof claims?.name === "string"
                ? claims.name
                : auth0.user?.name,
            email:
              typeof claims?.email === "string"
                ? claims.email
                : auth0.user?.email,
            picture:
              typeof claims?.picture === "string"
                ? claims.picture
                : auth0.user?.picture,
          });

          if (user) {
            savePreviewSession(user);
          }

          return;
        } catch (error) {
          console.warn(
            "Gravweb: Auth0 popup no disponible en AI Studio.",
            error
          );
          throw new Error(
            `Auth0 no acepto el origen de AI Studio. Agrega ${getRedirectUri()} a Allowed Callback URLs y Allowed Web Origins.`
          );
        }
      }

      await auth0.loginWithRedirect({
        appState: { returnTo },
        authorizationParams,
        openUrl: openAuthUrl,
      });
    },
    [auth0]
  );

  const logout = useCallback(() => {
    clearPreviewSession();
    clearPreviewReturnTo();

    if (isAiStudioRuntime()) {
      void auth0.logout({ openUrl: false });
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      }
      return;
    }

    auth0.logout({
      logoutParams: {
        returnTo:
          typeof window === "undefined"
            ? undefined
            : `${window.location.origin}/login`,
      },
      openUrl: openUrlInCurrentWindow,
    });
  }, [auth0]);

  const effectiveUser = auth0.user ?? previewUser;
  const effectiveIsAuthenticated = auth0.isAuthenticated || Boolean(previewUser);
  const effectiveIsLoading = auth0.isLoading && !previewUser;

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      user: effectiveUser,
      userId: effectiveUser?.sub || effectiveUser?.email,
      isAuthenticated: effectiveIsAuthenticated,
      isLoading: effectiveIsLoading,
      source: "auth0",
      login,
      logout,
    }),
    [effectiveIsAuthenticated, effectiveIsLoading, effectiveUser, login, logout]
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
      useCookiesForTransactions
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
