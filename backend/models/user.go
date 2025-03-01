package models

import (
	"database/sql"
	"errors"
	"fmt"

	"log"

	"github.com/katamyra/kubestellarUI/postgresql"
)

type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Password string `json:"password"`
}

// Initialize database schema
func InitDB() {
	// Check if the users table exists
	var tableName string
	err := postgresql.DB.QueryRow("SELECT table_name FROM information_schema.tables WHERE table_name = 'users'").Scan(&tableName)

	if err == sql.ErrNoRows {
		// Table does not exist, create it
		query := `
		CREATE TABLE users (
			id SERIAL PRIMARY KEY,
			username VARCHAR(50) UNIQUE NOT NULL,
			password TEXT NOT NULL
		);`
		_, err = postgresql.DB.Exec(query)
		if err != nil {
			log.Fatal("Failed to create users table:", err)
		}
		fmt.Println("✅ Users table created")
	} else if err != nil {
		log.Fatal("Error checking users table existence:", err)
	}

	// Add admin user if not exists
	var count int
	err = postgresql.DB.QueryRow("SELECT COUNT(*) FROM users WHERE username = 'admin'").Scan(&count)
	if err != nil {
		log.Fatal("Error checking admin user existence:", err)
	}

	if count == 0 {
		_, err = postgresql.DB.Exec("INSERT INTO users (username, password) VALUES ('admin', '')")
		if err != nil {
			log.Fatal("Failed to insert admin user:", err)
		}
		fmt.Println("✅ Admin user added")
	}
}

// Authenticate user
func AuthenticateUser(username, password string) (*User, error) {
	var user User
	err := postgresql.DB.QueryRow("SELECT id, username, password FROM users WHERE username=$1", username).
		Scan(&user.ID, &user.Username, &user.Password)

	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if user.Password != password {
		return nil, errors.New("invalid credentials")
	}

	return &user, nil
}
