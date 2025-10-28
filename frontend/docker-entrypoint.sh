#!/bin/sh
set -e

# Generate runtime config from environment variables
cat > /usr/share/nginx/html/config.js <<EOF
window.RUNTIME_CONFIG = {
  KEYCLOAK_URL: "${KEYCLOAK_URL}",
  KEYCLOAK_REALM: "${KEYCLOAK_REALM}",
  KEYCLOAK_CLIENT_ID: "${KEYCLOAK_CLIENT_ID}"
};
EOF

# Execute the main command
exec "$@"
