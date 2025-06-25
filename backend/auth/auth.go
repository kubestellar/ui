package auth

import (
	"fmt"

	"github.com/kubestellar/ui/models"
)

// UserConfig holds configuration for a single user (compatibility layer)
type UserConfig struct {
	Password    string   `json:"password"`
	Permissions []string `json:"permissions"`
}

// Config struct to hold global and per-user configuration data (compatibility layer)
type Config struct {
	JWTSecret string                `json:"jwt_secret"`
	Users     map[string]UserConfig `json:"users"`
}

// UserWithPermissions holds a username and its associated permissions (compatibility layer)
type UserWithPermissions struct {
	Username    string   `json:"username"`
	Password    string   `json:"password,omitempty"` // Password is omitted in responses
	Permissions []string `json:"permissions"`
}

// Permission constants
const (
	PermissionRead  = "read"
	PermissionWrite = "write"
	PermissionAdmin = "admin"
)

// PermissionSet represents a predefined set of permissions
type PermissionSet struct {
	Name        string
	Permissions []string
}

// Predefined permission sets
var (
	ReadOnlyPermissions = PermissionSet{
		Name:        "read-only",
		Permissions: []string{PermissionRead},
	}

	StandardUserPermissions = PermissionSet{
		Name:        "standard-user",
		Permissions: []string{PermissionRead, PermissionWrite},
	}

	AdminPermissions = PermissionSet{
		Name:        "admin",
		Permissions: []string{PermissionRead, PermissionWrite, PermissionAdmin},
	}
)

// GetAvailablePermissionSets returns all predefined permission sets
func GetAvailablePermissionSets() []PermissionSet {
	return []PermissionSet{
		ReadOnlyPermissions,
		StandardUserPermissions,
		AdminPermissions,
	}
}

// GetUserByUsername retrieves a user configuration by username (compatibility layer)
func GetUserByUsername(username string) (UserConfig, bool, error) {
	user, err := models.GetUserByUsername(username)
	if err != nil {
		if err.Error() == "user not found" {
			return UserConfig{}, false, nil
		}
		return UserConfig{}, false, fmt.Errorf("failed to get user: %v", err)
	}

	userConfig := UserConfig{
		Password:    "", // Passwords are not returned for security
		Permissions: user.Permissions,
	}

	return userConfig, true, nil
}

// AddOrUpdateUser adds a new user or updates an existing user (compatibility layer)
func AddOrUpdateUser(username, password string, permissions []string) error {
	if username == "" {
		return fmt.Errorf("username cannot be empty")
	}

	// Check if user exists
	existingUser, err := models.GetUserByUsername(username)
	if err != nil && err.Error() != "user not found" {
		return fmt.Errorf("failed to check existing user: %v", err)
	}

	if err != nil && err.Error() == "user not found" {
		// Create new user
		req := models.UserCreateRequest{
			Username:    username,
			Password:    password,
			Permissions: permissions,
		}

		_, err = models.CreateUser(req)
		if err != nil {
			return fmt.Errorf("failed to create user: %v", err)
		}
	} else {
		// Update existing user
		req := models.UserUpdateRequest{
			Password:    password,
			Permissions: permissions,
		}

		_, err = models.UpdateUser(existingUser.ID, req)
		if err != nil {
			return fmt.Errorf("failed to update user: %v", err)
		}
	}

	return nil
}

// AddUserWithPermissionSet adds a new user with a predefined permission set
func AddUserWithPermissionSet(username, password string, permissionSet PermissionSet) error {
	return AddOrUpdateUser(username, password, permissionSet.Permissions)
}

// RemoveUser removes a user from the configuration (compatibility layer)
func RemoveUser(username string) error {
	if username == "" {
		return fmt.Errorf("username cannot be empty")
	}

	// Get user by username to get ID
	user, err := models.GetUserByUsername(username)
	if err != nil {
		if err.Error() == "user not found" {
			return fmt.Errorf("user %s does not exist", username)
		}
		return fmt.Errorf("failed to get user: %v", err)
	}

	// Delete user by ID
	err = models.DeleteUser(user.ID)
	if err != nil {
		return fmt.Errorf("failed to delete user: %v", err)
	}

	return nil
}

