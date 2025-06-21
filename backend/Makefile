include .env

DB_URL = postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@$(POSTGRES_HOST):$(POSTGRES_PORT)/$(POSTGRES_DB)?sslmode=$(POSTGRES_SSL_MODE)
MIGRATION_PATH = ./postgresql/migrations

.PHONY: dev build clean


# Development server with hot reload
dev:
	air

# Build the application
build:
	go build -o ./bin/main ./main.go

# Clean build artifacts
clean:
	rm -rf bin

create-migration:
	@read -p "Enter migration name: " name; \
	migrate create -ext sql -dir ${MIGRATION_PATH} -seq $${name}

migrate-up:
	@migrate -path=${MIGRATION_PATH} -database ${DB_URL} up

migrate-down:
	@read -p "Number of migrations you want to rollback (default: 1): " NUM; NUM=$${NUM:-1}; \
 	migrate -path=${MIGRATION_PATH} -database ${DB_URL} down $${NUM}