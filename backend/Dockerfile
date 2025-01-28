# Stage 1: Build the Go application
FROM golang:1.22.3 AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy go.mod and go.sum files to the working directory
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the rest of the source code
COPY . ./

# Build the Go application with static linking
RUN CGO_ENABLED=0 GOOS=linux go build -o backend-app main.go

# Stage 2: Create a minimal image to run the application
FROM alpine:3.18

# Install necessary certificates (needed for HTTPS calls, e.g., to Kubernetes APIs)
RUN apk add --no-cache ca-certificates

# Set the working directory inside the container
WORKDIR /root/

# Copy the built binary from the builder stage
COPY --from=builder /app/backend-app .

# Ensure the binary is executable
RUN chmod +x backend-app

# Expose the port your application will run on
EXPOSE 4000

# Command to run the application
CMD ["./backend-app"]
