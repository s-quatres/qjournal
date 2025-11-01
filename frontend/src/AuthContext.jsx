import React, { createContext, useContext, useState, useEffect } from "react";
import keycloak from "./keycloak";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    console.log("Initializing Keycloak...");
    console.log("Current URL:", window.location.href);

    keycloak
      .init({
        onLoad: "check-sso",
        checkLoginIframe: false,
        flow: "standard",
      })
      .then((auth) => {
        console.log("Keycloak init success. Authenticated:", auth);

        if (auth) {
          console.log("Token:", keycloak.token ? "present" : "missing");
          console.log("Token parsed:", keycloak.tokenParsed);

          setAuthenticated(true);

          if (keycloak.tokenParsed) {
            setUser({
              firstName:
                keycloak.tokenParsed.given_name ||
                keycloak.tokenParsed.name?.split(" ")[0] ||
                "User",
              lastName:
                keycloak.tokenParsed.family_name ||
                keycloak.tokenParsed.name?.split(" ").slice(1).join(" ") ||
                "",
              email: keycloak.tokenParsed.email || "",
              username:
                keycloak.tokenParsed.preferred_username ||
                keycloak.tokenParsed.email ||
                "",
            });

            // Clear URL fragment
            if (window.location.hash) {
              console.log("Clearing OAuth fragment");
              window.history.replaceState(
                {},
                document.title,
                window.location.pathname + window.location.search
              );
            }
          }
        }

        setInitialized(true);
      })
      .catch((error) => {
        console.error("Keycloak init failed:", error);
        console.error("Error type:", typeof error);
        console.error("Error stringified:", JSON.stringify(error));
        setInitialized(true);
      });

    // Token refresh
    keycloak.onTokenExpired = () => {
      console.log("Token expired, refreshing...");
      keycloak
        .updateToken(30)
        .then((refreshed) => {
          if (refreshed) {
            console.log("Token refreshed");
          }
        })
        .catch(() => {
          console.error("Failed to refresh token");
          setAuthenticated(false);
          setUser(null);
        });
    };
  }, []);

  const login = () => {
    console.log("Redirecting to login...");
    keycloak.login();
  };

  const logout = () => {
    console.log("Logging out...");
    keycloak.logout();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: authenticated,
        user,
        loading: !initialized,
        login,
        logout,
        keycloak,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
