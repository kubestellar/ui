package jwtconfig

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Load environment variables
func LoadConfig() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: No .env file found. Using default values.")
	}
}

// Get JWT secret from environment
func GetJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "default_secret_key" // Change in production
	}
	return secret
}

func SetJWTSecret(secret string) {
	os.Setenv("JWT_SECRET", secret)
}