// UpdateUserPermissions updates only the permissions for an existing user (compatibility layer)
func UpdateUserPermissions(username string, permissions []string) error {
	if username == "" {
		return fmt.Errorf("username cannot be empty")
	}

	// Get user by username to get ID
	user, err := models.GetUserByUsername(username)
	if err != nil {
		if err.Error() == "user not found" {
			return fmt.Errorf("user %s does not exist", username)
		}
		return fmt.Errorf("failed to get user: %v", err)
	}

	// Update user permissions
	req := models.UserUpdateRequest{
		Permissions: permissions,
	}

	_, err = models.UpdateUser(user.ID, req)
	if err != nil {
		return fmt.Errorf("failed to update user permissions: %v", err)
	}

	return nil
}

// ListUsers returns a list of all usernames in the configuration (compatibility layer)
func ListUsers() ([]string, error) {
	users, err := models.ListUsers()
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %v", err)
	}

	usernames := make([]string, 0, len(users))
	for _, user := range users {
		usernames = append(usernames, user.Username)
	}

	return usernames, nil
}

// ListUsersWithPermissions returns detailed information about all users (compatibility layer)
func ListUsersWithPermissions() ([]UserWithPermissions, error) {
	users, err := models.ListUsers()
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %v", err)
	}

	userWithPermissions := make([]UserWithPermissions, 0, len(users))
	for _, user := range users {
		userWithPermissions = append(userWithPermissions, UserWithPermissions{
			Username:    user.Username,
			Permissions: user.Permissions,
			// Password is intentionally omitted for security
		})
	}

	return userWithPermissions, nil
}

// GetUserPermissions gets the permissions for a specific user (compatibility layer)
func GetUserPermissions(username string) ([]string, error) {
	if username == "" {
		return nil, fmt.Errorf("username cannot be empty")
	}

	user, err := models.GetUserByUsername(username)
	if err != nil {
		if err.Error() == "user not found" {
			return nil, fmt.Errorf("user %s does not exist", username)
		}
		return nil, fmt.Errorf("error fetching user: %v", err)
	}

	return user.Permissions, nil
}

// containsPermission checks if a permission slice contains a specific permission
func containsPermission(permissions []string, permission string) bool {
	for _, p := range permissions {
		if p == permission {
			return true
		}
	}
	return false
}

// isLastAdminUser checks if the given username is the last user with admin permissions
func isLastAdminUser(config *Config, username string) bool {
	if config.Users == nil {
		return false
	}

	currentUser, exists := config.GetUser(username)
	if !exists {
		return false
	}

	// Check if current user has admin permission
	if !containsPermission(currentUser.Permissions, PermissionAdmin) {
		return false
	}

	// Count how many users have admin permission
	adminCount := 0
	for _, user := range config.Users {
		if containsPermission(user.Permissions, PermissionAdmin) {
			adminCount++
		}
	}

	// If there's only one admin user and it's the current user
	return adminCount == 1
}

// GetUser retrieves a specific user's configuration (compatibility layer)
func (c *Config) GetUser(username string) (UserConfig, bool) {
	userConfig, exists := c.Users[username]
	return userConfig, exists
}

// AddUser adds or updates a user in the configuration (compatibility layer)
func (c *Config) AddUser(username string, password string, permissions []string) {
	if c.Users == nil {
		c.Users = make(map[string]UserConfig)
	}

	c.Users[username] = UserConfig{
		Password:    password,
		Permissions: permissions,
	}
}

// LoadK8sConfigMap is kept for compatibility but now returns empty config
// This function is deprecated and should not be used in new code
func LoadK8sConfigMap() (*Config, error) {
	// Return empty config since we're now using PostgreSQL
	return &Config{
		JWTSecret: "",
		Users:     make(map[string]UserConfig),
	}, nil
}

// SaveConfig is kept for compatibility but does nothing
// This function is deprecated and should not be used in new code
func SaveConfig(config *Config) error {
	// No-op since we're now using PostgreSQL
	return nil
}

// CreateConfigMap is kept for compatibility but does nothing
// This function is deprecated and should not be used in new code
func CreateConfigMap(clientset interface{}) error {
	// No-op since we're now using PostgreSQL
	return nil
}

// ensureNamespaceExists is kept for compatibility but does nothing
// This function is deprecated and should not be used in new code
func ensureNamespaceExists(clientset interface{}) error {
	// No-op since we're now using PostgreSQL
	return nil
}
