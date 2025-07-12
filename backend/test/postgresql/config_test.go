package config_test

import (
	"os"
	"testing"

	config "github.com/kubestellar/ui/backend/postgresql"
	"github.com/stretchr/testify/assert"
)

func TestLoadConfigDefaults(t *testing.T) {
	// Clear relevant environment variables
	os.Unsetenv("DATABASE_URL")
	os.Unsetenv("JWT_SECRET")
	os.Unsetenv("PORT")
	os.Unsetenv("GIN_MODE")

	cfg := config.LoadConfig()

	assert.Equal(t, "postgres://authuser:authpass123@localhost:5400/authdb?sslmode=disable", cfg.DatabaseURL)
	assert.Equal(t, "your-secret-key-here", cfg.JWTSecret)
	assert.Equal(t, "5400", cfg.Port)
	assert.Equal(t, "debug", cfg.GinMode)
}

func TestLoadConfigFromEnv(t *testing.T) {
	// Set environment variables
	os.Setenv("DATABASE_URL", "postgres://testuser:testpass@testhost:5432/testdb")
	os.Setenv("JWT_SECRET", "test-secret-key")
	os.Setenv("PORT", "8080")
	os.Setenv("GIN_MODE", "release")

	defer func() {
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("PORT")
		os.Unsetenv("GIN_MODE")
	}()

	cfg := config.LoadConfig()

	assert.Equal(t, "postgres://testuser:testpass@testhost:5432/testdb", cfg.DatabaseURL)
	assert.Equal(t, "test-secret-key", cfg.JWTSecret)
	assert.Equal(t, "8080", cfg.Port)
	assert.Equal(t, "release", cfg.GinMode)
}

// Test with partial environment variables
func TestLoadConfigPartialEnv(t *testing.T) {
	os.Unsetenv("DATABASE_URL")
	os.Unsetenv("JWT_SECRET")
	os.Unsetenv("PORT")
	os.Unsetenv("GIN_MODE")

	os.Setenv("DATABASE_URL", "postgres://partialtest:partialpass@partialhost:5432/partialdb")
	os.Setenv("PORT", "3000")

	defer func() {
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("PORT")
	}()

	cfg := config.LoadConfig()

	assert.Equal(t, "postgres://partialtest:partialpass@partialhost:5432/partialdb", cfg.DatabaseURL)
	assert.Equal(t, "your-secret-key-here", cfg.JWTSecret)
	assert.Equal(t, "3000", cfg.Port)
	assert.Equal(t, "debug", cfg.GinMode)
}
