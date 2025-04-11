package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubestellar/ui/log"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

var ctx = context.Background()
var rdb *redis.Client

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
	err := rdb.HSet(ctx, "BPS", name, bpJson).Err()
	if err != nil {
		return err
	}
	return nil

}

// removes binding policy from the hash
func DeleteBpcmd(name string) error {
	err := rdb.HDel(ctx, "BPS", name).Err()
	if err != nil {
		return err
	}
	return nil
}

// returns all BPs in the hash
func GetallBpCmd() ([]string, error) {
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

// SetJSONValue sets a JSON value in Redis with an optional expiration
// key: Redis key to store the JSON under
// value: Any Go struct or map that can be marshalled to JSON
// expiration: Time until the key expires (0 for no expiration)
func SetJSONValue(key string, value interface{}, expiration time.Duration) error {
	// Marshal the value to JSON
	jsonData, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %v", err)
	}

	// Store the JSON string in Redis
	if err := rdb.Set(ctx, key, string(jsonData), expiration).Err(); err != nil {
		return fmt.Errorf("failed to set JSON value: %v", err)
	}

	return nil
}

// GetJSONValue retrieves a JSON value from Redis and unmarshals it into the provided destination
// key: Redis key to retrieve
// dest: Pointer to a struct or map where the unmarshaled JSON will be stored
// Returns true if the key was found, false if it was a cache miss
func GetJSONValue(key string, dest interface{}) (bool, error) {
	// Get the JSON string from Redis
	val, err := rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		// Key doesn't exist (cache miss)
		return false, nil
	} else if err != nil {
		return false, fmt.Errorf("failed to get JSON value: %v", err)
	}

	// Unmarshal the JSON into the destination
	if err := json.Unmarshal([]byte(val), dest); err != nil {
		return true, fmt.Errorf("failed to unmarshal JSON: %v", err)
	}

	return true, nil
}

// SetJSONHash stores a JSON value in a Redis hash
// hashKey: The Redis hash key
// field: The field within the hash
// value: Any Go struct or map that can be marshalled to JSON
func SetJSONHash(hashKey string, field string, value interface{}) error {
	// Marshal the value to JSON
	jsonData, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %v", err)
	}

	// Store the JSON string in Redis hash
	if err := rdb.HSet(ctx, hashKey, field, string(jsonData)).Err(); err != nil {
		return fmt.Errorf("failed to set JSON hash value: %v", err)
	}

	return nil
}

// GetJSONHash retrieves a JSON value from a Redis hash and unmarshals it
// hashKey: The Redis hash key
// field: The field within the hash
// dest: Pointer to a struct or map where the unmarshaled JSON will be stored
// Returns true if the field was found, false if it was not found
func GetJSONHash(hashKey string, field string, dest interface{}) (bool, error) {
	// Get the JSON string from Redis hash
	val, err := rdb.HGet(ctx, hashKey, field).Result()
	if err == redis.Nil {
		// Field doesn't exist
		return false, nil
	} else if err != nil {
		return false, fmt.Errorf("failed to get JSON hash value: %v", err)
	}

	// Unmarshal the JSON into the destination
	if err := json.Unmarshal([]byte(val), dest); err != nil {
		return true, fmt.Errorf("failed to unmarshal JSON from hash: %v", err)
	}

	return true, nil
}

// GetAllJSONHash retrieves all JSON values from a Redis hash
// hashKey: The Redis hash key
// Returns a map of field names to unmarshaled JSON values
func GetAllJSONHash(hashKey string) (map[string]json.RawMessage, error) {
	// Get all fields and values from the hash
	values, err := rdb.HGetAll(ctx, hashKey).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get all JSON hash values: %v", err)
	}

	result := make(map[string]json.RawMessage)
	for field, jsonString := range values {
		result[field] = json.RawMessage(jsonString)
	}

	return result, nil
}
