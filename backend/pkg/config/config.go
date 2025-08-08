package config

import (
	"os"
)

type Config struct {
	DatabaseURL     string
	JWTSecret       string
	Port            string
	GinMode         string
	StorageProvider string
}

func LoadConfig() *Config {
	return &Config{
		DatabaseURL:     GetEnv("DATABASE_URL", "postgres://authuser:authpass123@localhost:5400/authdb?sslmode=disable"),
		JWTSecret:       GetEnv("JWT_SECRET", "your-secret-key-here"),
		Port:            GetEnv("PORT", "5400"),
		GinMode:         GetEnv("GIN_MODE", "debug"),
		StorageProvider: GetEnv("STORAGE_PROVIDER", "local"),
	}
}

func GetEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
