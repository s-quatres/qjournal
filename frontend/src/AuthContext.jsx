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
  return (
    <ReactKeycloakProvider
      authClient={keycloak}
      initOptions={{
        onLoad: "login-required",
        checkLoginIframe: false,
        pkceMethod: "S256",
      }}
    >
      <AuthProviderInner>{children}</AuthProviderInner>
    </ReactKeycloakProvider>
  );
};
