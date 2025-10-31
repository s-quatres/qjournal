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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initKeycloak = async () => {
      try {
        console.log("Starting Keycloak initialization...");
        const authenticated = await keycloak
          .init({
            onLoad: "check-sso",
            checkLoginIframe: false,
            silentCheckSsoRedirectUri:
              window.location.origin + "/silent-check-sso.html",
            scope: "openid profile email",
          })
          .catch((err) => {
            console.error("Keycloak init threw error:", err);
            throw err;
          });

        console.log("Keycloak initialized, authenticated:", authenticated);

        if (!authenticated) {
          console.log("Not authenticated, redirecting to login...");
          keycloak.login();
          return;
        }

        setIsAuthenticated(authenticated);

        // Get user info from token claims instead of profile endpoint
        console.log("Getting user info from token...");
        const tokenParsed = keycloak.tokenParsed;
        console.log("Token parsed:", tokenParsed);

        setUser({
          firstName:
            tokenParsed.given_name || tokenParsed.name?.split(" ")[0] || "User",
          lastName:
            tokenParsed.family_name ||
            tokenParsed.name?.split(" ").slice(1).join(" ") ||
            "",
          email: tokenParsed.email || "",
          username: tokenParsed.preferred_username || tokenParsed.email || "",
        });
      } catch (error) {
        console.error("Failed to initialize Keycloak:", error);
        console.error("Error type:", typeof error);
        console.error("Error details:", JSON.stringify(error));
        if (error && typeof error === "object") {
          console.error("Error keys:", Object.keys(error));
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
        }
      } finally {
        console.log(
          "Keycloak initialization complete, setting loading to false"
        );
        setLoading(false);
      }
    };

    initKeycloak();

    // Token refresh
    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => {
        console.error("Failed to refresh token");
        logout();
      });
    };
  }, []);

  const login = () => {
    keycloak.login();
  };

  const logout = () => {
    keycloak.logout();
  };

  const getToken = () => {
    return keycloak.token;
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
