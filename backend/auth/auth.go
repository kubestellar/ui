package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	jwtconfig "github.com/kubestellar/ui/jwt"
	"github.com/kubestellar/ui/k8s"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// ConfigMapName and Namespace
const (
	ConfigMapName = "jwt-config"
	Namespace     = "kubestellar"
)

// UserConfig holds configuration for a single user
type UserConfig struct {
	Password    string   `json:"password"`
	Permissions []string `json:"permissions"`
}

// Config struct to hold global and per-user configuration data
type Config struct {
	JWTSecret string                `json:"jwt_secret"`
	Users     map[string]UserConfig `json:"users"`
}

// GetUser retrieves a specific user's configuration
func (c *Config) GetUser(username string) (UserConfig, bool) {
	userConfig, exists := c.Users[username]
	return userConfig, exists
}

// AddUser adds or updates a user in the configuration
func (c *Config) AddUser(username string, password string, permissions []string) {
	if c.Users == nil {
		c.Users = make(map[string]UserConfig)
	}

	c.Users[username] = UserConfig{
		Password:    password,
		Permissions: permissions,
	}
}

// LoadK8sConfigMap checks if the ConfigMap exists, creates it if not, and returns its data.
func LoadK8sConfigMap() (*Config, error) {
	// We'll load the JWT secret from ConfigMap first, then initialize other configs
	// This prevents generating a new random secret on each restart

	// Get the Kubernetes clientset
	clientset, _, err := k8s.GetClientSetWithContext("its1")
	if err != nil {
		return nil, fmt.Errorf("failed to get Kubernetes clientset: %v", err)
	}

	// Check if namespace exists, create it if it doesn't
	if err := ensureNamespaceExists(clientset); err != nil {
		return nil, fmt.Errorf("failed to ensure namespace exists: %v", err)
	}

	// Try to get the ConfigMap
	cm, err := clientset.CoreV1().ConfigMaps(Namespace).Get(context.TODO(), ConfigMapName, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			// If the ConfigMap does not exist, create it
			log.Println("ConfigMap not found. Creating a new one with admin user...")
			if err := CreateConfigMap(clientset); err != nil {
				return nil, fmt.Errorf("failed to create ConfigMap: %v", err)
			}
			log.Println("Admin user created successfully")

			// Fetch again after creation
			cm, err = clientset.CoreV1().ConfigMaps(Namespace).Get(context.TODO(), ConfigMapName, metav1.GetOptions{})
			if err != nil {
				return nil, fmt.Errorf("failed to get ConfigMap after creation: %v", err)
			}
		} else {
			return nil, fmt.Errorf("error fetching ConfigMap: %v", err)
		}
	} else {
		log.Println("Admin configuration already exists")
	}

	// Parse the ConfigMap JSON data
	var configData Config
	if err := json.Unmarshal([]byte(cm.Data["config"]), &configData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal ConfigMap data: %v", err)
	}

	// Update JWT secret in environment to match the one from ConfigMap
	// This ensures tokens remain valid after server restarts
	jwtconfig.SetJWTSecret(configData.JWTSecret)

	// Now we can safely load other configs after ensuring JWT secret is set
	jwtconfig.LoadConfig()
	log.Println("ConfigMap loaded successfully and JWT secret updated.")

	return &configData, nil
}

// GetUserByUsername retrieves a user configuration by username
func GetUserByUsername(username string) (UserConfig, bool, error) {
	config, err := LoadK8sConfigMap()
	if err != nil {
		return UserConfig{}, false, fmt.Errorf("failed to load config: %v", err)
	}

	userConfig, exists := config.GetUser(username)
	return userConfig, exists, nil
}

// SaveConfig saves the current configuration to the ConfigMap
func SaveConfig(config *Config) error {
	clientset, _, err := k8s.GetClientSetWithContext("its1")
	if err != nil {
		return fmt.Errorf("failed to get Kubernetes clientset: %v", err)
	}

	// Convert struct to JSON string
	configDataBytes, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %v", err)
	}

	// Try to get the existing ConfigMap
	cm, err := clientset.CoreV1().ConfigMaps(Namespace).Get(context.TODO(), ConfigMapName, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			// Create new ConfigMap if it doesn't exist
			configMap := &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      ConfigMapName,
					Namespace: Namespace,
				},
				Data: map[string]string{
					"config": string(configDataBytes),
				},
			}
			_, err = clientset.CoreV1().ConfigMaps(Namespace).Create(context.TODO(), configMap, metav1.CreateOptions{})
			if err != nil {
				return fmt.Errorf("error creating ConfigMap: %v", err)
			}
		} else {
			return fmt.Errorf("error fetching ConfigMap: %v", err)
		}
	} else {
		// Update existing ConfigMap
		cm.Data = map[string]string{
			"config": string(configDataBytes),
		}
		_, err = clientset.CoreV1().ConfigMaps(Namespace).Update(context.TODO(), cm, metav1.UpdateOptions{})
		if err != nil {
			return fmt.Errorf("error updating ConfigMap: %v", err)
		}
	}

	return nil
}

