package models_test

import (
	"testing"

	"github.com/kubestellar/ui/backend/models"
	"github.com/stretchr/testify/assert"
)

func TestHashAndCheckPassword(t *testing.T) {
	password := "mysecret"
	hash, err := models.HashPassword(password)
	assert.NoError(t, err)
	assert.NotEmpty(t, hash)

	assert.True(t, models.CheckPasswordHash(password, hash))
	assert.False(t, models.CheckPasswordHash("wrongpassword", hash))
}
