# Stage 1: Build the backend
FROM golang:1.24 AS backend-builder

# Set the working directory
WORKDIR /app

# Copy the Go modules manifest files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the source codesudo apt  install docker-compose 
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=$TARGETARCH go build -o backend main.go

# Stage 2: Create a lightweight runtime image
FROM alpine:latest

# Install necessary packages, Helm, and clusteradm
RUN apk --no-cache add ca-certificates curl openssl git bash kubectl && \
    HELM_VERSION="v3.12.0" && \
    curl -LO "https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz" && \
    tar -zxvf "helm-${HELM_VERSION}-linux-amd64.tar.gz" && \
    mv linux-amd64/helm /usr/local/bin/helm && \
    rm -rf linux-amd64 "helm-${HELM_VERSION}-linux-amd64.tar.gz" && \
    curl -L https://raw.githubusercontent.com/open-cluster-management-io/clusteradm/main/install.sh -o /tmp/install.sh && \
    chmod +x /tmp/install.sh && \
    bash /tmp/install.sh 0.10.1 && \
    rm /tmp/install.sh

# Install kubeflex
RUN bash -c "$(curl -s https://raw.githubusercontent.com/kubestellar/kubeflex/main/scripts/install-kubeflex.sh)" -- --ensure-folder /usr/local/bin --strip-bin

# Set the working directory
WORKDIR /root/

# Generate JWT secret and set it as an environment variable
RUN JWT_SECRET=$(openssl rand -base64 32) && \
    echo "export JWT_SECRET=$JWT_SECRET" > /root/.env

# Create a temp directory for git operations
RUN mkdir -p /tmp && chmod 777 /tmp

# Copy the compiled binary from the builder stage
COPY --from=backend-builder /app/backend .

# Allow access to Kubernetes API via a volume mount for kubeconfig
VOLUME ["/root/.kube"]

# Expose the backend service port
EXPOSE 4000

# Source the environment variables and run the backend
CMD ["/bin/sh", "-c", "source /root/.env && ./backend"]
