// ===================================
// FILE: auth/admin.go
// ===================================
package auth

import (
	"fmt"
	"log"

	"github.com/kubestellar/ui/backend/models"
	"github.com/kubestellar/ui/backend/utils"
)

// InitializeAdminUser creates default admin user if no users exist
func InitializeAdminUser() error {
	users, err := models.ListAllUsers()
	if err != nil {
		return fmt.Errorf("failed to check existing users: %v", err)
	}

	if len(users) == 0 {
		log.Println("No users found, creating default admin user...")

		adminUser, err := models.CreateUser("admin", "admin", true)
		if err != nil {
			return fmt.Errorf("failed to create admin user: %v", err)
		}

		// Set admin permissions for all components
		adminPermissions := []models.Permission{
			{Component: "users", Permission: "write"},
			{Component: "resources", Permission: "write"},
			{Component: "system", Permission: "write"},
			{Component: "dashboard", Permission: "write"},
		}

		err = models.SetUserPermissions(adminUser.ID, adminPermissions)
		if err != nil {
			return fmt.Errorf("failed to set admin permissions: %v", err)
		}

		log.Printf("Default admin user created successfully with username: admin, password: admin")
	}

	return nil
}

// AddOrUpdateUser creates or updates a user with permissions
func AddOrUpdateUser(username, password string, permissions map[string]string) error {
	// Validate username
	if err := utils.ValidateUsername(username); err != nil {
		return fmt.Errorf("invalid username: %v", err)
	}
	
	// Validate password if provided
	if password != "" {
		if err := utils.ValidatePassword(password); err != nil {
			return fmt.Errorf("invalid password: %v", err)
		}
	}

	existingUser, err := models.GetUserByUsername(username)
	if err != nil {
		return err
	}

	var userID int
	if existingUser == nil {
		// Create new user
		newUser, err := models.CreateUser(username, password, false)
		if err != nil {
			return err
		}
		userID = newUser.ID
	} else {
		// Update existing user
		userID = existingUser.ID
		if password != "" {
			err = models.UpdateUserPassword(userID, password)
			if err != nil {
				return err
			}
		}
	}

	// Convert permissions map to slice
	var permSlice []models.Permission
	for component, permission := range permissions {
		permSlice = append(permSlice, models.Permission{
			Component:  component,
			Permission: permission,
		})
	}

	return models.SetUserPermissions(userID, permSlice)
}

// GetUserByUsername retrieves user configuration
func GetUserByUsername(username string) (*UserConfig, bool, error) {
	// Validate username before querying
	if err := utils.ValidateUsername(username); err != nil {
		return nil, false, fmt.Errorf("invalid username: %v", err)
	}

	user, err := models.GetUserByUsername(username)
	if err != nil {
		return nil, false, err
	}
	if user == nil {
		return nil, false, nil
	}

	config := &UserConfig{
		Username:    user.Username,
		Password:    "", // Don't expose password
		Permissions: make([]string, 0, len(user.Permissions)*2),
	}

	// Convert permissions map to slice format
	for component, permission := range user.Permissions {
		config.Permissions = append(config.Permissions, component+":"+permission)
	}

	return config, true, nil
}

// RemoveUser deletes a user
func RemoveUser(username string) error {
	// Validate username before deletion
	if err := utils.ValidateUsername(username); err != nil {
		return fmt.Errorf("invalid username: %v", err)
	}
	
	return models.DeleteUser(username)
}

// ListUsersWithPermissions returns all users with their permissions
func ListUsersWithPermissions() ([]*models.User, error) {
	return models.ListAllUsers()
}

// UserConfig represents user configuration structure
type UserConfig struct {
	Username    string   `json:"username"`
	Password    string   `json:"password"`
	Permissions []string `json:"permissions"`
}
