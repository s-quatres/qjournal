#!/bin/bash

# QJournal Kubernetes Deployment Script

set -e

echo "🚀 Deploying QJournal to Kubernetes..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with OPENAI_API_KEY"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ Error: kubectl is not installed"
    exit 1
fi

# Create namespace
echo "📦 Creating namespace..."
kubectl apply -f k8s/namespace.yaml

# Create or update ConfigMap
echo "⚙️  Creating ConfigMap..."
kubectl apply -f k8s/keycloak-config.yaml

# Create or update secret
echo "🔐 Creating secrets from .env file..."
kubectl delete secret qjournal-secrets -n qjournal 2>/dev/null || true
kubectl create secret generic qjournal-secrets \
  --from-env-file=.env \
  --namespace=qjournal

# Deploy backend
echo "🔧 Deploying backend..."
kubectl apply -f k8s/backend-deployment.yaml

# Deploy frontend
echo "🎨 Deploying frontend..."
kubectl apply -f k8s/frontend-deployment.yaml

# Deploy ingress
echo "🌐 Deploying ingress..."
kubectl apply -f k8s/ingress.yaml

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Check status with:"
echo "  kubectl get pods -n qjournal"
echo ""
echo "View logs with:"
echo "  kubectl logs -f deployment/qjournal-backend -n qjournal"
echo "  kubectl logs -f deployment/qjournal-frontend -n qjournal"
echo ""
echo "Access the app:"
echo "  kubectl port-forward svc/qjournal-frontend 8080:80 -n qjournal"
echo "  Then open http://localhost:8080"
echo ""
