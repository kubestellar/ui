package auth_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	auth "github.com/kubestellar/ui/auth"
)

func TestUserStorage(t *testing.T) {
	cfg := auth.Config{}
	cfg.AddUser("alice", "secret", []string{"read"})

	user, ok := cfg.GetUser("alice")
	assert.True(t, ok)
	assert.Equal(t, "secret", user.Password)
	assert.Equal(t, []string{"read"}, user.Permissions)
}

func TestGetNonExistingUser(t *testing.T) {
	cfg := auth.Config{}
	_, ok := cfg.GetUser("bob")
	assert.False(t, ok)
}

func TestOverwriteUser(t *testing.T) {
	cfg := auth.Config{}
	cfg.AddUser("alice", "secret", []string{"read"})
	cfg.AddUser("alice", "newpass", []string{"write"})

	user, ok := cfg.GetUser("alice")
	assert.True(t, ok)
	assert.Equal(t, "newpass", user.Password)
	assert.Equal(t, []string{"write"}, user.Permissions)
}



