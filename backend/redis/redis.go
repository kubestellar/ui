package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()
var rdb *redis.Client

const filePathKey = "filepath"

// InitRedis initializes the Redis client
func InitRedis() {
	rdb = redis.NewClient(&redis.Options{
		Addr:     "localhost:6379", // Change if Redis is running on another host
		Password: "",               // Add password if required
		DB:       0,                // Use default DB
	})
}

// SetNamespaceCache sets a namespace data cache in Redis
func SetNamespaceCache(key string, value string, expiration time.Duration) error {
	if err := rdb.Set(ctx, key, value, expiration).Err(); err != nil {
		return fmt.Errorf("failed to set cache: %v", err)
	}
	return nil
}

// GetNamespaceCache retrieves cached namespace data from Redis
func GetNamespaceCache(key string) (string, error) {
	val, err := rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", nil // Cache miss
	} else if err != nil {
		return "", fmt.Errorf("failed to get cache: %v", err)
	}
	return val, nil
}

// SetFilePath sets the file path in Redis
func SetFilePath(filepath string) error {
	if err := rdb.Set(ctx, filePathKey, filepath, 0).Err(); err != nil {
		return fmt.Errorf("failed to set filepath: %v", err)
	}
	return nil
}

// GetFilePath retrieves the file path from Redis
func GetFilePath() (string, error) {
	val, err := rdb.Get(ctx, filePathKey).Result()
	if err == redis.Nil {
		return "", nil // Key not found
	} else if err != nil {
		return "", fmt.Errorf("failed to get filepath: %v", err)
	}
	return val, nil
}

func SetRepoURL(repoURL string) error {
	if err := rdb.Set(ctx, "repoURL", repoURL, 0).Err(); err != nil {
		return fmt.Errorf("failed to set repoURL: %v", err)
	}
	return nil
}

func GetRepoURL() (string, error) {
	val, err := rdb.Get(ctx, "repoURL").Result()
	if err == redis.Nil {
		return "", nil // Key not found
	} else if err != nil {
		return "", fmt.Errorf("failed to get repoURL: %v", err)
	}
	return val, nil
}

func SetBranch(branch string) error {
	if err := rdb.Set(ctx,
		"branch", branch, 0).Err(); err != nil {
		return fmt.Errorf("failed to set branch: %v", err)
	}
	return nil
}

func GetBranch() (string, error) {
	val, err := rdb.Get(ctx, "branch").Result()
	if err == redis.Nil {
		return "", nil // Key not found
	} else if err != nil {
		return "", fmt.Errorf("failed to get branch: %v", err)
	}
	return val, nil
}

func SetGitToken(token string) error {
	if err := rdb.Set(ctx, "gitToken", token, 0).Err(); err != nil {
		return fmt.Errorf("failed to set gitToken: %v", err)
	}
	return nil
}

func GetGitToken() (string, error) {
	val, err := rdb.Get(ctx, "gitToken").Result()
	if err == redis.Nil {
		return "", nil // Key not found
	} else if err != nil {
		return "", fmt.Errorf("failed to get gitToken: %v", err)
	}
	return val, nil
}
