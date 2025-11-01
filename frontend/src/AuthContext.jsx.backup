import React, { createContext, useContext } from "react";
import { ReactKeycloakProvider, useKeycloak } from "@react-keycloak/web";
import keycloak from "./keycloak";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// Inner provider that uses the keycloak hook
const AuthProviderInner = ({ children }) => {
  const { keycloak: kc, initialized } = useKeycloak();

  // Clear URL fragment after successful authentication
  React.useEffect(() => {
    if (initialized && kc.authenticated && window.location.hash) {
      console.log(
        "Authentication successful, clearing OAuth fragment from URL"
      );
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search
      );
    }

    if (initialized) {
      console.log("Keycloak initialized. Authenticated:", kc.authenticated);
      if (!kc.authenticated) {
        // Log the URL to check if we have an auth code
        console.log("Current URL hash:", window.location.hash);
        console.log("Current URL search:", window.location.search);
      }
    }
  }, [initialized, kc.authenticated]);

  const user =
    kc.authenticated && kc.tokenParsed
      ? {
          firstName:
            kc.tokenParsed.given_name ||
            kc.tokenParsed.name?.split(" ")[0] ||
            "User",
          lastName:
            kc.tokenParsed.family_name ||
            kc.tokenParsed.name?.split(" ").slice(1).join(" ") ||
            "",
          email: kc.tokenParsed.email || "",
          username:
            kc.tokenParsed.preferred_username || kc.tokenParsed.email || "",
        }
      : null;

  const login = () => kc.login();
  const logout = () => kc.logout();

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: kc.authenticated || false,
        user,
        loading: !initialized,
        login,
        logout,
        keycloak: kc,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider = ({ children }) => {
  const handleEvent = (event, error) => {
    console.log("Keycloak event:", event, error);

    if (event === "onInitError") {
      console.error("Keycloak initialization error details:", {
        error,
        authenticated: keycloak.authenticated,
        token: keycloak.token ? "present" : "missing",
        refreshToken: keycloak.refreshToken ? "present" : "missing",
      });
    }
  };

  const handleTokens = (tokens) => {
    console.log("Keycloak tokens:", tokens);
  };

  return (
    <ReactKeycloakProvider
      authClient={keycloak}
      initOptions={{
        onLoad: "check-sso",
        checkLoginIframe: false,
        responseMode: "fragment",
      }}
      onEvent={handleEvent}
      onTokens={handleTokens}
      LoadingComponent={<div>Loading authentication...</div>}
    >
      <AuthProviderInner>{children}</AuthProviderInner>
    </ReactKeycloakProvider>
  );
};
