import { useAuth0 } from "@auth0/auth0-react";

export function useCurrentUser() {
  const { user, isAuthenticated, isLoading } = useAuth0();

  return {
    user,
    userId: user?.sub,
    isAuthenticated,
    isLoading,
    source: "local-auth",
  };
}
