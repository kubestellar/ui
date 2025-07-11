package database_test

import (
	"os"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"

	database "github.com/kubestellar/ui/backend/postgresql/Database"
	"github.com/stretchr/testify/assert"
)

// TestCloseDatabase tests the CloseDatabase function
func TestCloseDatabase(t *testing.T) {
	originalDB := database.DB
	defer func() { database.DB = originalDB }()

	database.DB = nil
	err := database.CloseDatabase()
	assert.NoError(t, err, "CloseDatabase should not error when DB is nil")

	mockDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}

	mock.ExpectClose()

	database.DB = mockDB
	err = database.CloseDatabase()
	assert.NoError(t, err, "CloseDatabase should not error when closing a valid DB connection")
}

// TestInitDatabaseIntegration tests the database initialization with a real database
func TestInitDatabaseIntegration(t *testing.T) {
	if os.Getenv("RUN_INTEGRATION_TESTS") != "true" {
		t.Skip("Skipping integration test. Set RUN_INTEGRATION_TESTS=true to run")
	}

	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable"
	}

	err := database.InitDatabase(databaseURL)
	defer database.CloseDatabase()

	assert.NoError(t, err)
	assert.NotNil(t, database.DB)

	var result int
	err = database.DB.QueryRow("SELECT 1").Scan(&result)
	assert.NoError(t, err)
	assert.Equal(t, 1, result)
}

// TestCloseNilDatabase specifically tests closing a nil database
func TestCloseNilDatabase(t *testing.T) {
	originalDB := database.DB
	defer func() { database.DB = originalDB }()

	database.DB = nil

	err := database.CloseDatabase()
	assert.NoError(t, err)
}

// Instead of testing actual connection failures with retries,
// we'll test the DB close function in error cases
func TestCloseErrorHandling(t *testing.T) {
	originalDB := database.DB
	defer func() { database.DB = originalDB }()

	mockDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}

	mock.ExpectClose().WillReturnError(assert.AnError)

	database.DB = mockDB

	err = database.CloseDatabase()
	assert.Error(t, err)
	assert.Equal(t, assert.AnError, err)
}
