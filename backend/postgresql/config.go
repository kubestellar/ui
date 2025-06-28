package config

import (
	"os"
)

type Config struct {
	DatabaseURL       string
	JWTSecret         string
	Port              string
	GinMode           string
	AccessTokenSecret string
}

func LoadConfig() *Config {
	return &Config{
		DatabaseURL:       getEnv("DATABASE_URL", "postgres://authuser:authpass123@localhost:5400/authdb?sslmode=disable"),
		JWTSecret:         getEnv("JWT_SECRET", "your-secret-key-here"),
		Port:              getEnv("PORT", "5400"),
		GinMode:           getEnv("GIN_MODE", "debug"),
		AccessTokenSecret: getEnv("ACCESS_TOKEN_SECRET", "your-access-secret-key-here"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
