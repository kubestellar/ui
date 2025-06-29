package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func InitDatabase(databaseURL string) error {
	var err error

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
	return createTables()
}

func createTables() error {
	query := `
	-- Create users table
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		username VARCHAR(255) UNIQUE NOT NULL,
		password VARCHAR(255) NOT NULL,
		is_admin BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	-- Create user_permissions table
	CREATE TABLE IF NOT EXISTS user_permissions (
		id SERIAL PRIMARY KEY,
		user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
		component VARCHAR(255) NOT NULL,
		permission VARCHAR(50) NOT NULL CHECK (permission IN ('read', 'write')),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, component)
	);

	-- Create indexes for better performance
	CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
	CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
	CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
	CREATE INDEX IF NOT EXISTS idx_user_permissions_component ON user_permissions(component);
	`

	if _, err := DB.Exec(query); err != nil {
		return fmt.Errorf("failed to create tables: %v", err)
	}

	log.Println("Database tables created successfully")
	return nil
}

// CloseDatabase closes the database connection
func CloseDatabase() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}
