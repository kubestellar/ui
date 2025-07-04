# Quick Start

```bash
# Deploy chart
helm install ui . -f values-kubeflex.yaml

# Access app
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8000:80 --address=0.0.0.0
```

Open http://localhost:8000