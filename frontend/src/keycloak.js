import Keycloak from "keycloak-js";

// Get config from runtime (injected by docker-entrypoint.sh) or build-time env vars
const runtimeConfig =
  (typeof window !== "undefined" && window.RUNTIME_CONFIG) || {};

const keycloakConfig = {
  url:
    runtimeConfig.KEYCLOAK_URL ||
    import.meta.env.VITE_KEYCLOAK_URL ||
    "https://keycloak.quatres.net",
  realm:
    runtimeConfig.KEYCLOAK_REALM ||
    import.meta.env.VITE_KEYCLOAK_REALM ||
    "master",
  clientId:
    runtimeConfig.KEYCLOAK_CLIENT_ID ||
    import.meta.env.VITE_KEYCLOAK_CLIENT_ID ||
    "qjournal-app",
};

console.log("Keycloak config:", keycloakConfig);

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
