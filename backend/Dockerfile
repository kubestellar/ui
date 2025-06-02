# # Stage 1: Build the backend
# FROM golang:1.24 AS backend-builder

# # Set the working directory
# WORKDIR /app

# # Copy the Go modules manifest files
# COPY go.mod go.sum ./

# # Download dependencies
# RUN go mod download

# # Copy the source codesudo apt  install docker-compose 
# COPY . .

# # If using a local module, copy the module into the build context
# COPY pluginapi /root/pluginapi

# # Alternatively, remove any local replacements and use the remote module
# RUN go mod tidy

# # Build the binary
# RUN CGO_ENABLED=0 GOOS=linux GOARCH=$TARGETARCH go build -o backend main.go

# # Stage 2: Create a lightweight runtime image
# FROM debian:bullseye-slim

# # install curl
# RUN apt --no-cache add curl
# # Install Go in Alpine
# ENV GO_VERSION=1.22.3

# RUN curl -LO https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz && \
#     tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz && \
#     rm go${GO_VERSION}.linux-amd64.tar.gz

# ENV PATH="/usr/local/go/bin:${PATH}"

# RUN apt add --no-cache gcc musl-dev
# ENV CGO_ENABLED=1
# # Install necessary packages, Helm, and clusteradm
# RUN apt --no-cache add ca-certificates curl openssl git bash kubectl && \
#     HELM_VERSION="v3.12.0" && \
#     curl -LO "https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz" && \
#     tar -zxvf "helm-${HELM_VERSION}-linux-amd64.tar.gz" && \
#     mv linux-amd64/helm /usr/local/bin/helm && \
#     rm -rf linux-amd64 "helm-${HELM_VERSION}-linux-amd64.tar.gz" && \
#     curl -L https://raw.githubusercontent.com/open-cluster-management-io/clusteradm/main/install.sh -o /tmp/install.sh && \
#     chmod +x /tmp/install.sh && \
#     bash /tmp/install.sh 0.10.1 && \
#     rm /tmp/install.sh

# RUN apk add --no-cache curl docker-cli

# # # Install Go
# # RUN wget https://dl.google.com/go/go1.10.3.linux-amd64.tar.gz
# # RUN tar -C /usr/local -xzf go1.10.3.linux-amd64.tar.gz
# # RUN export PATH=$PATH:/usr/local/go/bin
# # RUN go 
# # Download Docker Compose v2 binary and make it executable
# RUN curl -SL https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose && \
#     chmod +x /usr/local/bin/docker-compose

# # Install kubeflex
# RUN bash -c "$(curl -s https://raw.githubusercontent.com/kubestellar/kubeflex/main/scripts/install-kubeflex.sh)" -- --ensure-folder /usr/local/bin --strip-bin

# # Set the working directory
# WORKDIR /root/

# # Generate JWT secret and set it as an environment variable
# RUN JWT_SECRET=$(openssl rand -base64 32) && \
#     echo "export JWT_SECRET=$JWT_SECRET" > /root/.env

# # Create a temp directory for git operations
# RUN mkdir -p /tmp && chmod 777 /tmp

# # Copy the compiled binary from the builder stage
# COPY --from=backend-builder /app/backend .

# # Allow access to Kubernetes API via a volume mount for kubeconfig
# VOLUME ["/root/.kube"]

# # Expose the backend service port
# EXPOSE 4000 5174

# # Source the environment variables and run the backend
# CMD ["/bin/sh", "-c", "source /root/.env && ./backend"]



# Stage 1: Build the backend binary
FROM golang:1.24-bookworm AS backend-builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
COPY pluginapi /root/pluginapi
RUN go mod tidy

# Enable CGO for plugin support and build for Linux
ENV CGO_ENABLED=1
# Go environment variables
ENV GOROOT=/usr/local/go
ENV GOPATH=/root/go
ENV GOBIN=
ENV GOARCH=amd64
ENV GOOS=linux
ENV GOAMD64=v1
ENV CGO_ENABLED=1
ENV CC=gcc
ENV CXX=g++
ENV CGO_CFLAGS='-O2 -g'
ENV CGO_CPPFLAGS=
ENV CGO_CXXFLAGS='-O2 -g'
ENV CGO_FFLAGS='-O2 -g'
ENV CGO_LDFLAGS='-O2 -g'
ENV GOGCCFLAGS='-fPIC -m64 -pthread -Wl,--no-gc-sections -fmessage-length=0 -ffile-prefix-map=/tmp/go-build=/tmp/go-build -gno-record-gcc-switches'
ENV GOCACHE=/root/.cache/go-build
ENV GOMODCACHE=/root/go/pkg/mod
ENV GOENV=/root/.config/go/env
ENV GOTMPDIR=
ENV GOTOOLDIR=/usr/local/go/pkg/tool/linux_amd64
ENV GOEXE=
ENV GOTOOLCHAIN=auto
ENV GODEBUG=
ENV GOFLAGS=
ENV GOFIPS140=off
ENV GOINSECURE=
ENV GOAUTH=netrc
ENV GOPROXY=https://proxy.golang.org,direct
ENV GOSUMDB=sum.golang.org
ENV GONOPROXY=
ENV GONOSUMDB=
ENV GOVCS=
ENV GOTELEMETRY=local
ENV GOTELEMETRYDIR=/root/.config/go/telemetry
ENV GOWORK=
ENV GO111MODULE=
ENV GO_VERSION=1.24.2
RUN go build -o backend main.go

