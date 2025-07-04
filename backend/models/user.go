package models

import (
	"database/sql"
	"fmt"
	"time"

	database "github.com/kubestellar/ui/backend/postgresql/Database"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID          int               `json:"id"`
	Username    string            `json:"username"`
	Password    string            `json:"-"`
	IsAdmin     bool              `json:"is_admin"`
	Permissions map[string]string `json:"permissions"` // component -> permission
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

type Permission struct {
	Component  string `json:"component"`
	Permission string `json:"permission"`
}

// HashPassword hashes a plain text password
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}

// CheckPasswordHash compares a password with its hash
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// CreateUser creates a new user in the database
func CreateUser(username, password string, isAdmin bool) (*User, error) {
	hashedPassword, err := HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %v", err)
	}

	query := `
		INSERT INTO users (username, password, is_admin) 
		VALUES ($1, $2, $3) 
		RETURNING id, username, is_admin, created_at, updated_at`

	user := &User{Permissions: make(map[string]string)}
	err = database.DB.QueryRow(query, username, hashedPassword, isAdmin).Scan(
		&user.ID, &user.Username, &user.IsAdmin, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create user: %v", err)
	}

	return user, nil
}

// GetUserByUsername retrieves a user by username
func GetUserByUsername(username string) (*User, error) {
	query := `SELECT id, username, password, is_admin, created_at, updated_at FROM users WHERE username = $1`

	user := &User{Permissions: make(map[string]string)}
	err := database.DB.QueryRow(query, username).Scan(
		&user.ID, &user.Username, &user.Password, &user.IsAdmin, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get user: %v", err)
	}

	// Load permissions
	permissions, err := GetUserPermissions(user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to load permissions: %v", err)
	}
	user.Permissions = permissions

	return user, nil
}

// AuthenticateUser validates user credentials
func AuthenticateUser(username, password string) (*User, error) {
	user, err := GetUserByUsername(username)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("user not found")
	}

	if !CheckPasswordHash(password, user.Password) {
		return nil, fmt.Errorf("invalid password")
	}

	return user, nil
}

// GetUserPermissions retrieves all permissions for a user
func GetUserPermissions(userID int) (map[string]string, error) {
	query := `SELECT component, permission FROM user_permissions WHERE user_id = $1`
	rows, err := database.DB.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	permissions := make(map[string]string)
	for rows.Next() {
		var component, permission string
		if err := rows.Scan(&component, &permission); err != nil {
			return nil, err
		}
		permissions[component] = permission
	}

	return permissions, nil
}

// SetUserPermissions sets permissions for a user (replaces existing)
func SetUserPermissions(userID int, permissions []Permission) error {
	tx, err := database.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Delete existing permissions
	_, err = tx.Exec("DELETE FROM user_permissions WHERE user_id = $1", userID)
	if err != nil {
		return err
	}

	// Insert new permissions
	for _, perm := range permissions {
		_, err = tx.Exec("INSERT INTO user_permissions (user_id, component, permission) VALUES ($1, $2, $3)",
			userID, perm.Component, perm.Permission)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// UpdateUserPassword updates user password
func UpdateUserPassword(userID int, newPassword string) error {
	hashedPassword, err := HashPassword(newPassword)
	if err != nil {
		return err
	}

	query := `UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	_, err = database.DB.Exec(query, hashedPassword, userID)
	return err
}

// DeleteUser deletes a user and their permissions
func DeleteUser(username string) error {
	query := `DELETE FROM users WHERE username = $1`
	result, err := database.DB.Exec(query, username)
	if err != nil {
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// ListAllUsers retrieves all users with their permissions
func ListAllUsers() ([]*User, error) {
	query := `SELECT id, username, is_admin, created_at, updated_at FROM users ORDER BY username`
	rows, err := database.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*User
	for rows.Next() {
		user := &User{Permissions: make(map[string]string)}
		err := rows.Scan(&user.ID, &user.Username, &user.IsAdmin, &user.CreatedAt, &user.UpdatedAt)
		if err != nil {
			return nil, err
		}

		// Load permissions for each user
		permissions, err := GetUserPermissions(user.ID)
		if err != nil {
			return nil, err
		}
		user.Permissions = permissions

		users = append(users, user)
	}

	return users, nil
}
