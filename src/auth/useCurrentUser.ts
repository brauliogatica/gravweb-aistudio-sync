import { useAuthSession } from "./AuthSessionProvider";

export function useCurrentUser() {
  const { user, userId, isAuthenticated, isLoading, source } = useAuthSession();

  return {
    user,
    userId,
    isAuthenticated,
    isLoading,
    source,
  };
}
