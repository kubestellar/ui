package models_test

import (
	"testing"

	auth "github.com/kubestellar/ui/auth"
	models "github.com/kubestellar/ui/models"
)

// Tests for user
func TestAuthenticateUser(t *testing.T) {
	// add user(s) to test
	userName := "alice"
	password := "secret"
	permissions := []string{"read", "write"}

	// add user
	err := auth.AddOrUpdateUser(userName, password, permissions)
	if err != nil {
		t.Fatalf("failed to add test user: %v", err)
	}
	// remove the user after testing
	defer func() {
		_ = auth.RemoveUser(userName)
	}()

	user, err := models.AuthenticateUser(userName, password)
	if err != nil {
		t.Fatalf("authentication failed: %v", err)
	}

	// check returned user details
	if user.Username != userName {
		t.Errorf("expected username %s, but got %s", userName, user.Username)
	}
	if !user.HasAllPermissions(permissions...) {
		t.Errorf("expected user to have all the permissions: %v", permissions)
	}

	// wrong password case
	_, err = models.AuthenticateUser(userName, "wrongpass")
	if err == nil {
		t.Errorf("expected authentication failure with wrong password")
	} else if err.Error() != "invalid credentials" {
		t.Errorf("expected 'invalid credentials' error, but got: %v", err)
	}
}

func TestHasPermission(t *testing.T) {
	// create test users
	userAlice := &models.User{
		Username:    "alice",
		Password:    "",
		Permissions: []string{"read", "write"},
	}

	if userAlice.HasPermission("read") == false {
		t.Error("expected user to have 'read' permission")
	}
	if userAlice.HasPermission("admin") == true {
		t.Error("did not expect user to have 'admin' permission")
	}
}

func TestHasAnyPermission(t *testing.T) {
	// create test users
	userAlice := &models.User{
		Username:    "alice",
		Password:    "",
		Permissions: []string{"read", "write"},
	}

	if userAlice.HasAnyPermission([]string{"read", "admin"}...) == false {
		t.Error("expected user to have 'read' permission")
	}
	if userAlice.HasAnyPermission([]string{"read", "write"}...) == false {
		t.Error("expected user to have 'read' and 'write' permissions")
	}
	if userAlice.HasAnyPermission([]string{"admin"}...) == true {
		t.Error("did not expect user to have 'admin' permission")
	}
}

func TestHasAllPermissions(t *testing.T) {
	userAlice := &models.User{
		Username:    "alice",
		Password:    "",
		Permissions: []string{"read", "write"},
	}

	if userAlice.HasAllPermissions([]string{"read", "write"}...) == false {
		t.Error("expected user to have all 'read' and 'write' permissions")
	}
	if userAlice.HasAllPermissions([]string{"read", "write", "admin"}...) == true {
		t.Error("did not expect user to have 'admin' permission")
	}
	if userAlice.HasAllPermissions([]string{"write"}...) == false {
		t.Error("expect user to have 'write' permission")
	}
}

func TestIsAdmin(t *testing.T) {
	userAlice := &models.User{
		Username:    "alice",
		Password:    "",
		Permissions: []string{"read", "write"},
	}

	userBob := &models.User{
		Username:    "bob",
		Password:    "",
		Permissions: []string{"read", "write", "admin"},
	}

	if userAlice.IsAdmin() == true {
		t.Error("did not expect user 'alice' to be admin")
	}
	if userBob.IsAdmin() == false {
		t.Error("expected user 'bob' to be admin")
	}
}
