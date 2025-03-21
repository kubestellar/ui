package redis

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/kubestellar/ui/log"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

var ctx = context.Background()
var rdb *redis.Client

// mutex for bp operations in redis
var bpMx sync.RWMutex

const filePathKey = "filepath"

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

// stores binding policy
func SetBpCmd(name string, bpJson string) error {
	bpMx.Lock()
	defer bpMx.Unlock()
	err := rdb.HSet(ctx, "BPS", name, bpJson).Err()
	if err != nil {
		return err
	}
	return nil

}

// removes binding policy from the hash
func DeleteBpcmd(name string) error {
	bpMx.Lock()
	defer bpMx.Unlock()
	err := rdb.HDel(ctx, "BPS", name).Err()
	if err != nil {
		return err
	}
	return nil
}

// returns all BPs in the hash
func GetallBpCmd() ([]string, error) {
	bpMx.RLock()
	defer bpMx.RUnlock()
	v, err := rdb.HGetAll(ctx, "BPS").Result()
	if err != nil {
		return nil, err
	}
	var bpsSlice []string
	for _, bp := range v {
		bpsSlice = append(bpsSlice, bp)
	}
	return bpsSlice, nil

}

// intializes redis client
func init() {
	rdb = redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	log.LogInfo("initialized redis client")
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.LogWarn("pls check if redis is runnnig", zap.String("err", err.Error()))
	}
}
