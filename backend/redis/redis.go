package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/kubestellar/ui/backend/log"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"os"
	"time"
)

var ctx = context.Background()
var rdb *redis.Client

const filePathKey = "filepath"

// SetNamespaceCache sets a namespace data cache in Redis
func SetNamespaceCache(key string, value string, expiration time.Duration) error {
	log.LogInfo("Setting namespace cache",
		zap.String("key", key),
		zap.Duration("expiration", expiration))
	if err := rdb.Set(ctx, key, value, expiration).Err(); err != nil {
		log.LogError("Failed to set namespace cache",
			zap.String("key", key),
			zap.Error(err))
		return fmt.Errorf("failed to set cache: %v", err)
	}
	return nil
}

// GetNamespaceCache retrieves cached namespace data from Redis
func GetNamespaceCache(key string) (string, error) {
	log.LogInfo("Getting namespace cache", zap.String("key", key))
	val, err := rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		log.LogInfo("Namespace cache miss", zap.String("key", key))
		return "", nil // Cache miss
	} else if err != nil {
		log.LogError("Failed to get namespace cache",
			zap.String("key", key),
			zap.Error(err))
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
	// Skip Redis initialization in test mode
	if os.Getenv("TEST_MODE") == "true" {
		log.LogInfo("Running in test mode, skipping Redis initialization")
		return
	}

	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "localhost"
	}
	redisPort := os.Getenv("REDIS_PORT")
	if redisPort == "" {
		redisPort = "6379"
	}
	addr := fmt.Sprintf("%s:%s", redisHost, redisPort)

	rdb = redis.NewClient(&redis.Options{
		Addr:         addr,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
		MaxRetries:   3,
	})

	log.LogInfo("initialized redis client")
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.LogWarn("pls check if redis is runnnig", zap.String("err", err.Error()))
	}
}

// GetClient returns the Redis client instance
func GetClient() *redis.Client {
	return rdb
}

// IsConnected checks if Redis is connected and available
func IsConnected() bool {
	if rdb == nil {
		return false
	}
	return rdb.Ping(ctx).Err() == nil
}

// SetJSONValue sets a JSON value in Redis with an optional expiration
// key: Redis key to store the JSON under
// value: Any Go struct or map that can be marshalled to JSON
// expiration: Time until the key expires (0 for no expiration)
func SetJSONValue(key string, value interface{}, expiration time.Duration) error {
	log.LogInfo("Setting JSON value",
		zap.String("key", key),
		zap.Duration("expiration", expiration))

	jsonData, err := json.Marshal(value)
	if err != nil {
		log.LogError("Failed to marshal JSON value",
			zap.String("key", key),
			zap.Error(err))
		return fmt.Errorf("failed to marshal JSON: %v", err)
	}

	// Store the JSON string in Redis
	if err := rdb.Set(ctx, key, string(jsonData), expiration).Err(); err != nil {
		log.LogError("Failed to set JSON value in Redis",
			zap.String("key", key),
			zap.Error(err))
		return fmt.Errorf("failed to set JSON value: %v", err)
	}

	return nil
}

