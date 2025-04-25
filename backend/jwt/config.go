package jwtconfig

import (
	"log"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

const (
	// Default token expiration time (24 hours)
	DefaultTokenExpiration = 24 * time.Hour

	// Default refresh token expiration time (7 days)
	DefaultRefreshTokenExpiration = 7 * 24 * time.Hour

	// Environment variable names
	JWTSecretEnv         = "JWT_SECRET"
	TokenExpirationEnv   = "JWT_TOKEN_EXPIRATION_HOURS"
	RefreshExpirationEnv = "JWT_REFRESH_EXPIRATION_HOURS"
)

// LoadConfig loads environment variables from .env file
func LoadConfig() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: No .env file found. Using default values.")
	}
}

// GetJWTSecret returns the JWT secret from environment
func GetJWTSecret() string {
	secret := os.Getenv(JWTSecretEnv)
	if secret == "" {
		log.Println("Warning: JWT_SECRET not set. Using default secret key. This is not secure for production.")
		secret = "default_secret_key" // Only for development
	}
	return secret
}

// SetJWTSecret sets the JWT secret in environment
func SetJWTSecret(secret string) {
	os.Setenv(JWTSecretEnv, secret)
}

// GetTokenExpiration returns the token expiration duration
func GetTokenExpiration() time.Duration {
	expirationHoursStr := os.Getenv(TokenExpirationEnv)
	if expirationHoursStr == "" {
		return DefaultTokenExpiration
	}

	expirationHours, err := strconv.Atoi(expirationHoursStr)
	if err != nil {
		log.Printf("Warning: Invalid JWT_TOKEN_EXPIRATION_HOURS value: %s. Using default (24 hours).", expirationHoursStr)
		return DefaultTokenExpiration
	}

	return time.Duration(expirationHours) * time.Hour
}

// GetRefreshTokenExpiration returns the refresh token expiration duration
func GetRefreshTokenExpiration() time.Duration {
	expirationHoursStr := os.Getenv(RefreshExpirationEnv)
	if expirationHoursStr == "" {
		return DefaultRefreshTokenExpiration
	}

	expirationHours, err := strconv.Atoi(expirationHoursStr)
	if err != nil {
		log.Printf("Warning: Invalid JWT_REFRESH_EXPIRATION_HOURS value: %s. Using default (168 hours/7 days).", expirationHoursStr)
		return DefaultRefreshTokenExpiration
	}

	return time.Duration(expirationHours) * time.Hour
}

// InitializeDefaultConfig sets default configuration if not already set
func InitializeDefaultConfig() {
	// Only set these if they're not already set
	if os.Getenv(JWTSecretEnv) == "" {
		log.Println("Setting default JWT secret. This should be changed in production.")
		SetJWTSecret("default_secret_key")
	}

	if os.Getenv(TokenExpirationEnv) == "" {
		os.Setenv(TokenExpirationEnv, "24") // 24 hours default
	}

	if os.Getenv(RefreshExpirationEnv) == "" {
		os.Setenv(RefreshExpirationEnv, "168") // 7 days default
	}
}
