FROM golang:1.22 AS backend

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the backend source code
COPY . .

# Install air for hot reloading (compatible version)
RUN go install github.com/cosmtrek/air@v1.42.0

# Ensure backend has access to Kubernetes APIs
ENV KUBECONFIG=/root/.kube/config
VOLUME ["/root/.kube"]

# Expose backend port
EXPOSE 4000

# Start Air for live reload
CMD ["air"]