// GetJSONValue retrieves a JSON value from Redis and unmarshals it into the provided destination
// key: Redis key to retrieve
// dest: Pointer to a struct or map where the unmarshaled JSON will be stored
// Returns true if the key was found, false if it was a cache miss
func GetJSONValue(key string, dest interface{}) (bool, error) {
	log.LogInfo("Getting JSON value", zap.String("key", key))

	val, err := rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		log.LogInfo("JSON value cache miss", zap.String("key", key))
		return false, nil
	} else if err != nil {
		log.LogError("Failed to get JSON value from Redis",
			zap.String("key", key),
			zap.Error(err))
		return false, fmt.Errorf("failed to get JSON value: %v", err)
	}

	if err := json.Unmarshal([]byte(val), dest); err != nil {
		log.LogError("Failed to unmarshal JSON value",
			zap.String("key", key),
			zap.Error(err))
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

// SetWorkloadLabel stores the workload label in Redis
func SetWorkloadLabel(label string) error {
	return rdb.Set(ctx, "workload_label", label, 0).Err()
}

// GetWorkloadLabel gets the workload label from Redis
func GetWorkloadLabel() (string, error) {
	return rdb.Get(ctx, "workload_label").Result()
}

// BindingPolicyCache represents a binding policy in the cache
type BindingPolicyCache struct {
	Name              string              `json:"name"`
	Namespace         string              `json:"namespace"`
	ClusterSelectors  []map[string]string `json:"clusterSelectors"`
	APIGroups         []string            `json:"apiGroups"`
	Resources         []string            `json:"resources"`
	Namespaces        []string            `json:"namespaces"`
	SpecificWorkloads []WorkloadInfo      `json:"specificWorkloads"`
	RawYAML           string              `json:"rawYAML"`
	Status            string              `json:"status"`
	BindingMode       string              `json:"bindingMode"`
	Clusters          []string            `json:"clusters"`
	Workloads         []string            `json:"workloads"`
	CreationTimestamp string              `json:"creationTimestamp"`
}

type WorkloadInfo struct {
	APIVersion string `json:"apiVersion"`
	Kind       string `json:"kind"`
	Name       string `json:"name"`
	Namespace  string `json:"namespace"`
}

const (
	BindingPolicyHashKey = "binding_policies"
	DefaultExpiration    = 24 * time.Hour
)

// StoreBindingPolicy stores a binding policy in Redis with proper type handling
func StoreBindingPolicy(policy *BindingPolicyCache) error {
	log.LogInfo("Storing binding policy",
		zap.String("name", policy.Name),
		zap.String("namespace", policy.Namespace))

	jsonData, err := json.Marshal(policy)
	if err != nil {
		log.LogError("Failed to marshal binding policy",
			zap.String("name", policy.Name),
			zap.Error(err))
		return fmt.Errorf("failed to marshal binding policy: %v", err)
	}

	if err := rdb.HSet(ctx, "binding_policies", policy.Name, string(jsonData)).Err(); err != nil {
		log.LogError("Failed to store binding policy in Redis",
			zap.String("name", policy.Name),
			zap.Error(err))
		return fmt.Errorf("failed to store binding policy: %v", err)
	}

	// Set expiration for the hash
	err = rdb.Expire(ctx, BindingPolicyHashKey, DefaultExpiration).Err()
	if err != nil {
		log.LogWarn("failed to set expiration for binding policy", zap.Error(err))
	}

	log.LogDebug("Successfully stored binding policy in Redis", zap.String("policyName", policy.Name))
	return nil
}

// GetBindingPolicy retrieves a binding policy from Redis by name
func GetBindingPolicy(name string) (*BindingPolicyCache, error) {
	// Check if Redis is available
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis not available: %v", err)
	}

	val, err := rdb.HGet(ctx, BindingPolicyHashKey, name).Result()
	if err == redis.Nil {
		log.LogInfo("Binding policy not found", zap.String("name", name))
		return nil, nil
	} else if err != nil {
		log.LogError("Failed to get binding policy from Redis",
			zap.String("name", name),
			zap.Error(err))
		return nil, fmt.Errorf("failed to get binding policy: %v", err)
	}

	var policy BindingPolicyCache
	if err := json.Unmarshal([]byte(val), &policy); err != nil {
		log.LogError("Failed to unmarshal binding policy",
			zap.String("name", name),
			zap.Error(err))
		return nil, fmt.Errorf("failed to unmarshal binding policy: %v", err)
	}

	// Log YAML content after retrieving
	if policy.RawYAML != "" {
		log.LogDebug("Retrieved binding policy with YAML content",
			zap.String("policyName", policy.Name),
			zap.Int("yamlLength", len(policy.RawYAML)))
	} else {
		log.LogWarn("Retrieved binding policy without YAML content",
			zap.String("policyName", policy.Name))
	}

	return &policy, nil
}

// GetAllBindingPolicies retrieves all binding policies from Redis
func GetAllBindingPolicies() ([]*BindingPolicyCache, error) {
	// Check if Redis is available
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis not available: %v", err)
	}

	values, err := rdb.HGetAll(ctx, BindingPolicyHashKey).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get all binding policies from Redis: %v", err)
	}

	if len(values) == 0 {
		return nil, nil
	}

	policies := make([]*BindingPolicyCache, 0, len(values))
	yamlPolicyCount := 0
	for _, val := range values {
		var policy BindingPolicyCache
		if err := json.Unmarshal([]byte(val), &policy); err != nil {
			log.LogWarn("failed to unmarshal binding policy", zap.Error(err))
			continue
		}

		// Count policies with YAML content
		if policy.RawYAML != "" {
			yamlPolicyCount++
		}

		policies = append(policies, &policy)
	}

	log.LogDebug("Retrieved all binding policies from Redis",
		zap.Int("totalPolicies", len(policies)),
		zap.Int("policiesWithYAML", yamlPolicyCount))

	return policies, nil
}

// DeleteBindingPolicy removes a binding policy from Redis
func DeleteBindingPolicy(name string) error {
	// Check if Redis is available
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.LogWarn("redis not available, skipping cache delete", zap.Error(err))
		return nil // Don't fail the operation if Redis is down
	}

	log.LogInfo("Deleting binding policy", zap.String("name", name))

	if err := rdb.HDel(ctx, BindingPolicyHashKey, name).Err(); err != nil {
		log.LogError("Failed to delete binding policy",
			zap.String("name", name),
			zap.Error(err))
		return fmt.Errorf("failed to delete binding policy: %v", err)
	}

	return nil
}

// DeleteAllBindingPolicies removes all binding policies from Redis
func DeleteAllBindingPolicies() error {
	// Check if Redis is available
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.LogWarn("redis not available, skipping cache delete", zap.Error(err))
		return nil // Don't fail the operation if Redis is down
	}

	err := rdb.Del(ctx, BindingPolicyHashKey).Err()
	if err != nil {
		return fmt.Errorf("failed to delete all binding policies from Redis: %v", err)
	}

	log.LogInfo("Cleared all binding policies from Redis cache")
	return nil
}

// ClearBindingPolicyCache clears the entire binding policy cache
func ClearBindingPolicyCache() error {
	return DeleteAllBindingPolicies()
}
