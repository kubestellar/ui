package jwt

import (
	"os"
	"testing"
	"time"

	jwtconfig "github.com/kubestellar/ui/backend/jwt"
	"github.com/stretchr/testify/assert"
)

func TestLoadConfig(t *testing.T) {
	// This just ensures that loading without .env doesn't panic
	_ = os.Unsetenv(jwtconfig.JWTSecretEnv)
	jwtconfig.LoadConfig()
}

func TestGetJWTSecret_Default(t *testing.T) {
	originalSecret := os.Getenv(jwtconfig.JWTSecretEnv)
	defer os.Setenv(jwtconfig.JWTSecretEnv, originalSecret)

	os.Unsetenv(jwtconfig.JWTSecretEnv)
	secret := jwtconfig.GetJWTSecret()
	assert.Equal(t, "default_secret_key", secret)
}

func TestGetJWTSecret_Custom(t *testing.T) {
	originalSecret := os.Getenv(jwtconfig.JWTSecretEnv)
	defer os.Setenv(jwtconfig.JWTSecretEnv, originalSecret)

	os.Setenv(jwtconfig.JWTSecretEnv, "mysecret")
	secret := jwtconfig.GetJWTSecret()
	assert.Equal(t, "mysecret", secret)
}

func TestSetJWTSecret(t *testing.T) {
	originalSecret := os.Getenv(jwtconfig.JWTSecretEnv)
	defer os.Setenv(jwtconfig.JWTSecretEnv, originalSecret)

	jwtconfig.SetJWTSecret("newsecret")
	assert.Equal(t, "newsecret", os.Getenv(jwtconfig.JWTSecretEnv))
}

func TestGetTokenExpiration_Default(t *testing.T) {
	originalExpiration := os.Getenv(jwtconfig.TokenExpirationEnv)
	defer os.Setenv(jwtconfig.TokenExpirationEnv, originalExpiration)

	os.Unsetenv(jwtconfig.TokenExpirationEnv)
	exp := jwtconfig.GetTokenExpiration()
	assert.Equal(t, 24*time.Hour, exp)
}

func TestGetTokenExpiration_CustomValid(t *testing.T) {
	originalExpiration := os.Getenv(jwtconfig.TokenExpirationEnv)
	defer os.Setenv(jwtconfig.TokenExpirationEnv, originalExpiration)

	os.Setenv(jwtconfig.TokenExpirationEnv, "12")
	exp := jwtconfig.GetTokenExpiration()
	assert.Equal(t, 12*time.Hour, exp)
}

func TestGetTokenExpiration_CustomInvalid(t *testing.T) {
	originalExpiration := os.Getenv(jwtconfig.TokenExpirationEnv)
	defer os.Setenv(jwtconfig.TokenExpirationEnv, originalExpiration)

	os.Setenv(jwtconfig.TokenExpirationEnv, "invalid")
	exp := jwtconfig.GetTokenExpiration()
	assert.Equal(t, 24*time.Hour, exp)
}

func TestGetTokenExpiration_Zero(t *testing.T) {
	originalExpiration := os.Getenv(jwtconfig.TokenExpirationEnv)
	defer os.Setenv(jwtconfig.TokenExpirationEnv, originalExpiration)

	os.Setenv(jwtconfig.TokenExpirationEnv, "0")
	exp := jwtconfig.GetTokenExpiration()
	assert.Equal(t, 0*time.Hour, exp)
}

func TestGetTokenExpiration_Negative(t *testing.T) {
	originalExpiration := os.Getenv(jwtconfig.TokenExpirationEnv)
	defer os.Setenv(jwtconfig.TokenExpirationEnv, originalExpiration)

	os.Setenv(jwtconfig.TokenExpirationEnv, "-5")
	exp := jwtconfig.GetTokenExpiration()
	assert.Equal(t, -5*time.Hour, exp)
}

func TestGetRefreshTokenExpiration_Default(t *testing.T) {
	originalExpiration := os.Getenv(jwtconfig.RefreshExpirationEnv)
	defer os.Setenv(jwtconfig.RefreshExpirationEnv, originalExpiration)

	os.Unsetenv(jwtconfig.RefreshExpirationEnv)
	exp := jwtconfig.GetRefreshTokenExpiration()
	assert.Equal(t, 7*24*time.Hour, exp)
}

func TestGetRefreshTokenExpiration_CustomValid(t *testing.T) {
	originalExpiration := os.Getenv(jwtconfig.RefreshExpirationEnv)
	defer os.Setenv(jwtconfig.RefreshExpirationEnv, originalExpiration)

	os.Setenv(jwtconfig.RefreshExpirationEnv, "48")
	exp := jwtconfig.GetRefreshTokenExpiration()
	assert.Equal(t, 48*time.Hour, exp)
}

func TestGetRefreshTokenExpiration_CustomInvalid(t *testing.T) {
	originalExpiration := os.Getenv(jwtconfig.RefreshExpirationEnv)
	defer os.Setenv(jwtconfig.RefreshExpirationEnv, originalExpiration)

	os.Setenv(jwtconfig.RefreshExpirationEnv, "notanumber")
	exp := jwtconfig.GetRefreshTokenExpiration()
	assert.Equal(t, 7*24*time.Hour, exp)
}

func TestGetRefreshTokenExpiration_Zero(t *testing.T) {
	originalExpiration := os.Getenv(jwtconfig.RefreshExpirationEnv)
	defer os.Setenv(jwtconfig.RefreshExpirationEnv, originalExpiration)

	os.Setenv(jwtconfig.RefreshExpirationEnv, "0")
	exp := jwtconfig.GetRefreshTokenExpiration()
	assert.Equal(t, 0*time.Hour, exp)
}

