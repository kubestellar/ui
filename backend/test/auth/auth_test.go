package auth_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"

	auth "github.com/kubestellar/ui/auth"
	jwtconfig "github.com/kubestellar/ui/jwt"
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
