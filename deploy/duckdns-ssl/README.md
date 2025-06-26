# DuckDNS + Let's Encrypt Automated Setup for KS UI

This directory contains Kubernetes manifests and instructions to automate DuckDNS dynamic DNS and SSL certificate provisioning for remote access to KS UI.

## Prerequisites
- Kubernetes cluster (EKS, AKS, GKE, OpenShift, etc.)
- [kubectl](https://kubernetes.io/docs/tasks/tools/) access
- A [DuckDNS](https://www.duckdns.org/) account and registered subdomain

## Steps

### 1. Set DuckDNS Token and Domain
Create a Kubernetes secret with your DuckDNS token and domain:

```sh
kubectl create secret generic duckdns-secret \
  --from-literal=token=<your-duckdns-token> \
  --from-literal=domain=<your-duckdns-domain>
```

### 2. Deploy DuckDNS Updater and Certbot
Apply the manifest:

```sh
kubectl apply -f duckdns-certbot-deployment.yaml
```

This will:
- Update your DuckDNS domain with the cluster's public IP
- Request and renew SSL certificates from Let's Encrypt
- Store certificates in a shared volume (`/ssl`)

### 3. Create/Update TLS Secret for Ingress
Run the provided script to copy certificates into a Kubernetes TLS secret:

```sh
./update-tls-secret.sh
```

### 4. Configure Ingress
Update your Ingress to use the `ks-ui-tls` secret and your DuckDNS domain.

---

See the manifest and script in this directory for details.
