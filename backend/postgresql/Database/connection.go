package database

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func InitDatabase(databaseURL string) error {
	var err error

	// Extract dbname and connection string for the 'postgres' database
	dbName, postgresDBURL := parseDatabaseURL(databaseURL)

	// Connect to the 'postgres' database to check if the target database exists
	tempDB, err := sql.Open("postgres", postgresDBURL)
	if err != nil {
		return fmt.Errorf("failed to open connection to postgres database: %v", err)
	}
	defer tempDB.Close()

	// Check if the database exists
	var exists bool
	err = tempDB.QueryRow("SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)", dbName).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check if database exists: %v", err)
	}

	// If the database doesn't exist, create it
	if !exists {
		log.Printf("Database '%s' does not exist, creating...", dbName)
		_, err = tempDB.Exec(fmt.Sprintf("CREATE DATABASE %s", dbName))
		if err != nil {
			return fmt.Errorf("failed to create database: %v", err)
		}
		log.Printf("Database '%s' created successfully", dbName)
	}

	// Retry connection logic for Docker environment
	maxRetries := 30
	retryInterval := 2 * time.Second

	for i := 0; i < maxRetries; i++ {
		DB, err = sql.Open("postgres", databaseURL)
		if err != nil {
			log.Printf("Failed to open database connection (attempt %d/%d): %v", i+1, maxRetries, err)
			time.Sleep(retryInterval)
			continue
		}

		// Test the connection
		err = DB.Ping()
		if err != nil {
			log.Printf("Failed to ping database (attempt %d/%d): %v", i+1, maxRetries, err)
			DB.Close()
			time.Sleep(retryInterval)
			continue
		}

		// Connection successful
		break
	}

	if err != nil {
		return fmt.Errorf("failed to connect to database after %d attempts: %v", maxRetries, err)
	}

	// Configure connection pool
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)
	DB.SetConnMaxLifetime(5 * time.Minute)

	log.Println("Database connected successfully")
	return nil
}

// parseDatabaseURL extracts the database name and returns a connection string to the 'postgres' database.
func parseDatabaseURL(databaseURL string) (string, string) {
	// postgres://authuser:authpass123@127.0.0.1:5400/authdbui?sslmode=disable
	// Find the last /
	lastSlash := strings.LastIndex(databaseURL, "/")
	// Find the ?
	questionMark := strings.Index(databaseURL, "?")

	dbName := databaseURL[lastSlash+1 : questionMark]
	postgresDBURL := databaseURL[:lastSlash+1] + "postgres" + databaseURL[questionMark:]

	return dbName, postgresDBURL
}


// CloseDatabase closes the database connection
func CloseDatabase() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}
