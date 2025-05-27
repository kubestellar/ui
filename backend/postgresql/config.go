package postgresql

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

var DB *sql.DB

func LoadConfig() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: No .env file found. Using default values.")
	}
}

func ConnectDB() {
	LoadConfig()

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("POSTGRES_HOST"), os.Getenv("POSTGRES_PORT"),
		os.Getenv("POSTGRES_USER"), os.Getenv("POSTGRES_PASSWORD"),
		os.Getenv("POSTGRES_DB"),
	)

	var err error
	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	err = DB.Ping()
	if err != nil {
		log.Fatal("Database not responding:", err)
	}

	fmt.Println("✅ Connected to PostgreSQL")
}

// CheckDatabaseHealth verifies if the database is accessible and healthy
func CheckDatabaseHealth() error {
	if DB == nil {
		return fmt.Errorf("database connection is not initialized")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := DB.PingContext(ctx)
	if err != nil {
		return fmt.Errorf("database health check failed: %v", err)
	}

	// Test a simple query
	var result int
	err = DB.QueryRowContext(ctx, "SELECT 1").Scan(&result)
	if err != nil {
		return fmt.Errorf("database query test failed: %v", err)
	}

	return nil
}

// GetDatabaseStats returns basic statistics about the database
func GetDatabaseStats() (map[string]interface{}, error) {
	if DB == nil {
		return nil, fmt.Errorf("database connection is not initialized")
	}

	stats := make(map[string]interface{})

	// Get database size
	var dbSize string
	err := DB.QueryRow("SELECT pg_size_pretty(pg_database_size(current_database()))").Scan(&dbSize)
	if err != nil {
		return nil, fmt.Errorf("failed to get database size: %v", err)
	}
	stats["database_size"] = dbSize

	// Get number of tables
	var tableCount int
	err = DB.QueryRow("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'").Scan(&tableCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get table count: %v", err)
	}
	stats["table_count"] = tableCount

	// Get connection info
	dbStats := DB.Stats()
	stats["open_connections"] = dbStats.OpenConnections
	stats["max_open_connections"] = dbStats.MaxOpenConnections
	stats["idle_connections"] = dbStats.Idle

	return stats, nil
}

// PrepareForRestore prepares the database for a restore operation
func PrepareForRestore() error {
	if DB == nil {
		return fmt.Errorf("database connection is not initialized")
	}

	// Close all existing connections
	DB.Close()

	// Wait a moment for connections to close
	time.Sleep(2 * time.Second)

	return nil
}

// ReconnectAfterRestore re-establishes database connection after restore
func ReconnectAfterRestore() error {
	// Wait for database to be ready
	time.Sleep(5 * time.Second)

	// Reconnect
	ConnectDB()

	// Verify connection
	return CheckDatabaseHealth()
}
