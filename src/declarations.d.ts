declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "@auth0/auth0-react" {
  export const Auth0Provider: import("react").ComponentType<{
    children: import("react").ReactNode;
  }>;
  export function useAuth0(): {
    isAuthenticated: boolean;
    isLoading: boolean;
    user?: {
      sub?: string;
      name?: string;
      email?: string;
    };
    loginWithRedirect: () => Promise<unknown>;
    logout: () => void;
    getAccessTokenSilently: () => Promise<string>;
  };
}
