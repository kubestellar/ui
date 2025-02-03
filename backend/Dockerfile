# Backend Dockerfile
FROM golang:1.22 AS backend

# Set root user permissions
USER root

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the backend source code
COPY . .

# Install air for hot reloading (compatible version)
RUN go install github.com/cosmtrek/air@v1.42.0

ENV PATH=$PATH:/usr/local/go/bin

# Expose backend port
EXPOSE 4000

# Start Air for live reload
CMD ["air"]
