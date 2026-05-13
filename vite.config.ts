import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const clientEnv = {
    REACT_APP_GOOGLE_MAPS_API_KEY: env.VITE_GOOGLE_MAPS_API_KEY ?? "",
    REACT_APP_BACKEND_URL: env.VITE_API_BASE_URL ?? "",
    REACT_APP_RHINO_COMPUTE_URL: env.VITE_RHINO_COMPUTE_URL ?? "",
    REACT_APP_RHINO_COMPUTE_KEY: "",
    REACT_APP_AUTH0_DOMAIN: "",
    REACT_APP_CLIENT_ID: "",
    REACT_APP_EOS_API_KEY: "",
    REACT_APP_OPENTOPOGRAPHY_API_KEY: "",
    REACT_APP_MAX_AREA: env.VITE_MAX_AREA ?? "10000",
  };

  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    plugins: [react()],
    define: {
      "process.env": JSON.stringify(clientEnv),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@auth0/auth0-react": path.resolve(__dirname, "./src/auth/Auth0Stub.jsx"),
      },
    },
  };
});
