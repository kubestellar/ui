package models

import (
	"errors"

	"github.com/kubestellar/ui/auth"
)

// type User struct {
// 	ID          int      `json:"id"`
// 	Username    string   `json:"username"`
// 	Password    string   `json:"password"`
// 	Permissions []string `json:"permissions"`
// }

// Config struct to hold data from ConfigMap
type Config struct {
	JWTSecret   string `json:"jwt_secret"`
	User        string `json:"user"`
	Password    string `json:"password"`
	Permissions string `json:"permissions"`
}

// User represents an authenticated user with permissions
type User struct {
	Username    string   `json:"username"`
	Password    string   `json:"-"` // Password is never returned in JSON
	Permissions []string `json:"permissions"`
}

// AuthenticateUser authenticates a user against the ConfigMap data
func AuthenticateUser(username, password string) (*User, error) {
	config, err := auth.LoadK8sConfigMap()
	if err != nil {
		return nil, errors.New("authentication system unavailable")
	}

	// Get user configuration
	userConfig, exists := config.GetUser(username)
	if !exists {
		// Use a generic message to avoid username enumeration
		return nil, errors.New("invalid credentials")
	}

	// Check password (skip check if password is empty in config)
	if userConfig.Password != "" && userConfig.Password != password {
		return nil, errors.New("invalid credentials")
	}

	// Create user object
	user := &User{
		Username:    username,
		Password:    "", // Don't include password in the returned object
		Permissions: userConfig.Permissions,
	}

	return user, nil
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
