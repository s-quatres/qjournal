# QJournal

A React-based journaling application with AI-powered insights using OpenAI.

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- OpenAI API key

## Quick Start

1. Clone the repository
2. Copy `.env.example` to `.env` and add your OpenAI API key:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and add your OpenAI API key
4. Run with Docker Compose:
   ```bash
   docker-compose up --build
   ```
5. Open http://localhost:3000

## Development

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your OpenAI API key
npm install
npm run dev
```

## Project Structure

```
qjournal/
├── frontend/           # React app with Vite
│   ├── src/
│   │   ├── components/ # React components
│   │   └── App.jsx
│   ├── Dockerfile
│   └── package.json
├── backend/            # Node.js Express API
│   ├── server.js
│   ├── Dockerfile
│   └── package.json
├── k8s/                # Kubernetes manifests
│   ├── namespace.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── ingress.yaml
│   └── README.md
├── .github/
│   └── workflows/      # GitHub Actions
├── docker-compose.yml
└── deploy.sh           # K8s deployment script
```

## Deployment

### Docker Compose (Local Development)

```bash
docker-compose up --build
```

### Kubernetes

#### Quick Deploy

Use the deployment script:

```bash
./deploy.sh
```

#### Manual Deploy

1. Create namespace and secret:
   ```bash
   kubectl create namespace qjournal
   kubectl create secret generic qjournal-secrets \
     --from-env-file=.env \
     --namespace=qjournal
   ```

2. Deploy all resources:
   ```bash
   kubectl apply -f k8s/
   ```

3. Check status:
   ```bash
   kubectl get pods -n qjournal
   ```

4. Port forward to test:
   ```bash
   kubectl port-forward svc/qjournal-frontend 8080:80 -n qjournal
   ```

See `k8s/README.md` for detailed deployment instructions.

The app automatically builds and pushes Docker images to GitHub Container Registry on every commit to main/master branch.

Images are available at:
- Frontend: `ghcr.io/s-quatres/qjournal-frontend:latest`
- Backend: `ghcr.io/s-quatres/qjournal-backend:latest`

## Environment Variables

### Backend
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `PORT`: Server port (default: 3001)

## Features

- 📝 Step-by-step journaling with 5 reflective questions
- 🤖 AI-powered insights and feedback using OpenAI
- 🎨 Modern UI with Tailwind CSS
- 🐳 Containerized with Docker
- 🚀 CI/CD with GitHub Actions
- 📱 Responsive design

## License

MIT
