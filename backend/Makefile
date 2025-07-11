# ==============================================================================
# Makefile for KubeStellar Backend
# ==============================================================================
include .env

DB_URL=${DATABASE_URL}
MIGRATION_PATH=./postgresql/migrations

# Declare all targets as phony (they don't create files with these names)
.PHONY: help dev build test test-verbose test-coverage test-individual test-file test-func test-watch quick-test fmt lint clean deps create-migration migrate-up migrate-down migrate-force

# Default target - show help
help:
	@echo "KubeStellar Backend - Available Commands"
	@echo "========================================"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev           - Start development server with hot reload using Air"
	@echo "  make build         - Build the Go application"
	@echo "  make help          - Display available commands (default target)"
	@echo ""
	@echo "Testing Commands:"
	@echo "  make test          - Run all API tests"
	@echo "  make test-verbose  - Run tests with verbose output"
	@echo "  make test-coverage - Run tests with coverage report (generates coverage.html)"
	@echo "  make test-individual - Run each test file individually"
	@echo "  make test-file FILE=filename - Run specific test file"
	@echo "  make test-func FUNC=TestName - Run specific test function"
	@echo "  make test-watch    - Watch mode info (not implemented - manual alternative)"
	@echo "  make quick-test    - Run subset of tests (status and logs only)"
	@echo ""
	@echo "Code Quality Commands:"
	@echo "  make fmt           - Format Go code"
	@echo "  make lint          - Run go vet linter"
	@echo ""
	@echo "Utility Commands:"
	@echo "  make clean         - Clean test cache and temporary files"
	@echo "  make deps          - Install and tidy Go dependencies"
	@echo ""
	@echo "Database Migration Commands:"
	@echo "  make create-migration     - Create a new database migration file"
	@echo "  make migrate-up           - Apply all pending database migrations"
	@echo "  make migrate-down         - Rollback last N database migrations"
	@echo "  make migrate-force        - Force a specific migration version (e.g., when tables already exist)"
	@echo "  make migrate-version      - Show the current version of the migration"

# ==============================================================================
# Development Commands
# ==============================================================================

# Development server with hot reload
dev:
	@echo "Starting development server with Air..."
	air

# Build the application
build:
	@echo "Building Go application..."
	go build -o ./bin/main ./main.go
	@echo "Build complete: ./bin/main"

# ==============================================================================
# Testing Commands
# ==============================================================================

# Run all API tests
test:
	@echo "Running all tests..."
	go test ./... -v

# Run tests with verbose output
test-verbose:
	@echo "Running tests with verbose output..."
	go test ./... -v -count=1

# Run tests with coverage report
test-coverage:
	@echo "Running tests with coverage report..."
	go test ./... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Run each test file individually
test-individual:
	@echo "Running each test file individually..."
	@for file in $$(find . -name "*_test.go" -not -path "./vendor/*"); do \
		echo "Testing: $$file"; \
		go test $$(dirname $$file) -v; \
	done

# Run specific test file
test-file:
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make test-file FILE=filename"; \
		echo "Example: make test-file FILE=auth"; \
	else \
		echo "Running tests in file: $(FILE)"; \
		go test ./test/$(FILE) -v; \
	fi

# Run specific test function
test-func:
	@if [ -z "$(FUNC)" ]; then \
		echo "Usage: make test-func FUNC=TestName"; \
		echo "Example: make test-func FUNC=TestAuth"; \
	else \
		echo "Running test function: $(FUNC)"; \
		go test ./... -run $(FUNC) -v; \
	fi

# Watch mode info (manual alternative)
test-watch:
	@echo "Test watch mode is not implemented."
	@echo "Manual alternative: Use 'air' for live reload during development"
	@echo "Or run: find . -name '*.go' | entr -r go test ./..."

# Run subset of tests (status and logs only)
quick-test:
	@echo "Running quick tests (status and logs only)..."
	@if [ -d "./test/auth" ]; then go test ./test/auth -v; fi
	@if [ -d "./test/redis" ]; then go test ./test/redis -v; fi

# ==============================================================================
# Code Quality Commands
# ==============================================================================

# Format Go code
fmt:
	@echo "Formatting Go code..."
	go fmt ./...
	@echo "Code formatting complete"

# Run go vet linter
lint:
	@echo "Running go vet linter..."
	go vet ./...
	@echo "Linting complete"

# ==============================================================================
# Utility Commands
# ==============================================================================

# Clean test cache and temporary files
clean:
	@echo "Cleaning test cache and temporary files..."
	go clean -testcache
	rm -rf bin
	rm -f coverage.out coverage.html
	@echo "Cleanup complete"

# Install and tidy Go dependencies
deps:
	@echo "Installing and tidying Go dependencies..."
	go mod download
	go mod tidy
	@echo "Dependencies updated"

# Database Migration Commands
create-migration:
	@read -p "Enter migration name: " name; \
	migrate create -ext sql -dir ${MIGRATION_PATH} -seq $${name}

migrate-up:
	@migrate -path=${MIGRATION_PATH} -database "${DB_URL}" up

migrate-down:
	@read -p "Number of migrations you want to rollback (default: 1): " NUM; \
	NUM=$${NUM:-1}; \
	migrate -path=${MIGRATION_PATH} -database "${DB_URL}" down $${NUM}

migrate-force:
	@read -p "Enter the version to force: " VERSION; \
	migrate -path=${MIGRATION_PATH} -database "${DB_URL}" force $${VERSION}

migrate-version:
	@migrate -path=${MIGRATION_PATH} -database "${DB_URL}" version
