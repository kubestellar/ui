# KubeStellar UI Helm Chart

This Helm chart deploys the KubeStellar UI application with PostgreSQL database, Redis cache, and Nginx ingress.

## Overview

The KubeStellar UI consists of:
- **Frontend**: React application served by Nginx
- **Backend**: Go application with REST API
- **PostgreSQL**: Database for authentication and data storage
- **Redis**: Cache for session management and performance

## Prerequisites

- Kubernetes cluster (kind, k3d, or kubeflex recommended)
- Helm 3.x installed
- kubectl configured to access your cluster
- Ingress controller installed (nginx-ingress recommended)

## Local Development Setup

### 1. Setup kind cluster with ingress (recommended)

```bash
# Create kind cluster
kind create cluster --name kubeflex --config - <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 8080
    protocol: TCP
  - containerPort: 443
    hostPort: 8443
    protocol: TCP
EOF

# Install nginx ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for ingress controller to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

### 2. Build and load Docker images

```bash
# Build backend image
cd ../backend
docker build -t kubestellar-ui-backend:latest .

# Build frontend image  
cd ../frontend
docker build -t kubestellar-ui-frontend:latest .

# Load images into kind cluster
kind load docker-image kubestellar-ui-backend:latest --name kubeflex
kind load docker-image kubestellar-ui-frontend:latest --name kubeflex
```

### 3. Deploy the Helm chart

```bash
# Install the chart
helm install kubestellar-ui . --create-namespace --namespace default

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod --all --timeout=300s

# Check deployment status
kubectl get pods,svc,ingress
```

### 4. Access the application

The application will be available at:
- **Frontend UI**: http://localhost:8080
- **Login credentials**: admin/admin

**Important**: Change the default admin password immediately after first login!

## Configuration

### Key Configuration Options

The chart automatically configures:
- PostgreSQL database with schema initialization
- Redis cache for session management  
- Admin user creation with default credentials
- Nginx ingress for external access
- Internal service networking (backend not exposed externally)

### values.yaml Configuration

```yaml
# Database configuration
postgresql:
  enabled: true
  username: "authuser"
  password: "authpass"
  database: "authdb"
  persistence:
    enabled: true
    size: "1Gi"

# Redis configuration
redis:
  enabled: true
  password: "redispass"
  persistence:
    enabled: false
    size: "1Gi"

# Backend configuration
backend:
  image:
    repository: "kubestellar-ui-backend"
    tag: "latest"
  replicas: 1
  port: 4000

# Frontend configuration
frontend:
  image:
    repository: "kubestellar-ui-frontend"
    tag: "latest"
  replicas: 1
  port: 80

# Ingress configuration
ingress:
  enabled: true
  host: "localhost"
  ingressClassName: "nginx"
```

## Troubleshooting

### Check Pod Status and Logs

```bash
# Check all pods
kubectl get pods -A

# Check specific component logs
kubectl logs -l app=backend --tail=50
kubectl logs -l app=frontend --tail=50
kubectl logs -l app=postgresql --tail=50
kubectl logs -l app=redis --tail=50
```

### Test Database Connection

```bash
# Connect to PostgreSQL
kubectl exec -it $(kubectl get pod -l app=postgresql -o jsonpath='{.items[0].metadata.name}') -- psql -U authuser -d authdb

# Check admin user exists
kubectl exec -it $(kubectl get pod -l app=postgresql -o jsonpath='{.items[0].metadata.name}') -- psql -U authuser -d authdb -c "SELECT * FROM users;"
```

### Test API Endpoints

```bash
# Test backend health (internal)
kubectl port-forward svc/backend 4000:4000 &
curl http://localhost:4000/health

# Test login via frontend
curl -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'

# Test API status
curl http://localhost:8080/api/kubestellar/status
```

### Common Issues

1. **Images not found**: Make sure to build and load images into kind cluster
2. **Ingress not working**: Verify nginx ingress controller is installed and ready
3. **Database connection issues**: Check PostgreSQL pod logs and service connectivity
4. **Login fails**: Verify database schema is initialized and admin user exists

## Cleanup

```bash
# Uninstall the chart
helm uninstall kubestellar-ui

# Delete persistent volumes (if needed)
kubectl delete pvc --all

# Delete kind cluster
kind delete cluster --name kubeflex
```

## Architecture

- **Frontend**: React app served by Nginx, handles UI and API proxying
- **Backend**: Go application with Gin framework, provides REST API
- **PostgreSQL**: Primary database for user authentication and data
- **Redis**: Caching layer for improved performance
- **Ingress**: Routes external traffic to frontend only

## Security Notes

- Backend is only accessible internally (ClusterIP service)
- Default admin credentials should be changed immediately
- Database credentials are stored in Kubernetes secrets
- All inter-service communication is internal to the cluster

## Support

For issues and support, please visit the [KubeStellar UI GitHub repository](https://github.com/kubestellar/ui).