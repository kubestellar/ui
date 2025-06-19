package redis_test

import (
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	redisPkg "github.com/kubestellar/ui/redis"
)

func setupRedisEnv() {
	_ = os.Setenv("REDIS_HOST", "localhost")
	_ = os.Setenv("REDIS_PORT", "6379")
}

func TestSetAndGetNamespaceCache(t *testing.T) {
	setupRedisEnv()

	key := "test:namespace:key"
	value := "example-namespace"

	err := redisPkg.SetNamespaceCache(key, value, 5*time.Second)
	assert.NoError(t, err)

	result, err := redisPkg.GetNamespaceCache(key)
	assert.NoError(t, err)
	assert.Equal(t, value, result)
}

func TestSetAndGetFilePath(t *testing.T) {
	setupRedisEnv()

	path := "/tmp/test/path.yaml"
	err := redisPkg.SetFilePath(path)
	assert.NoError(t, err)

	result, err := redisPkg.GetFilePath()
	assert.NoError(t, err)
	assert.Equal(t, path, result)
}

func TestSetAndGetRepoURL(t *testing.T) {
	setupRedisEnv()

	url := "https://github.com/example/repo"
	err := redisPkg.SetRepoURL(url)
	assert.NoError(t, err)

	result, err := redisPkg.GetRepoURL()
	assert.NoError(t, err)
	assert.Equal(t, url, result)
}

func TestSetAndGetGitToken(t *testing.T) {
	setupRedisEnv()

	token := "ghp_example123456789"
	err := redisPkg.SetGitToken(token)
	assert.NoError(t, err)

	result, err := redisPkg.GetGitToken()
	assert.NoError(t, err)
	assert.Equal(t, token, result)
}
