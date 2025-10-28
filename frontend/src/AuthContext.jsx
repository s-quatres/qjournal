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
        const authenticated = await keycloak.init({
          onLoad: "login-required",
          checkLoginIframe: false,
        });

        setIsAuthenticated(authenticated);

        if (authenticated) {
          const profile = await keycloak.loadUserProfile();
          setUser({
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            username: profile.username,
          });
        }
      } catch (error) {
        console.error("Failed to initialize Keycloak:", error);
      } finally {
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
