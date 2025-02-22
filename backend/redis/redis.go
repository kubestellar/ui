package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()
var rdb *redis.Client

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
