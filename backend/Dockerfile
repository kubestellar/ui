# Stage 1: Build the backend
FROM golang:1.23 AS backend-builder

# Set the working directory
WORKDIR /app

# Copy the Go modules manifest files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=$TARGETARCH go build -o backend main.go

# Stage 2: Create a lightweight runtime image
FROM alpine:latest

# Install necessary packages
RUN apk --no-cache add ca-certificates curl openssl

# Set the working directory
WORKDIR /root/

# Generate JWT secret and set it as environment variable
RUN JWT_SECRET=$(openssl rand -base64 32) && \
    echo "export JWT_SECRET=$JWT_SECRET" > /root/.env

# Copy the compiled binary from the builder stage
COPY --from=backend-builder /app/backend .

# Allow access to Kubernetes API
VOLUME ["/root/.kube"]

# Expose the backend service port
EXPOSE 4000

# Source the environment variables and run the backend
CMD ["/bin/sh", "-c", "source /root/.env && ./backend"]
