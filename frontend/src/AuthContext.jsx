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

  // Clear URL fragment after initialization to prevent code reuse
  React.useEffect(() => {
    if (initialized) {
      // Remove OAuth fragments from URL after successful init
      if (window.location.hash) {
        console.log("Clearing OAuth fragment from URL");
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.search
        );
      }

      // Log authentication status
      console.log("Keycloak initialized. Authenticated:", kc.authenticated);
    }
  }, [initialized, kc, kc.authenticated]);

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
  // Store the auth code immediately to prevent double use
  React.useEffect(() => {
    if (window.location.hash.includes('code=')) {
      const hash = window.location.hash;
      const alreadyProcessed = sessionStorage.getItem('auth_code_processed');
      
      if (alreadyProcessed === hash) {
        console.log('Auth code already processed, clearing URL');
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      } else {
        console.log('New auth code detected, marking for processing');
        sessionStorage.setItem('auth_code_processed', hash);
      }
    }
  }, []);

  const handleEvent = (event, error) => {
    console.log("Keycloak event:", event, error);
    
    // Clear the processed flag on successful auth
    if (event === 'onAuthSuccess') {
      sessionStorage.removeItem('auth_code_processed');
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
