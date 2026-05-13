import React from "react";

export function Auth0Provider({ children }) {
  return <>{children}</>;
}

export function useAuth0() {
  return {
    isAuthenticated: true,
    isLoading: false,
    user: {
      sub: "local-dev-user",
      name: "Gravitacional Local",
      email: "local@gravitacional.dev",
    },
    loginWithRedirect: () => Promise.resolve(),
    logout: () => undefined,
    getAccessTokenSilently: () => Promise.resolve("local-dev-token"),
  };
}
