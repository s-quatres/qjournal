#!/bin/bash

set -e

echo "🔍 Checking GitHub Actions workflow status..."

# Get the latest commit SHA
COMMIT_SHA=$(git rev-parse HEAD)
SHORT_SHA=$(git rev-parse --short HEAD)

echo "📝 Latest commit: $SHORT_SHA"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "Install it with: brew install gh"
    exit 1
fi

# Wait for the workflow to complete
echo "⏳ Waiting for frontend build workflow to complete..."
gh run watch --exit-status || {
    echo "❌ Workflow failed or was cancelled"
    exit 1
}

echo ""
echo "✅ Workflow completed successfully!"
echo ""

# Now restart the frontend pods
echo "🔄 Restarting frontend pods..."
kubectl delete pods -n qjournal -l app=qjournal-frontend

echo ""
echo "⏳ Waiting for new pods to be ready..."
kubectl wait --for=condition=ready pod -l app=qjournal-frontend -n qjournal --timeout=120s

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your app at: https://qjournal.quatres.net"