// CreateConfigMap creates a new ConfigMap with default values.
func CreateConfigMap(clientset *kubernetes.Clientset) error {
	// Get JWT secret from environment
	jwtSecret := jwtconfig.GetJWTSecret()

	defaultConfig := Config{
		JWTSecret: jwtSecret, // Use JWT secret from environment
		Users: map[string]UserConfig{
			"admin": {
				Password:    "admin",
				Permissions: []string{"read", "write", "admin"},
			},
		},
	}

	log.Printf("Creating admin user with JWT secret from environment")

	// Convert struct to JSON string
	configDataBytes, err := json.Marshal(defaultConfig)
	if err != nil {
		return fmt.Errorf("failed to marshal default config: %v", err)
	}

	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ConfigMapName,
			Namespace: Namespace,
		},
		Data: map[string]string{
			"config": string(configDataBytes),
		},
	}

	_, err = clientset.CoreV1().ConfigMaps(Namespace).Create(context.TODO(), configMap, metav1.CreateOptions{})
	if err != nil {
		if errors.IsAlreadyExists(err) {
			log.Println("ConfigMap already exists, skipping creation.")
			return nil
		}
		return fmt.Errorf("error creating ConfigMap: %v", err)
	}

	log.Println("ConfigMap created successfully with admin user.")
	return nil
}

// ensureNamespaceExists checks if the namespace exists and creates it if it doesn't
func ensureNamespaceExists(clientset *kubernetes.Clientset) error {
	_, err := clientset.CoreV1().Namespaces().Get(context.TODO(), Namespace, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			log.Printf("Namespace %s not found. Creating it...", Namespace)
			ns := &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: Namespace,
				},
			}
			_, err = clientset.CoreV1().Namespaces().Create(context.TODO(), ns, metav1.CreateOptions{})
			if err != nil {
				return fmt.Errorf("error creating namespace: %v", err)
			}
			log.Printf("Namespace %s created successfully", Namespace)
		} else {
			return fmt.Errorf("error checking namespace: %v", err)
		}
	}
	return nil
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

// AddOrUpdateUser adds a new user or updates an existing user in the configuration
func AddOrUpdateUser(username, password string, permissions []string) error {
	if username == "" {
		return fmt.Errorf("username cannot be empty")
	}

	config, err := LoadK8sConfigMap()
	if err != nil {
		return fmt.Errorf("failed to load config: %v", err)
	}

	// Check if we're updating the last admin user and removing admin permissions
	if isLastAdminUser(config, username) && !containsPermission(permissions, PermissionAdmin) {
		return fmt.Errorf("cannot remove admin permission from the last admin user")
	}

	config.AddUser(username, password, permissions)

	return SaveConfig(config)
}

// AddUserWithPermissionSet adds a new user with a predefined permission set
func AddUserWithPermissionSet(username, password string, permissionSet PermissionSet) error {
	return AddOrUpdateUser(username, password, permissionSet.Permissions)
}

// RemoveUser removes a user from the configuration
func RemoveUser(username string) error {
	if username == "" {
		return fmt.Errorf("username cannot be empty")
	}

	config, err := LoadK8sConfigMap()
	if err != nil {
		return fmt.Errorf("failed to load config: %v", err)
	}

	if config.Users == nil {
		return fmt.Errorf("no users found in configuration")
	}

	if _, exists := config.Users[username]; !exists {
		return fmt.Errorf("user %s does not exist", username)
	}

	// Check if this is the last admin user
	if isLastAdminUser(config, username) {
		return fmt.Errorf("cannot delete the last admin user")
	}

	delete(config.Users, username)

	return SaveConfig(config)
}

// UpdateUserPermissions updates only the permissions for an existing user
func UpdateUserPermissions(username string, permissions []string) error {
	if username == "" {
		return fmt.Errorf("username cannot be empty")
	}

	config, err := LoadK8sConfigMap()
	if err != nil {
		return fmt.Errorf("failed to load config: %v", err)
	}

	userConfig, exists := config.GetUser(username)
	if !exists {
		return fmt.Errorf("user %s does not exist", username)
	}

	// Check if we're updating the last admin user and removing admin permissions
	if isLastAdminUser(config, username) && !containsPermission(permissions, PermissionAdmin) {
		return fmt.Errorf("cannot remove admin permission from the last admin user")
	}

	userConfig.Permissions = permissions
	config.Users[username] = userConfig

	return SaveConfig(config)
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

// ListUsers returns a list of all usernames in the configuration
func ListUsers() ([]string, error) {
	config, err := LoadK8sConfigMap()
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %v", err)
	}

	usernames := make([]string, 0, len(config.Users))
	for username := range config.Users {
		usernames = append(usernames, username)
	}

	return usernames, nil
}

// UserWithPermissions holds a username and its associated permissions
type UserWithPermissions struct {
	Username    string   `json:"username"`
	Password    string   `json:"password,omitempty"` // Password is omitted in responses
	Permissions []string `json:"permissions"`
}

// ListUsersWithPermissions returns detailed information about all users
func ListUsersWithPermissions() ([]UserWithPermissions, error) {
	config, err := LoadK8sConfigMap()
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %v", err)
	}

	users := make([]UserWithPermissions, 0, len(config.Users))
	for username, userConfig := range config.Users {
		users = append(users, UserWithPermissions{
			Username:    username,
			Permissions: userConfig.Permissions,
			// Password is intentionally omitted for security
		})
	}

	return users, nil
}

// GetUserPermissions gets the permissions for a specific user
func GetUserPermissions(username string) ([]string, error) {
	if username == "" {
		return nil, fmt.Errorf("username cannot be empty")
	}

	userConfig, exists, err := GetUserByUsername(username)
	if err != nil {
		return nil, fmt.Errorf("error fetching user: %v", err)
	}

	if !exists {
		return nil, fmt.Errorf("user %s does not exist", username)
	}

	return userConfig.Permissions, nil
}
