package admin

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"

	adminPkg "github.com/kubestellar/ui/backend/admin"
	"github.com/stretchr/testify/assert"
)

func TestUserConfigStructure(t *testing.T) {
	// Test UserConfig struct creation and field access
	config := &adminPkg.UserConfig{
		Username:    "testuser",
		Password:    "testpass",
		Permissions: []string{"resources:read", "dashboard:write"},
	}

	assert.Equal(t, "testuser", config.Username)
	assert.Equal(t, "testpass", config.Password)
	assert.Len(t, config.Permissions, 2)
	assert.Equal(t, "resources:read", config.Permissions[0])
	assert.Equal(t, "dashboard:write", config.Permissions[1])
}

func TestUserConfigJSONMarshaling(t *testing.T) {
	// Test UserConfig JSON marshaling
	config := &adminPkg.UserConfig{
		Username:    "testuser",
		Password:    "testpass",
		Permissions: []string{"resources:read", "dashboard:write"},
	}

	// Marshal to JSON
	jsonData, err := json.Marshal(config)
	assert.NoError(t, err, "Should marshal UserConfig to JSON")

	// Unmarshal back
	var unmarshaledConfig adminPkg.UserConfig
	err = json.Unmarshal(jsonData, &unmarshaledConfig)
	assert.NoError(t, err, "Should unmarshal JSON back to UserConfig")

	// Verify data integrity
	assert.Equal(t, config.Username, unmarshaledConfig.Username)
	assert.Equal(t, config.Password, unmarshaledConfig.Password)
	assert.Equal(t, config.Permissions, unmarshaledConfig.Permissions)
}

func TestUserConfigValidation(t *testing.T) {
	// Test UserConfig with empty values
	emptyConfig := &adminPkg.UserConfig{}
	assert.Empty(t, emptyConfig.Username, "Username should be empty by default")
	assert.Empty(t, emptyConfig.Password, "Password should be empty by default")
	assert.Nil(t, emptyConfig.Permissions, "Permissions should be nil by default")

	// Test with nil permissions
	configWithNilPerms := &adminPkg.UserConfig{
		Username:    "testuser",
		Password:    "testpass",
		Permissions: nil,
	}
	assert.Nil(t, configWithNilPerms.Permissions, "Permissions should be nil when explicitly set")
}

func TestUserConfigCopy(t *testing.T) {
	// Test copying UserConfig
	original := &adminPkg.UserConfig{
		Username:    "original-user",
		Password:    "original-pass",
		Permissions: []string{"resources:read"},
	}

	// Create a copy
	copied := *original
	copied.Username = "copied-user"
	copied.Permissions = append(copied.Permissions, "dashboard:write")

	// Verify original is unchanged
	assert.Equal(t, "original-user", original.Username, "Original username should be unchanged")
	assert.Len(t, original.Permissions, 1, "Original permissions should be unchanged")

	// Verify copy has new values
	assert.Equal(t, "copied-user", copied.Username, "Copied username should be changed")
	assert.Len(t, copied.Permissions, 2, "Copied permissions should be changed")
}

func TestUserConfigEquality(t *testing.T) {
	// Test UserConfig equality
	config1 := &adminPkg.UserConfig{
		Username:    "testuser",
		Password:    "testpass",
		Permissions: []string{"resources:read", "dashboard:write"},
	}

	config2 := &adminPkg.UserConfig{
		Username:    "testuser",
		Password:    "testpass",
		Permissions: []string{"resources:read", "dashboard:write"},
	}

	// These should be equal
	assert.Equal(t, config1.Username, config2.Username)
	assert.Equal(t, config1.Password, config2.Password)
	assert.Equal(t, config1.Permissions, config2.Permissions)
}

func TestUserConfigPermissionsFormat(t *testing.T) {
	// Test permissions format validation
	config := &adminPkg.UserConfig{
		Username: "testuser",
		Permissions: []string{
			"resources:read",
			"dashboard:write",
			"system:admin",
		},
	}

	// Verify permissions format (component:permission)
	for _, perm := range config.Permissions {
		parts := strings.Split(perm, ":")
		assert.Len(t, parts, 2, "Permission should be in component:permission format")
		assert.NotEmpty(t, parts[0], "Component should not be empty")
		assert.NotEmpty(t, parts[1], "Permission should not be empty")
	}
}

func TestUserConfigSpecialCharacters(t *testing.T) {
	// Test UserConfig with special characters
	config := &adminPkg.UserConfig{
		Username:    "test-user_with.special@chars",
		Password:    "test-pass_with.special@chars",
		Permissions: []string{"resources:read", "dashboard:write"},
	}

	assert.Equal(t, "test-user_with.special@chars", config.Username)
	assert.Equal(t, "test-pass_with.special@chars", config.Password)
	assert.Len(t, config.Permissions, 2)
}

func TestUserConfigEmptyPermissions(t *testing.T) {
	// Test UserConfig with empty permissions slice
	config := &adminPkg.UserConfig{
		Username:    "testuser",
		Password:    "testpass",
		Permissions: []string{},
	}

	assert.Empty(t, config.Permissions, "Permissions should be empty")
	assert.Len(t, config.Permissions, 0, "Permissions length should be 0")
}

func TestUserConfigLargePermissions(t *testing.T) {
	// Test UserConfig with many permissions
	permissions := make([]string, 100)
	for i := 0; i < 100; i++ {
		permissions[i] = fmt.Sprintf("component%d:permission%d", i, i)
	}

	config := &adminPkg.UserConfig{
		Username:    "testuser",
		Password:    "testpass",
		Permissions: permissions,
	}

	assert.Len(t, config.Permissions, 100, "Should handle large number of permissions")
	assert.Equal(t, "component0:permission0", config.Permissions[0])
	assert.Equal(t, "component99:permission99", config.Permissions[99])
}
