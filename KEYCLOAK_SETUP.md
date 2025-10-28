# Keycloak Google Authentication Setup

## Overview

The application now uses Keycloak for authentication with Google login support. Users must log in to access the journal features, and their first name is displayed at the top of each page.

## Keycloak Server Configuration

### 1. Create a Realm

- Log into your Keycloak admin console
- Create a new realm called `qjournal` (or update KEYCLOAK_REALM in configs)

### 2. Configure Google Identity Provider

1. Go to **Identity Providers** → Click **Add provider** → Select **Google**
2. Configure with your Google OAuth credentials:
   - Client ID: From Google Cloud Console
   - Client Secret: From Google Cloud Console
3. Set redirect URI in Google Cloud Console:
   - `https://keycloak.quatres.net/realms/qjournal/broker/google/endpoint`

### 3. Create a Client

1. Go to **Clients** → Click **Create client**
2. Configure:
   - Client ID: `qjournal-app`
   - Client Protocol: `openid-connect`
   - Access Type: `public`
   - Valid Redirect URIs: `https://qjournal.quatres.net/*`
   - Web Origins: `https://qjournal.quatres.net`

### 4. Configure Client Scopes

Ensure these scopes are included:

- `openid`
- `profile`
- `email`

## Installation

### Backend

```bash
cd backend
npm install
```

New dependencies added:

- `jsonwebtoken` - JWT verification
- `jwks-rsa` - Keycloak public key fetching

### Frontend

```bash
cd frontend
npm install
```

New dependencies added:

- `keycloak-js` - Keycloak JavaScript adapter
- `@react-keycloak/web` - React Keycloak integration

## Environment Variables

### For Kubernetes Deployment

**Keycloak Configuration (ConfigMap)**

Edit `k8s/keycloak-config.yaml` to set your Keycloak server details:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: keycloak-config
  namespace: qjournal
data:
  KEYCLOAK_URL: "https://keycloak.quatres.net"
  KEYCLOAK_REALM: "qjournal"
  KEYCLOAK_CLIENT_ID: "qjournal-app"
```

**OpenAI API Key (Secret)**

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your_openai_api_key
```

This is used by `deploy.sh` to create a Kubernetes secret.

### For Local Development

Backend `.env`:

```env
PORT=3001
OPENAI_API_KEY=your_openai_api_key
KEYCLOAK_URL=https://keycloak.quatres.net
KEYCLOAK_REALM=qjournal
```

Frontend `.env`:

```env
VITE_KEYCLOAK_URL=https://keycloak.quatres.net
VITE_KEYCLOAK_REALM=qjournal
VITE_KEYCLOAK_CLIENT_ID=qjournal-app
```

## Deployment

### CI/CD Pipeline

The GitHub Actions workflows automatically build and push Docker images when you push to the main branch:

1. **Backend**: Triggered on changes to `backend/` directory
2. **Frontend**: Triggered on changes to `frontend/` directory

**Important**: The frontend container reads Keycloak configuration from environment variables at runtime (injected from ConfigMap), not at build time.

### Deploy to Kubernetes

1. Edit `k8s/keycloak-config.yaml` with your Keycloak server details
2. Create `.env` file with `OPENAI_API_KEY`
3. Run the deployment script:

```bash
./deploy.sh
```

This will:

1. Create Kubernetes namespace
2. Apply Keycloak ConfigMap
3. Create secret from `.env` file (OPENAI_API_KEY)
4. Deploy backend and frontend
5. Deploy ingress

**Note:** No secrets or configuration are baked into container images. All configuration is injected at runtime via ConfigMap and Secrets.

```bash
docker build \
  --build-arg VITE_KEYCLOAK_URL=https://keycloak.quatres.net \
  --build-arg VITE_KEYCLOAK_REALM=qjournal \
  --build-arg VITE_KEYCLOAK_CLIENT_ID=qjournal-app \
  -t qjournal-frontend:latest \
  ./frontend
```

### Kubernetes Deployment

The backend deployment has been updated with Keycloak environment variables. Apply the changes:

```bash
kubectl apply -f k8s/backend-deployment.yaml
kubectl rollout restart deployment qjournal-backend -n qjournal
```

For the frontend, you'll need to rebuild the image with the build args and push to your registry.

## Features

### Authentication Flow

1. User visits the app → Redirected to Keycloak login
2. User chooses "Sign in with Google"
3. After Google authentication, redirected back to the app
4. JWT token is stored and sent with all API requests

### Protected Features

- **Journal Analysis API**: Requires valid JWT token
- All journal submissions are associated with the authenticated user

### User Interface

- User's first name displayed in the top-right corner
- Logout button available on all pages
- Loading state while authentication initializes

## Security

- All API endpoints except `/health` require authentication
- JWT tokens are verified using Keycloak's public keys
- Tokens are automatically refreshed before expiration
- HTTPS required for production (Keycloak requirement)

## Development

### Local Development

1. Ensure Keycloak is accessible (use production or local instance)
2. Create `.env` files based on `.env.example`
3. Start backend: `npm run dev`
4. Start frontend: `npm run dev`

### Testing Authentication

1. Try accessing the app without logging in → Should redirect to Keycloak
2. Log in with Google
3. Verify first name appears in top-right
4. Submit a journal entry → Check backend logs for authenticated user
5. Test logout → Should clear session and redirect to login

## Troubleshooting

### "Failed to initialize Keycloak"

- Check KEYCLOAK_URL is accessible
- Verify realm name matches
- Check browser console for CORS errors

### "Invalid or expired token"

- Token might have expired
- Keycloak public keys might have rotated
- Check backend logs for verification errors

### Google login not appearing

- Verify Google IDP is configured in Keycloak
- Check Google OAuth credentials are correct
- Ensure redirect URI matches in Google Console