# Stage 2: Runtime image with all tools
FROM debian:bookworm-slim

# Install basic packages and tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    gcc \
    libc6-dev \
    ca-certificates \
    openssl \
    git \
    curl \
    unzip \
    wget \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

ENV CGO_ENABLED=1
# Go environment variables
ENV GOROOT=/usr/local/go
ENV GOPATH=/root/go
ENV GOBIN=
ENV GOARCH=amd64
ENV GOOS=linux
ENV GOAMD64=v1
ENV CGO_ENABLED=1
ENV CC=gcc
ENV CXX=g++
ENV CGO_CFLAGS='-O2 -g'
ENV CGO_CPPFLAGS=
ENV CGO_CXXFLAGS='-O2 -g'
ENV CGO_FFLAGS='-O2 -g'
ENV CGO_LDFLAGS='-O2 -g'
ENV GOGCCFLAGS='-fPIC -m64 -pthread -Wl,--no-gc-sections -fmessage-length=0 -ffile-prefix-map=/tmp/go-build=/tmp/go-build -gno-record-gcc-switches'
ENV GOCACHE=/root/.cache/go-build
ENV GOMODCACHE=/root/go/pkg/mod
ENV GOENV=/root/.config/go/env
ENV GOTMPDIR=
ENV GOTOOLDIR=/usr/local/go/pkg/tool/linux_amd64
ENV GOEXE=
ENV GOTOOLCHAIN=auto
ENV GODEBUG=
ENV GOFLAGS=
ENV GOFIPS140=off
ENV GOINSECURE=
ENV GOAUTH=netrc
ENV GOPROXY=https://proxy.golang.org,direct
ENV GOSUMDB=sum.golang.org
ENV GONOPROXY=
ENV GONOSUMDB=
ENV GOVCS=
ENV GOTELEMETRY=local
ENV GOTELEMETRYDIR=/root/.config/go/telemetry
ENV GOWORK=
ENV GO111MODULE=
ENV GO_VERSION=1.24.2
RUN curl -LO https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz && \
    rm go${GO_VERSION}.linux-amd64.tar.gz

ENV PATH="/usr/local/go/bin:${PATH}"    
# Install kubectl manually
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl && \
    rm kubectl

# Install Helm
RUN HELM_VERSION="v3.12.0" && \
    curl -LO "https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz" && \
    tar -zxvf "helm-${HELM_VERSION}-linux-amd64.tar.gz" && \
    mv linux-amd64/helm /usr/local/bin/helm && \
    rm -rf linux-amd64 "helm-${HELM_VERSION}-linux-amd64.tar.gz"

# Install clusteradm
RUN curl -L https://raw.githubusercontent.com/open-cluster-management-io/clusteradm/main/install.sh -o /tmp/install.sh && \
    chmod +x /tmp/install.sh && \
    bash /tmp/install.sh 0.10.1 && \
    rm /tmp/install.sh

# Install Docker Compose v2
RUN curl -SL https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose && \
    chmod +x /usr/local/bin/docker-compose

# Install kubeflex
RUN bash -c "$(curl -s https://raw.githubusercontent.com/kubestellar/kubeflex/main/scripts/install-kubeflex.sh)" -- --ensure-folder /usr/local/bin --strip-bin

WORKDIR /root/

# Generate JWT secret environment variable
RUN JWT_SECRET=$(openssl rand -base64 32) && \
    echo "export JWT_SECRET=$JWT_SECRET" > /root/.env

RUN mkdir -p /tmp && chmod 777 /tmp

# Copy backend binary from build stage
COPY --from=backend-builder /app/backend .

# Allow mounting kubeconfig
VOLUME ["/root/.kube"]

EXPOSE 4000 5174

# Use bash to source env and run backend
CMD ["/bin/bash", "-c", "source /root/.env && ./backend"]
