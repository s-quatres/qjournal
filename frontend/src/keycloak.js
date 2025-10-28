import Keycloak from "keycloak-js";

// Get config from runtime (injected by docker-entrypoint.sh) or build-time env vars
const runtimeConfig = window.RUNTIME_CONFIG || {};

const keycloakConfig = {
  url:
    runtimeConfig.KEYCLOAK_URL ||
    import.meta.env.VITE_KEYCLOAK_URL ||
    "http://localhost:8080",
  realm:
    runtimeConfig.KEYCLOAK_REALM ||
    import.meta.env.VITE_KEYCLOAK_REALM ||
    "master",
  clientId:
    runtimeConfig.KEYCLOAK_CLIENT_ID ||
    import.meta.env.VITE_KEYCLOAK_CLIENT_ID ||
    "qjournal-app",
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
