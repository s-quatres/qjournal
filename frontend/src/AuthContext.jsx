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
        const authenticated = await keycloak.init({
          onLoad: "login-required",
          checkLoginIframe: false,
        });

        console.log("Keycloak initialized, authenticated:", authenticated);
        setIsAuthenticated(authenticated);

        if (authenticated) {
          console.log("Loading user profile...");
          const profile = await keycloak.loadUserProfile();
          console.log("User profile loaded:", profile);
          setUser({
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            username: profile.username,
          });
        }
      } catch (error) {
        console.error("Failed to initialize Keycloak:", error);
        console.error("Error details:", error.message, error.stack);
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
