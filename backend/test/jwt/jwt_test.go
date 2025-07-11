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
	os.Unsetenv(jwtconfig.JWTSecretEnv)
	secret := jwtconfig.GetJWTSecret()
	assert.Equal(t, "default_secret_key", secret)
}

func TestGetJWTSecret_Custom(t *testing.T) {
	os.Setenv(jwtconfig.JWTSecretEnv, "mysecret")
	secret := jwtconfig.GetJWTSecret()
	assert.Equal(t, "mysecret", secret)
}

func TestSetJWTSecret(t *testing.T) {
	jwtconfig.SetJWTSecret("newsecret")
	assert.Equal(t, "newsecret", os.Getenv(jwtconfig.JWTSecretEnv))
}

func TestGetTokenExpiration_Default(t *testing.T) {
	os.Unsetenv(jwtconfig.TokenExpirationEnv)
	exp := jwtconfig.GetTokenExpiration()
	assert.Equal(t, 24*time.Hour, exp)
}

func TestGetTokenExpiration_CustomValid(t *testing.T) {
	os.Setenv(jwtconfig.TokenExpirationEnv, "12")
	exp := jwtconfig.GetTokenExpiration()
	assert.Equal(t, 12*time.Hour, exp)
}

func TestGetTokenExpiration_CustomInvalid(t *testing.T) {
	os.Setenv(jwtconfig.TokenExpirationEnv, "invalid")
	exp := jwtconfig.GetTokenExpiration()
	assert.Equal(t, 24*time.Hour, exp)
}

func TestGetRefreshTokenExpiration_Default(t *testing.T) {
	os.Unsetenv(jwtconfig.RefreshExpirationEnv)
	exp := jwtconfig.GetRefreshTokenExpiration()
	assert.Equal(t, 7*24*time.Hour, exp)
}

func TestGetRefreshTokenExpiration_CustomValid(t *testing.T) {
	os.Setenv(jwtconfig.RefreshExpirationEnv, "48")
	exp := jwtconfig.GetRefreshTokenExpiration()
	assert.Equal(t, 48*time.Hour, exp)
}

func TestGetRefreshTokenExpiration_CustomInvalid(t *testing.T) {
	os.Setenv(jwtconfig.RefreshExpirationEnv, "notanumber")
	exp := jwtconfig.GetRefreshTokenExpiration()
	assert.Equal(t, 7*24*time.Hour, exp)
}

func TestInitializeDefaultConfig(t *testing.T) {
	os.Unsetenv(jwtconfig.JWTSecretEnv)
	os.Unsetenv(jwtconfig.TokenExpirationEnv)
	os.Unsetenv(jwtconfig.RefreshExpirationEnv)

	jwtconfig.InitializeDefaultConfig()

	assert.Equal(t, "default_secret_key", os.Getenv(jwtconfig.JWTSecretEnv))
	assert.Equal(t, "24", os.Getenv(jwtconfig.TokenExpirationEnv))
	assert.Equal(t, "168", os.Getenv(jwtconfig.RefreshExpirationEnv))
}
