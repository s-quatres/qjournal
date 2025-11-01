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

        console.log("========== KEYCLOAK INIT SUCCESS ==========");
        console.log("Authenticated:", authenticated);
        console.log("Keycloak object:", keycloak);
        console.log("Token:", keycloak.token);
        console.log("Refresh token:", keycloak.refreshToken);
        console.log("ID token:", keycloak.idToken);

        if (!authenticated) {
          console.log("Not authenticated, redirecting to login...");
          keycloak.login();
          return;
        }

        console.log("========== SETTING AUTHENTICATED ==========");
        setIsAuthenticated(authenticated);

        console.log("========== EXTRACTING USER INFO ==========");
        const tokenParsed = keycloak.tokenParsed;
        console.log("Token parsed object:", tokenParsed);
        console.log(
          "All token keys:",
          tokenParsed ? Object.keys(tokenParsed) : "NO TOKEN"
        );
        console.log("Token as JSON:", JSON.stringify(tokenParsed, null, 2));

        if (!tokenParsed) {
          throw new Error("No token parsed!");
        }

        console.log("Extracting fields:");
        console.log("  - given_name:", tokenParsed.given_name);
        console.log("  - family_name:", tokenParsed.family_name);
        console.log("  - name:", tokenParsed.name);
        console.log("  - email:", tokenParsed.email);
        console.log("  - preferred_username:", tokenParsed.preferred_username);

        const firstName =
          tokenParsed.given_name || tokenParsed.name?.split(" ")[0] || "User";
        const lastName =
          tokenParsed.family_name ||
          tokenParsed.name?.split(" ").slice(1).join(" ") ||
          "";
        const email = tokenParsed.email || "";
        const username =
          tokenParsed.preferred_username || tokenParsed.email || "";

        console.log("Computed user object:");
        console.log("  - firstName:", firstName);
        console.log("  - lastName:", lastName);
        console.log("  - email:", email);
        console.log("  - username:", username);

        console.log("========== SETTING USER STATE ==========");
        setUser({
          firstName,
          lastName,
          email,
          username,
        });

        console.log("========== USER INFO SET SUCCESSFULLY ==========");
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