func TestGetRefreshTokenExpiration_Negative(t *testing.T) {
	originalExpiration := os.Getenv(jwtconfig.RefreshExpirationEnv)
	defer os.Setenv(jwtconfig.RefreshExpirationEnv, originalExpiration)

	os.Setenv(jwtconfig.RefreshExpirationEnv, "-10")
	exp := jwtconfig.GetRefreshTokenExpiration()
	assert.Equal(t, -10*time.Hour, exp)
}

func TestInitializeDefaultConfig(t *testing.T) {
	originalSecret := os.Getenv(jwtconfig.JWTSecretEnv)
	originalTokenExp := os.Getenv(jwtconfig.TokenExpirationEnv)
	originalRefreshExp := os.Getenv(jwtconfig.RefreshExpirationEnv)

	defer func() {
		os.Setenv(jwtconfig.JWTSecretEnv, originalSecret)
		os.Setenv(jwtconfig.TokenExpirationEnv, originalTokenExp)
		os.Setenv(jwtconfig.RefreshExpirationEnv, originalRefreshExp)
	}()

	os.Unsetenv(jwtconfig.JWTSecretEnv)
	os.Unsetenv(jwtconfig.TokenExpirationEnv)
	os.Unsetenv(jwtconfig.RefreshExpirationEnv)

	jwtconfig.InitializeDefaultConfig()

	assert.Equal(t, "default_secret_key", os.Getenv(jwtconfig.JWTSecretEnv))
	assert.Equal(t, "24", os.Getenv(jwtconfig.TokenExpirationEnv))
	assert.Equal(t, "168", os.Getenv(jwtconfig.RefreshExpirationEnv))
}

func TestInitializeDefaultConfig_PartialDefaults(t *testing.T) {
	originalSecret := os.Getenv(jwtconfig.JWTSecretEnv)
	originalTokenExp := os.Getenv(jwtconfig.TokenExpirationEnv)
	originalRefreshExp := os.Getenv(jwtconfig.RefreshExpirationEnv)

	defer func() {
		os.Setenv(jwtconfig.JWTSecretEnv, originalSecret)
		os.Setenv(jwtconfig.TokenExpirationEnv, originalTokenExp)
		os.Setenv(jwtconfig.RefreshExpirationEnv, originalRefreshExp)
	}()

	// Set some values but not others
	os.Setenv(jwtconfig.JWTSecretEnv, "existing_secret")
	os.Unsetenv(jwtconfig.TokenExpirationEnv)
	os.Setenv(jwtconfig.RefreshExpirationEnv, "72")

	jwtconfig.InitializeDefaultConfig()

	// Should preserve existing values and set defaults for missing ones
	assert.Equal(t, "existing_secret", os.Getenv(jwtconfig.JWTSecretEnv))
	assert.Equal(t, "24", os.Getenv(jwtconfig.TokenExpirationEnv))
	assert.Equal(t, "72", os.Getenv(jwtconfig.RefreshExpirationEnv))
}

func TestInitializeDefaultConfig_AllSet(t *testing.T) {
	originalSecret := os.Getenv(jwtconfig.JWTSecretEnv)
	originalTokenExp := os.Getenv(jwtconfig.TokenExpirationEnv)
	originalRefreshExp := os.Getenv(jwtconfig.RefreshExpirationEnv)

	defer func() {
		os.Setenv(jwtconfig.JWTSecretEnv, originalSecret)
		os.Setenv(jwtconfig.TokenExpirationEnv, originalTokenExp)
		os.Setenv(jwtconfig.RefreshExpirationEnv, originalRefreshExp)
	}()

	// Set all values
	os.Setenv(jwtconfig.JWTSecretEnv, "custom_secret")
	os.Setenv(jwtconfig.TokenExpirationEnv, "36")
	os.Setenv(jwtconfig.RefreshExpirationEnv, "240")

	jwtconfig.InitializeDefaultConfig()

	// Should preserve all existing values
	assert.Equal(t, "custom_secret", os.Getenv(jwtconfig.JWTSecretEnv))
	assert.Equal(t, "36", os.Getenv(jwtconfig.TokenExpirationEnv))
	assert.Equal(t, "240", os.Getenv(jwtconfig.RefreshExpirationEnv))
}

func TestConstants(t *testing.T) {
	// Test that constants have expected values
	assert.Equal(t, 24*time.Hour, jwtconfig.DefaultTokenExpiration)
	assert.Equal(t, 7*24*time.Hour, jwtconfig.DefaultRefreshTokenExpiration)
	assert.Equal(t, "JWT_SECRET", jwtconfig.JWTSecretEnv)
	assert.Equal(t, "JWT_TOKEN_EXPIRATION_HOURS", jwtconfig.TokenExpirationEnv)
	assert.Equal(t, "JWT_REFRESH_EXPIRATION_HOURS", jwtconfig.RefreshExpirationEnv)
}

func TestEnvironmentVariableNames(t *testing.T) {
	// Test that environment variable names are correctly defined
	assert.NotEmpty(t, jwtconfig.JWTSecretEnv)
	assert.NotEmpty(t, jwtconfig.TokenExpirationEnv)
	assert.NotEmpty(t, jwtconfig.RefreshExpirationEnv)

	// Test that they are different from each other
	assert.NotEqual(t, jwtconfig.JWTSecretEnv, jwtconfig.TokenExpirationEnv)
	assert.NotEqual(t, jwtconfig.JWTSecretEnv, jwtconfig.RefreshExpirationEnv)
	assert.NotEqual(t, jwtconfig.TokenExpirationEnv, jwtconfig.RefreshExpirationEnv)
}
