.PHONY: dev build clean test test-verbose test-coverage test-individual clean build help fmt lint deps test-watch quick-test

# Development server with hot reload
dev:
	air

# Default target
help:
	@echo "Available commands:"
	@echo "  make test          - Run all API tests"
	@echo "  make test-verbose  - Run tests with verbose output"
	@echo "  make test-coverage - Run tests with coverage report"
	@echo "  make test-individual - Run each test file individually"
	@echo "  make clean         - Clean up temporary files and test results"
	@echo "  make build         - Build the application"
	@echo "  make fmt           - Format Go code"
	@echo "  make lint          - Run golangci-lint"

# Run all API tests
test:
	@echo "Running API test suite..."
	@go test ./test/api/... -v

# Run tests with verbose output
test-verbose:
	@echo "Running API tests with verbose output..."
	@go test ./test/api/... -v

# Run tests with coverage
test-coverage:
	@echo "Running API tests with coverage..."
	@go test ./test/api/... -v -coverprofile=coverage.out
	@go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Run individual test files  
test-individual:
	@echo "Running individual test files..."
	@go test ./test/api/status_handler_test.go -v
	@go test ./test/api/cluster_logs_test.go -v
	@go test ./test/api/installer_test.go -v
	@go test ./test/api/manage_clusters_test.go -v
	@go test ./test/api/handlers_test.go -v
	@go test ./test/api/deploy_test.go -v
	@go test ./test/api/detach_test.go -v
	@go test ./test/api/artifact_test.go -v
	@go test ./test/api/plugins_test.go -v
	@go test ./test/api/cluster_socket_test.go -v
	@go test ./test/api/installer_websocket_test.go -v

# Run specific test file (Usage: make test-file FILE=filename_test.go)
test-file:
	@echo "Running test file: $(FILE)"
	@go test "./test/api/$(FILE)" -v

# Run specific test function (Usage: make test-func FUNC=TestFunctionName)
test-func:
	@echo "Running test function: $(FUNC)"
	@go test ./test/api/... -v -run $(FUNC)

# Build the application
build:
	@echo "Building application..."
	@go build -v ./...

# Format Go code
fmt:
	@echo "Formatting Go code..."
	@go fmt ./...

# Run go vet (cross-platform linting)
lint:
	@echo "Running linter..."
	@go vet ./...

# Clean up temporary files
clean:
	@echo "Cleaning up temporary files..."
	@go clean -testcache
	@echo "Cleanup complete. Note: To remove .tmp files manually, run: del *.tmp (Windows) or rm *.tmp (Unix)"

# Install dependencies
deps:
	@echo "Installing dependencies..."
	@go mod download
	@go mod tidy

# Run tests in watch mode (requires external tools)
test-watch:
	@echo "Watch mode not available in cross-platform Makefile"
	@echo "For watch mode, use your IDE's test runner or install platform-specific tools"
	@echo "Alternatively, run 'make test' manually when files change"

# Quick test - just compile and run a subset
quick-test:
	@echo "Running quick test (status and logs only)..."
	@go test ./test/api/status_handler_test.go ./test/api/cluster_logs_test.go -v