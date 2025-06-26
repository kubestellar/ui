#!/bin/bash
# update-tls-secret.sh
# Copies Let's Encrypt certs from the duckdns-certbot pod to a Kubernetes TLS secret for Ingress

set -e

NAMESPACE=default # Change if needed
POD=$(kubectl get pods -n $NAMESPACE -l app=duckdns-certbot -o jsonpath='{.items[0].metadata.name}')

kubectl cp $NAMESPACE/$POD:/ssl/fullchain.pem ./fullchain.pem
kubectl cp $NAMESPACE/$POD:/ssl/privkey.pem ./privkey.pem

kubectl delete secret ks-ui-tls --ignore-not-found -n $NAMESPACE
kubectl create secret tls ks-ui-tls --cert=fullchain.pem --key=privkey.pem -n $NAMESPACE

rm fullchain.pem privkey.pem

echo "TLS secret ks-ui-tls updated."
