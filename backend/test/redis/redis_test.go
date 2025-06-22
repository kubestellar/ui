package redis_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"

	redisPkg "github.com/kubestellar/ui/redis"
)

func setupRedisEnv() {
	_ = os.Setenv("REDIS_HOST", "localhost")
	_ = os.Setenv("REDIS_PORT", "6379")
}

// isRedisAvailable checks if Redis is available for testing
func isRedisAvailable() bool {
	setupRedisEnv()

	rdb := redis.NewClient(&redis.Options{
		Addr:         "localhost:6379",
		DialTimeout:  1 * time.Second,
		ReadTimeout:  1 * time.Second,
		WriteTimeout: 1 * time.Second,
		MaxRetries:   1,
	})
	defer rdb.Close()

	ctx := context.Background()
	err := rdb.Ping(ctx).Err()
	return err == nil
}

func TestSetAndGetNamespaceCache(t *testing.T) {
	if !isRedisAvailable() {
		t.Skip("Redis is not available, skipping test")
	}

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
	if !isRedisAvailable() {
		t.Skip("Redis is not available, skipping test")
	}

	setupRedisEnv()

	path := "/tmp/test/path.yaml"
	err := redisPkg.SetFilePath(path)
	assert.NoError(t, err)

	result, err := redisPkg.GetFilePath()
	assert.NoError(t, err)
	assert.Equal(t, path, result)
}

func TestSetAndGetRepoURL(t *testing.T) {
	if !isRedisAvailable() {
		t.Skip("Redis is not available, skipping test")
	}

	setupRedisEnv()

	url := "https://github.com/example/repo"
	err := redisPkg.SetRepoURL(url)
	assert.NoError(t, err)

	result, err := redisPkg.GetRepoURL()
	assert.NoError(t, err)
	assert.Equal(t, url, result)
}

func TestSetAndGetGitToken(t *testing.T) {
	if !isRedisAvailable() {
		t.Skip("Redis is not available, skipping test")
	}

	setupRedisEnv()

	token := "ghp_example123456789"
	err := redisPkg.SetGitToken(token)
	assert.NoError(t, err)

	result, err := redisPkg.GetGitToken()
	assert.NoError(t, err)
	assert.Equal(t, token, result)
}
