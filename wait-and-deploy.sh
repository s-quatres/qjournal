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

# Check if there's a running workflow
WORKFLOW_COUNT=$(gh run list --limit 1 --json status,conclusion --jq 'length')

if [ "$WORKFLOW_COUNT" -eq 0 ]; then
    echo "⚠️  No workflows found. Restarting all pods without waiting for build..."
    echo ""
    
    echo "🔄 Restarting all pods..."
    kubectl delete pods -n qjournal -l app=qjournal-frontend
    kubectl delete pods -n qjournal -l app=qjournal-backend
    
    echo ""
    echo "⏳ Waiting for new pods to be ready..."
    kubectl wait --for=condition=ready pod -l app=qjournal-frontend -n qjournal --timeout=120s
    kubectl wait --for=condition=ready pod -l app=qjournal-backend -n qjournal --timeout=120s
    
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "🌐 Access your app at: https://qjournal.quatres.net"
    exit 0
fi

# Wait for the workflow to complete
echo "⏳ Waiting for build workflows to complete..."
gh run watch --exit-status || {
    echo "❌ Workflow failed or was cancelled"
    exit 1
}

echo ""
echo "✅ Workflow completed successfully!"
echo ""

# Now restart both frontend and backend pods
echo "🔄 Restarting frontend pods..."
kubectl delete pods -n qjournal -l app=qjournal-frontend

echo "🔄 Restarting backend pods..."
kubectl delete pods -n qjournal -l app=qjournal-backend

echo ""
echo "⏳ Waiting for new pods to be ready..."
kubectl wait --for=condition=ready pod -l app=qjournal-frontend -n qjournal --timeout=120s
kubectl wait --for=condition=ready pod -l app=qjournal-backend -n qjournal --timeout=120s

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your app at: https://qjournal.quatres.net"
