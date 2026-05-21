import { useAuth0 } from "@auth0/auth0-react";
import { isLocalDevAuthEnabled, LOCAL_DEV_USER } from "./localDevAuth.ts";

export function useCurrentUser() {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const localDevEnabled = isLocalDevAuthEnabled();
  const currentUser = localDevEnabled ? LOCAL_DEV_USER : user;

  return {
    user: currentUser,
    userId: currentUser?.sub,
    isAuthenticated: localDevEnabled || isAuthenticated,
    isLoading,
    source: localDevEnabled ? "local-dev" : "auth0",
  };
}
