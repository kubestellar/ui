#!/bin/bash
set -euo pipefail

# -------------------------------
# Configuration
# -------------------------------
RELEASE_NAME="ui-test-release"
NAMESPACE="helm-ui-test"
CLUSTER_NAME="helm-ui-test"
USE_LOCAL_IMAGES=false
VALUES_FILE=""

# -------------------------------
# Parse CLI Arguments
# -------------------------------
for arg in "$@"; do
  case $arg in
    --local) USE_LOCAL_IMAGES=true ;;
    --namespace=*) NAMESPACE="${arg#*=}" ;;
    --release=*) RELEASE_NAME="${arg#*=}" ;;
    --cluster=*) CLUSTER_NAME="${arg#*=}" ;;
    --values=*) VALUES_FILE="${arg#*=}" ;;
  esac
done

# -------------------------------
# Ensure `yq` is installed
# -------------------------------
if ! command -v yq &> /dev/null; then
  echo "ℹ️ Installing yq..."
  sudo curl -L https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -o /usr/local/bin/yq
  sudo chmod +x /usr/local/bin/yq
fi

# -------------------------------
# Handle local image mode
# -------------------------------
if $USE_LOCAL_IMAGES; then
  echo "ℹ️ Building and loading local Docker images..."

  docker build -t kubestellar-ui-frontend:local -f frontend/Dockerfile ./frontend
  docker build -t kubestellar-ui-backend:local -f backend/Dockerfile ./backend

  kind load docker-image kubestellar-ui-frontend:local --name "$CLUSTER_NAME"
  kind load docker-image kubestellar-ui-backend:local --name "$CLUSTER_NAME"

  echo "ℹ️ Generating values.local.yaml..."
  cp chart/values.yaml chart/values.local.yaml

  if yq e '.frontend.image | type' chart/values.yaml | grep -q "!!map"; then
    yq e '
      .frontend.image.repository = "kubestellar-ui-frontend" |
      .frontend.image.tag = "local" |
      .frontend.env = (.frontend.env // {}) |
      .frontend.env.BACKEND_URL = "backend:4000" |
      .backend.image.repository = "kubestellar-ui-backend" |
      .backend.image.tag = "local"
    ' -i chart/values.local.yaml
  else
    yq e '
      .frontend.image = "kubestellar-ui-frontend:local" |
      .frontend.env = (.frontend.env // {}) |
      .frontend.env.BACKEND_URL = "backend:4000" |
      .backend.image = "kubestellar-ui-backend:local"
    ' -i chart/values.local.yaml
  fi

  VALUES_FILE="chart/values.local.yaml"
fi

# -------------------------------
# Helm Lint & Namespace
# -------------------------------
HELM_VALUES=""
if [[ -n "$VALUES_FILE" ]]; then
  echo "ℹ️ Using values file: $VALUES_FILE"
  HELM_VALUES="-f $VALUES_FILE"
fi

kubectl create namespace "$NAMESPACE" 2>/dev/null || true

echo "ℹ️ Running helm lint..."
helm lint ./chart

# -------------------------------
# Install Chart with Retries
# -------------------------------
for i in {1..3}; do
  echo "ℹ️ Install attempt $i..."
  if helm install "$RELEASE_NAME" ./chart -n "$NAMESPACE" $HELM_VALUES --wait --timeout 10m; then
    echo "✅ Helm install succeeded (attempt $i)"
    break
  fi

  echo "⚠️ Attempt $i failed. Showing pod status..."
  kubectl get pods -n "$NAMESPACE" || true
  helm uninstall "$RELEASE_NAME" -n "$NAMESPACE" || true
  sleep 10
done

# -------------------------------
# Verify Installation
# -------------------------------
if ! helm status "$RELEASE_NAME" -n "$NAMESPACE" &>/dev/null; then
  echo "❌ Helm install failed after 3 attempts."
  kubectl describe pods -n "$NAMESPACE"
  kubectl get events -n "$NAMESPACE" --sort-by='.metadata.creationTimestamp'
  exit 1
fi

echo "ℹ️ Waiting for pods to be ready..."
kubectl wait --for=condition=Ready pods --all -n "$NAMESPACE" --timeout=180s || {
  echo "❌ Some pods did not become ready."
  kubectl get pods -n "$NAMESPACE"
  exit 1
}

kubectl get all -n "$NAMESPACE"

# -------------------------------
# Frontend Test
# -------------------------------
echo "ℹ️ Testing frontend..."
kubectl port-forward svc/frontend 8080:80 -n "$NAMESPACE" > /tmp/frontend.log 2>&1 &
PF_PID=$!

for i in {1..10}; do
  if nc -z localhost 8080; then break; fi
  sleep 1
done

if curl -fs http://localhost:8080/ > /dev/null; then
  echo "✅ Frontend is accessible."
else
  echo "❌ Frontend test failed."
  cat /tmp/frontend.log
  kill $PF_PID
  exit 1
fi
kill $PF_PID

# -------------------------------
# Backend Test
# -------------------------------
echo "ℹ️ Testing backend..."
kubectl port-forward svc/backend 4000:4000 -n "$NAMESPACE" > /tmp/backend.log 2>&1 &
PF_BACKEND_PID=$!

for i in {1..10}; do
  if nc -z localhost 4000; then break; fi
  sleep 1
done

for i in {1..5}; do
  if curl -fs http://localhost:4000/health > /dev/null; then
    echo "✅ Backend /health responded."
    break
  else
    echo "ℹ️ Waiting for backend /health (attempt $i)..."
    sleep 3
  fi
done

if ! curl -fs http://localhost:4000/health > /dev/null; then
  echo "❌ Backend test failed."
  cat /tmp/backend.log
  kill $PF_BACKEND_PID
  exit 1
fi
kill $PF_BACKEND_PID

# -------------------------------
# Done
# -------------------------------
echo "✅ Helm chart test completed successfully."

