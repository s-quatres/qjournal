# Kubernetes Deployment Guide

## Prerequisites

- Kubernetes cluster (v1.19+)
- kubectl configured
- NGINX Ingress Controller installed

## Create Secret from .env file

From the root of the project, create the Kubernetes secret:

```bash
kubectl create namespace qjournal
kubectl create secret generic qjournal-secrets \
  --from-env-file=.env \
  --namespace=qjournal
```

To verify the secret was created:

```bash
kubectl get secret qjournal-secrets -n qjournal
kubectl describe secret qjournal-secrets -n qjournal
```

## Deploy the Application

Deploy all resources:

```bash
kubectl apply -f k8s/
```

Or deploy individually:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml
```

## Verify Deployment

Check pod status:

```bash
kubectl get pods -n qjournal
```

Check services:

```bash
kubectl get svc -n qjournal
```

Check ingress:

```bash
kubectl get ingress -n qjournal
```

## View Logs

Backend logs:

```bash
kubectl logs -f deployment/qjournal-backend -n qjournal
```

Frontend logs:

```bash
kubectl logs -f deployment/qjournal-frontend -n qjournal
```

## Update Deployment

When new images are pushed, update the deployments:

```bash
kubectl rollout restart deployment/qjournal-backend -n qjournal
kubectl rollout restart deployment/qjournal-frontend -n qjournal
```

Or force pull latest images:

```bash
kubectl set image deployment/qjournal-backend backend=ghcr.io/s-quatres/qjournal-backend:latest -n qjournal
kubectl set image deployment/qjournal-frontend frontend=ghcr.io/s-quatres/qjournal-frontend:latest -n qjournal
```

## Update Secret

If you need to update the OpenAI API key:

```bash
# Delete old secret
kubectl delete secret qjournal-secrets -n qjournal

# Create new secret from updated .env
kubectl create secret generic qjournal-secrets \
  --from-env-file=.env \
  --namespace=qjournal

# Restart backend to pick up new secret
kubectl rollout restart deployment/qjournal-backend -n qjournal
```

## Configure Ingress

Update the `k8s/ingress.yaml` file with your actual domain:

```yaml
spec:
  rules:
  - host: qjournal.yourdomain.com  # Change this
```

Then apply:

```bash
kubectl apply -f k8s/ingress.yaml
```

## Scale Deployments

Scale backend:

```bash
kubectl scale deployment qjournal-backend --replicas=3 -n qjournal
```

Scale frontend:

```bash
kubectl scale deployment qjournal-frontend --replicas=3 -n qjournal
```

## Port Forward (for testing without ingress)

Backend:

```bash
kubectl port-forward svc/qjournal-backend 3001:3001 -n qjournal
```

Frontend:

```bash
kubectl port-forward svc/qjournal-frontend 8080:80 -n qjournal
```

Then access at http://localhost:8080

## Clean Up

Remove all resources:

```bash
kubectl delete namespace qjournal
```

Or individual resources:

```bash
kubectl delete -f k8s/
```
