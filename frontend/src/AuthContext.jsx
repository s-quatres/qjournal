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
    const initLog = `[${new Date().toISOString()}] Initializing Keycloak... URL: ${
      window.location.href
    }`;
    console.log(initLog);
    sessionStorage.setItem("kc_last_init", initLog);

    // Add error handlers
    keycloak.onAuthError = (errorData) => {
      const errLog = `[${new Date().toISOString()}] onAuthError: ${JSON.stringify(
        errorData
      )}`;
      console.error(errLog);
      sessionStorage.setItem("kc_last_error", errLog);
    };

    keycloak.onAuthRefreshError = () => {
      const errLog = `[${new Date().toISOString()}] onAuthRefreshError`;
      console.error(errLog);
      sessionStorage.setItem("kc_last_error", errLog);
    };

    keycloak.onAuthLogout = () => {
      const logoutLog = `[${new Date().toISOString()}] onAuthLogout`;
      console.log(logoutLog);
      sessionStorage.setItem("kc_last_event", logoutLog);
    };

    keycloak
      .init({
        onLoad: "check-sso",
        checkLoginIframe: false,
        responseMode: "fragment",
        enableLogging: true,
      })
      .then((auth) => {
        const successLog = `[${new Date().toISOString()}] Keycloak init success. Authenticated: ${auth}, Token: ${
          keycloak.token ? "present" : "missing"
        }`;
        console.log(successLog);
        sessionStorage.setItem("kc_last_success", successLog);

        setAuthenticated(auth);
        setInitialized(true);

        if (auth && keycloak.tokenParsed) {
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

          // Clear URL fragment after successful auth
          if (window.location.hash) {
            console.log("Clearing OAuth fragment from URL");
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname + window.location.search
            );
          }
        }
      })
      .catch((error) => {
        const failLog = `[${new Date().toISOString()}] Keycloak init failed: ${
          error?.message || "undefined"
        }`;
        console.error(failLog);
        sessionStorage.setItem("kc_last_fail", failLog);
        sessionStorage.setItem(
          "kc_last_error_detail",
          JSON.stringify({
            message: error?.message,
            name: error?.name,
            error: error,
          })
        );
        setInitialized(true);
      });

    // Log stored events on mount
    console.log("Previous events:", {
      lastInit: sessionStorage.getItem("kc_last_init"),
      lastSuccess: sessionStorage.getItem("kc_last_success"),
      lastFail: sessionStorage.getItem("kc_last_fail"),
      lastError: sessionStorage.getItem("kc_last_error"),
      lastEvent: sessionStorage.getItem("kc_last_event"),
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
