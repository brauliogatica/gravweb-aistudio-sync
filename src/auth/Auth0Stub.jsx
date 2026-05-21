import React from "react";
import {
  clearLocalAuthUser,
  getLocalAuthUser,
  saveDefaultLocalAuthUser,
  subscribeLocalAuth,
} from "./localAuthSession";

export function Auth0Provider({ children }) {
  return <>{children}</>;
}

export function useAuth0() {
  const [user, setUser] = React.useState(() => getLocalAuthUser());

  React.useEffect(() => {
    return subscribeLocalAuth(() => {
      setUser(getLocalAuthUser());
    });
  }, []);

  return {
    isAuthenticated: Boolean(user),
    isLoading: false,
    user: user || undefined,
    loginWithRedirect: () => {
      const nextUser = saveDefaultLocalAuthUser();
      setUser(nextUser);
      return Promise.resolve();
    },
    logout: () => {
      clearLocalAuthUser();
      setUser(null);
    },
    getAccessTokenSilently: () =>
      Promise.resolve(user ? `local-dev-token:${user.sub}` : ""),
  };
}
