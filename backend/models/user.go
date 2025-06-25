package models

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/kubestellar/ui/postgresql"
	"golang.org/x/crypto/bcrypt"
)

// Config struct to hold data from ConfigMap
type Config struct {
	JWTSecret   string `json:"jwt_secret"`
	User        string `json:"user"`
	Password    string `json:"password"`
	Permissions string `json:"permissions"`
}

// User represents an authenticated user with permissions
type User struct {
	ID          int       `json:"id"`
	Username    string    `json:"username"`
	Password    string    `json:"-"` // Password is never returned in JSON
	Permissions []string  `json:"permissions"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// UserCreateRequest represents the request to create a new user
type UserCreateRequest struct {
	Username    string   `json:"username" binding:"required"`
	Password    string   `json:"password" binding:"required"`
	Permissions []string `json:"permissions" binding:"required"`
}

// UserUpdateRequest represents the request to update a user
type UserUpdateRequest struct {
	Password    string   `json:"password,omitempty"`
	Permissions []string `json:"permissions,omitempty"`
}

// CreateUsersTable creates the users table if it doesn't exist
func CreateUsersTable() error {
	db := postgresql.GetDB()
	
	query := `
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		username VARCHAR(255) UNIQUE NOT NULL,
		password_hash VARCHAR(255) NOT NULL,
		permissions JSONB NOT NULL DEFAULT '[]',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);
	
	CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
	`
	
	_, err := db.Exec(query)
	return err
}

// InitializeDefaultAdmin creates the default admin user if no users exist
func InitializeDefaultAdmin() error {
	db := postgresql.GetDB()
	
	// Check if any users exist
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to check existing users: %v", err)
	}
	
	if count > 0 {
		return nil // Admin already exists or other users exist
	}
	
	// Create default admin user
	adminPassword := "admin"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash admin password: %v", err)
	}
	
	permissions := []string{"read", "write", "admin"}
	permissionsJSON, err := json.Marshal(permissions)
	if err != nil {
		return fmt.Errorf("failed to marshal permissions: %v", err)
	}
	
	query := `
	INSERT INTO users (username, password_hash, permissions)
	VALUES ($1, $2, $3)
	`
	
	_, err = db.Exec(query, "admin", string(hashedPassword), string(permissionsJSON))
	if err != nil {
		return fmt.Errorf("failed to create admin user: %v", err)
	}
	
	return nil
}

// AuthenticateUser authenticates a user against the database
func AuthenticateUser(username, password string) (*User, error) {
	db := postgresql.GetDB()
	
	query := `
	SELECT id, username, password_hash, permissions, created_at, updated_at
	FROM users WHERE username = $1
	`
	
	var user User
	var passwordHash string
	var permissionsJSON []byte
	
	err := db.QueryRow(query, username).Scan(
		&user.ID,
		&user.Username,
		&passwordHash,
		&permissionsJSON,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			// Use a generic message to avoid username enumeration
			return nil, errors.New("invalid credentials")
		}
		return nil, fmt.Errorf("database error: %v", err)
	}
	
	// Check password
	err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password))
	if err != nil {
		return nil, errors.New("invalid credentials")
	}
	
	// Parse permissions JSON
	var permissions []string
	if err := json.Unmarshal(permissionsJSON, &permissions); err != nil {
		return nil, fmt.Errorf("failed to parse permissions: %v", err)
	}
	
	user.Permissions = permissions
	return &user, nil
}

// CreateUser creates a new user in the database
func CreateUser(req UserCreateRequest) (*User, error) {
	db := postgresql.GetDB()
	
	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %v", err)
	}
	
	// Convert permissions to JSON
	permissionsJSON, err := json.Marshal(req.Permissions)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize permissions: %v", err)
	}
	
	query := `
	INSERT INTO users (username, password_hash, permissions)
	VALUES ($1, $2, $3)
	RETURNING id, username, permissions, created_at, updated_at
	`
	
	var user User
	var permissionsJSONBytes []byte
	err = db.QueryRow(query, req.Username, string(hashedPassword), string(permissionsJSON)).Scan(
		&user.ID,
		&user.Username,
		&permissionsJSONBytes,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %v", err)
	}
	
	// Parse permissions back
	var permissions []string
	if err := json.Unmarshal(permissionsJSONBytes, &permissions); err != nil {
		return nil, fmt.Errorf("failed to parse permissions: %v", err)
	}
	
	user.Permissions = permissions
	return &user, nil
}

// GetUserByID retrieves a user by ID
func GetUserByID(id int) (*User, error) {
	db := postgresql.GetDB()
	
	query := `
	SELECT id, username, permissions, created_at, updated_at
	FROM users WHERE id = $1
	`
	
	var user User
	var permissionsJSON []byte
	
	err := db.QueryRow(query, id).Scan(
		&user.ID,
		&user.Username,
		&permissionsJSON,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("database error: %v", err)
	}
	
	// Parse permissions JSON
	var permissions []string
	if err := json.Unmarshal(permissionsJSON, &permissions); err != nil {
		return nil, fmt.Errorf("failed to parse permissions: %v", err)
	}
	
	user.Permissions = permissions
	return &user, nil
}

// GetUserByUsername retrieves a user by username
func GetUserByUsername(username string) (*User, error) {
	db := postgresql.GetDB()
	
	query := `
	SELECT id, username, permissions, created_at, updated_at
	FROM users WHERE username = $1
	`
	
	var user User
	var permissionsJSON []byte
	
	err := db.QueryRow(query, username).Scan(
		&user.ID,
		&user.Username,
		&permissionsJSON,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("database error: %v", err)
	}
	
	// Parse permissions JSON
	var permissions []string
	if err := json.Unmarshal(permissionsJSON, &permissions); err != nil {
		return nil, fmt.Errorf("failed to parse permissions: %v", err)
	}
	
	user.Permissions = permissions
	return &user, nil
}

// UpdateUser updates an existing user
func UpdateUser(id int, req UserUpdateRequest) (*User, error) {
	db := postgresql.GetDB()
	
	// Get current user
	currentUser, err := GetUserByID(id)
	if err != nil {
		return nil, err
	}
	
	// Build update query dynamically
	updates := []string{}
	args := []interface{}{}
	argIndex := 1
	
	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, fmt.Errorf("failed to hash password: %v", err)
		}
		updates = append(updates, fmt.Sprintf("password_hash = $%d", argIndex))
		args = append(args, string(hashedPassword))
		argIndex++
	}
	
	if req.Permissions != nil {
		permissionsJSON, err := json.Marshal(req.Permissions)
		if err != nil {
			return nil, fmt.Errorf("failed to serialize permissions: %v", err)
		}
		updates = append(updates, fmt.Sprintf("permissions = $%d", argIndex))
		args = append(args, string(permissionsJSON))
		argIndex++
	}
	
	if len(updates) == 0 {
		return currentUser, nil // No updates
	}
	
	// Add updated_at and WHERE clause
	updates = append(updates, "updated_at = CURRENT_TIMESTAMP")
	args = append(args, id)
	
	query := fmt.Sprintf(`
		UPDATE users 
		SET %s
		WHERE id = $%d
		RETURNING id, username, permissions, created_at, updated_at
	`, updates[0], argIndex)
	
	for i := 1; i < len(updates); i++ {
		query = fmt.Sprintf(`
			UPDATE users 
			SET %s
			WHERE id = $%d
			RETURNING id, username, permissions, created_at, updated_at
		`, updates[i], argIndex+1)
	}
	
	var user User
	var permissionsJSON []byte
	
	err = db.QueryRow(query, args...).Scan(
		&user.ID,
		&user.Username,
		&permissionsJSON,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %v", err)
	}
	
	// Parse permissions JSON
	var permissions []string
	if err := json.Unmarshal(permissionsJSON, &permissions); err != nil {
		return nil, fmt.Errorf("failed to parse permissions: %v", err)
	}
	
	user.Permissions = permissions
	return &user, nil
}

// DeleteUser deletes a user by ID
func DeleteUser(id int) error {
	db := postgresql.GetDB()
	
	// Check if this is the last admin user
	adminCount, err := CountAdminUsers()
	if err != nil {
		return fmt.Errorf("failed to count admin users: %v", err)
	}
	
	if adminCount <= 1 {
		// Check if the user to delete is an admin
		user, err := GetUserByID(id)
		if err != nil {
			return err
		}
		
		if containsPermission(user.Permissions, "admin") {
			return errors.New("cannot delete the last admin user")
		}
	}
	
	query := `DELETE FROM users WHERE id = $1`
	result, err := db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %v", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %v", err)
	}
	
	if rowsAffected == 0 {
		return errors.New("user not found")
	}
	
	return nil
}

// ListUsers retrieves all users
func ListUsers() ([]User, error) {
	db := postgresql.GetDB()
	
	query := `
	SELECT id, username, permissions, created_at, updated_at
	FROM users
	ORDER BY username
	`
	
	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query users: %v", err)
	}
	defer rows.Close()
	
	var users []User
	for rows.Next() {
		var user User
		var permissionsJSON []byte
		
		err := rows.Scan(
			&user.ID,
			&user.Username,
			&permissionsJSON,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %v", err)
		}
		
		// Parse permissions JSON
		var permissions []string
		if err := json.Unmarshal(permissionsJSON, &permissions); err != nil {
			return nil, fmt.Errorf("failed to parse permissions: %v", err)
		}
		
		user.Permissions = permissions
		users = append(users, user)
	}
	
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating users: %v", err)
	}
	
	return users, nil
}

// CountAdminUsers counts how many users have admin permission
func CountAdminUsers() (int, error) {
	db := postgresql.GetDB()
	
	query := `SELECT COUNT(*) FROM users WHERE permissions::text LIKE '%admin%'`
	
	var count int
	err := db.QueryRow(query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count admin users: %v", err)
	}
	
	return count, nil
}

// HasPermission checks if a user has a specific permission
func (u *User) HasPermission(permission string) bool {
	for _, p := range u.Permissions {
		if p == permission {
			return true
		}
	}
	return false
}

// HasAnyPermission checks if the user has any of the specified permissions
func (u *User) HasAnyPermission(permissions ...string) bool {
	for _, requiredPermission := range permissions {
		if u.HasPermission(requiredPermission) {
			return true
		}
	}
	return false
}

// HasAllPermissions checks if the user has all of the specified permissions
func (u *User) HasAllPermissions(permissions ...string) bool {
	for _, requiredPermission := range permissions {
		if !u.HasPermission(requiredPermission) {
			return false
		}
	}
	return true
}

// IsAdmin checks if the user has admin permissions
func (u *User) IsAdmin() bool {
	return u.HasPermission("admin")
}

// Helper function to check if a permission slice contains a specific permission
func containsPermission(permissions []string, permission string) bool {
	for _, p := range permissions {
		if p == permission {
			return true
		}
	}
	return false
}
