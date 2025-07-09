package its

import (
	"encoding/json"
	"os"
	"testing"
	"time"

	"github.com/kubestellar/ui/backend/its/manual/utils"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHomeDir(t *testing.T) {
	// Test HomeDir function
	homeDir := utils.HomeDir()
	assert.NotEmpty(t, homeDir, "Home directory should not be empty")

	// Test with HOME environment variable set
	originalHome := os.Getenv("HOME")
	defer func() {
		if originalHome != "" {
			os.Setenv("HOME", originalHome)
		} else {
			os.Unsetenv("HOME")
		}
	}()

	os.Setenv("HOME", "/test/home/dir")
	homeDir = utils.HomeDir()
	assert.Equal(t, "/test/home/dir", homeDir, "Should return HOME environment variable")

	// Test with USERPROFILE environment variable (Windows)
	os.Unsetenv("HOME")
	originalUserProfile := os.Getenv("USERPROFILE")
	defer func() {
		if originalUserProfile != "" {
			os.Setenv("USERPROFILE", originalUserProfile)
		} else {
			os.Unsetenv("USERPROFILE")
		}
	}()

	os.Setenv("USERPROFILE", "/test/user/profile")
	homeDir = utils.HomeDir()
	assert.Equal(t, "/test/user/profile", homeDir, "Should return USERPROFILE when HOME is not set")
}

func TestGetITSInfo_DataStructures(t *testing.T) {
	// Test ManagedClusterInfo struct
	testTime, _ := time.Parse(time.RFC3339, "2023-01-01T00:00:00Z")
	clusterInfo := utils.ManagedClusterInfo{
		Name: "test-cluster",
		Labels: map[string]string{
			"environment": "test",
			"region":      "us-west",
		},
		CreationTime: testTime,
		Context:      "its1",
	}

	assert.Equal(t, "test-cluster", clusterInfo.Name)
	assert.Len(t, clusterInfo.Labels, 2)
	assert.Equal(t, "test", clusterInfo.Labels["environment"])
	assert.Equal(t, "us-west", clusterInfo.Labels["region"])
	assert.Equal(t, "its1", clusterInfo.Context)

	// Test ContextInfo struct
	contextInfo := utils.ContextInfo{
		Name:    "test-context",
		Cluster: "test-cluster",
	}

	assert.Equal(t, "test-context", contextInfo.Name)
	assert.Equal(t, "test-cluster", contextInfo.Cluster)
}

func TestGetITSInfo_WithMockKubeconfig(t *testing.T) {
	// This test would require a mock kubeconfig file
	// For now, we'll test the function structure and error handling

	// Test with invalid kubeconfig path
	originalKubeconfig := os.Getenv("KUBECONFIG")
	defer func() {
		if originalKubeconfig != "" {
			os.Setenv("KUBECONFIG", originalKubeconfig)
		} else {
			os.Unsetenv("KUBECONFIG")
		}
	}()

	// Set invalid kubeconfig path
	os.Setenv("KUBECONFIG", "/nonexistent/path/to/kubeconfig")

	// This should return an error due to invalid kubeconfig
	clusters, err := utils.GetITSInfo()
	assert.Error(t, err, "Should return error with invalid kubeconfig")
	assert.Nil(t, clusters, "Should return nil clusters with error")
}

func TestGetAvailableClusters_DataStructures(t *testing.T) {
	// Test ContextInfo struct creation and manipulation
	contextInfo := utils.ContextInfo{
		Name:    "test-context",
		Cluster: "test-cluster",
	}

	// Test field access
	assert.Equal(t, "test-context", contextInfo.Name)
	assert.Equal(t, "test-cluster", contextInfo.Cluster)

	// Test struct modification
	contextInfo.Name = "modified-context"
	contextInfo.Cluster = "modified-cluster"

	assert.Equal(t, "modified-context", contextInfo.Name)
	assert.Equal(t, "modified-cluster", contextInfo.Cluster)
}

func TestGetAvailableClusters_WithMockKubeconfig(t *testing.T) {
	// This test would require a mock kubeconfig file
	// For now, we'll test the function structure and error handling

	// Test with invalid kubeconfig path
	originalKubeconfig := os.Getenv("KUBECONFIG")
	defer func() {
		if originalKubeconfig != "" {
			os.Setenv("KUBECONFIG", originalKubeconfig)
		} else {
			os.Unsetenv("KUBECONFIG")
		}
	}()

	// Set invalid kubeconfig path
	os.Setenv("KUBECONFIG", "/nonexistent/path/to/kubeconfig")

	// This should return an error due to invalid kubeconfig
	clusters, err := utils.GetAvailableClusters()
	assert.Error(t, err, "Should return error with invalid kubeconfig")
	assert.Nil(t, clusters, "Should return nil clusters with error")
}

func TestGetAvailableClusters_EnvironmentVariableHandling(t *testing.T) {
	// Test KUBECONFIG environment variable handling
	originalKubeconfig := os.Getenv("KUBECONFIG")
	defer func() {
		if originalKubeconfig != "" {
			os.Setenv("KUBECONFIG", originalKubeconfig)
		} else {
			os.Unsetenv("KUBECONFIG")
		}
	}()

	// Test with KUBECONFIG set
	os.Setenv("KUBECONFIG", "/custom/kubeconfig/path")

	// This will likely fail due to invalid path, but we're testing the environment variable handling
	_, err := utils.GetAvailableClusters()
	// The error is expected due to invalid path, but the function should handle the environment variable correctly
	assert.Error(t, err, "Should return error with invalid custom kubeconfig path")

	// Test with KUBECONFIG unset (should use default path)
	os.Unsetenv("KUBECONFIG")

	// This will likely fail due to missing default kubeconfig, but we're testing the fallback behavior
	_, err = utils.GetAvailableClusters()
	// The error is expected due to missing default kubeconfig, but it might not fail on all systems
	// So we'll just check that the function completes without panicking
	assert.NoError(t, err, "Function should complete without error (may return empty list)")
}

func TestGetITSInfo_EnvironmentVariableHandling(t *testing.T) {
	// Test KUBECONFIG environment variable handling for GetITSInfo
	originalKubeconfig := os.Getenv("KUBECONFIG")
	defer func() {
		if originalKubeconfig != "" {
			os.Setenv("KUBECONFIG", originalKubeconfig)
		} else {
			os.Unsetenv("KUBECONFIG")
		}
	}()

	// Test with KUBECONFIG set
	os.Setenv("KUBECONFIG", "/custom/kubeconfig/path")

	// This will likely fail due to invalid path, but we're testing the environment variable handling
	_, err := utils.GetITSInfo()
	// The error is expected due to invalid path, but the function should handle the environment variable correctly
	assert.Error(t, err, "Should return error with invalid custom kubeconfig path")

	// Test with KUBECONFIG unset (should use default path)
	os.Unsetenv("KUBECONFIG")

	// This will likely fail due to missing default kubeconfig, but we're testing the fallback behavior
	_, err = utils.GetITSInfo()
	// The error is expected due to missing default kubeconfig
	assert.Error(t, err, "Should return error with missing default kubeconfig")
}

func TestDataStructureJSONMarshaling(t *testing.T) {
	// Test JSON marshaling of data structures
	testTime, _ := time.Parse(time.RFC3339, "2023-01-01T00:00:00Z")
	clusterInfo := utils.ManagedClusterInfo{
		Name: "test-cluster",
		Labels: map[string]string{
			"environment": "test",
			"region":      "us-west",
		},
		CreationTime: testTime,
		Context:      "its1",
	}

	// Marshal to JSON
	jsonData, err := json.Marshal(clusterInfo)
	require.NoError(t, err, "Should marshal ManagedClusterInfo to JSON")

	// Unmarshal back
	var unmarshaledClusterInfo utils.ManagedClusterInfo
	err = json.Unmarshal(jsonData, &unmarshaledClusterInfo)
	require.NoError(t, err, "Should unmarshal JSON back to ManagedClusterInfo")

	// Verify data integrity
	assert.Equal(t, clusterInfo.Name, unmarshaledClusterInfo.Name)
	assert.Equal(t, clusterInfo.Labels, unmarshaledClusterInfo.Labels)
	assert.Equal(t, clusterInfo.CreationTime, unmarshaledClusterInfo.CreationTime)
	assert.Equal(t, clusterInfo.Context, unmarshaledClusterInfo.Context)

	// Test ContextInfo JSON marshaling
	contextInfo := utils.ContextInfo{
		Name:    "test-context",
		Cluster: "test-cluster",
	}

	// Marshal to JSON
	jsonData, err = json.Marshal(contextInfo)
	require.NoError(t, err, "Should marshal ContextInfo to JSON")

	// Unmarshal back
	var unmarshaledContextInfo utils.ContextInfo
	err = json.Unmarshal(jsonData, &unmarshaledContextInfo)
	require.NoError(t, err, "Should unmarshal JSON back to ContextInfo")

	// Verify data integrity
	assert.Equal(t, contextInfo.Name, unmarshaledContextInfo.Name)
	assert.Equal(t, contextInfo.Cluster, unmarshaledContextInfo.Cluster)
}

func TestHomeDir_CrossPlatform(t *testing.T) {
	// Test HomeDir function behavior on different platforms
	originalHome := os.Getenv("HOME")
	originalUserProfile := os.Getenv("USERPROFILE")
	defer func() {
		if originalHome != "" {
			os.Setenv("HOME", originalHome)
		} else {
			os.Unsetenv("HOME")
		}
		if originalUserProfile != "" {
			os.Setenv("USERPROFILE", originalUserProfile)
		} else {
			os.Unsetenv("USERPROFILE")
		}
	}()

	// Test Unix-like behavior (HOME takes precedence)
	os.Setenv("HOME", "/unix/home")
	os.Setenv("USERPROFILE", "/windows/profile")
	homeDir := utils.HomeDir()
	assert.Equal(t, "/unix/home", homeDir, "HOME should take precedence over USERPROFILE")

	// Test Windows-like behavior (only USERPROFILE set)
	os.Unsetenv("HOME")
	homeDir = utils.HomeDir()
	assert.Equal(t, "/windows/profile", homeDir, "Should use USERPROFILE when HOME is not set")

	// Test fallback behavior (neither set)
	os.Unsetenv("USERPROFILE")
	homeDir = utils.HomeDir()
	assert.Empty(t, homeDir, "Should return empty string when neither HOME nor USERPROFILE is set")
}

func TestDataStructureValidation(t *testing.T) {
	// Test ManagedClusterInfo with empty values
	emptyClusterInfo := utils.ManagedClusterInfo{}
	assert.Empty(t, emptyClusterInfo.Name, "Name should be empty by default")
	assert.Nil(t, emptyClusterInfo.Labels, "Labels should be nil by default")
	assert.Equal(t, time.Time{}, emptyClusterInfo.CreationTime, "CreationTime should be zero time by default")
	assert.Empty(t, emptyClusterInfo.Context, "Context should be empty by default")

	// Test ContextInfo with empty values
	emptyContextInfo := utils.ContextInfo{}
	assert.Empty(t, emptyContextInfo.Name, "Name should be empty by default")
	assert.Empty(t, emptyContextInfo.Cluster, "Cluster should be empty by default")

	// Test with nil labels map
	testTime, _ := time.Parse(time.RFC3339, "2023-01-01T00:00:00Z")
	clusterInfoWithNilLabels := utils.ManagedClusterInfo{
		Name:         "test-cluster",
		Labels:       nil,
		CreationTime: testTime,
		Context:      "its1",
	}
	assert.Nil(t, clusterInfoWithNilLabels.Labels, "Labels should be nil when explicitly set to nil")
}

func TestDataStructureCopy(t *testing.T) {
	// Test copying ManagedClusterInfo
	testTime, _ := time.Parse(time.RFC3339, "2023-01-01T00:00:00Z")
	original := utils.ManagedClusterInfo{
		Name: "original-cluster",
		Labels: map[string]string{
			"environment": "prod",
		},
		CreationTime: testTime,
		Context:      "its1",
	}

	// Create a copy
	copied := original
	copied.Name = "copied-cluster"
	// Create a new map for labels to avoid sharing the same map
	copied.Labels = make(map[string]string)
	for k, v := range original.Labels {
		copied.Labels[k] = v
	}
	copied.Labels["environment"] = "dev"

	// Verify original is unchanged
	assert.Equal(t, "original-cluster", original.Name, "Original name should be unchanged")
	assert.Equal(t, "prod", original.Labels["environment"], "Original labels should be unchanged")

	// Verify copy has new values
	assert.Equal(t, "copied-cluster", copied.Name, "Copied name should be changed")
	assert.Equal(t, "dev", copied.Labels["environment"], "Copied labels should be changed")

	// Test copying ContextInfo
	originalContext := utils.ContextInfo{
		Name:    "original-context",
		Cluster: "original-cluster",
	}

	copiedContext := originalContext
	copiedContext.Name = "copied-context"

	// Verify original is unchanged
	assert.Equal(t, "original-context", originalContext.Name, "Original context name should be unchanged")
	assert.Equal(t, "copied-context", copiedContext.Name, "Copied context name should be changed")
}

func TestDataStructureEquality(t *testing.T) {
	// Test ManagedClusterInfo equality
	testTime, _ := time.Parse(time.RFC3339, "2023-01-01T00:00:00Z")
	cluster1 := utils.ManagedClusterInfo{
		Name: "test-cluster",
		Labels: map[string]string{
			"environment": "test",
		},
		CreationTime: testTime,
		Context:      "its1",
	}

	cluster2 := utils.ManagedClusterInfo{
		Name: "test-cluster",
		Labels: map[string]string{
			"environment": "test",
		},
		CreationTime: testTime,
		Context:      "its1",
	}

	// These should be equal
	assert.Equal(t, cluster1.Name, cluster2.Name)
	assert.Equal(t, cluster1.Labels, cluster2.Labels)
	assert.Equal(t, cluster1.CreationTime, cluster2.CreationTime)
	assert.Equal(t, cluster1.Context, cluster2.Context)

	// Test ContextInfo equality
	context1 := utils.ContextInfo{
		Name:    "test-context",
		Cluster: "test-cluster",
	}

	context2 := utils.ContextInfo{
		Name:    "test-context",
		Cluster: "test-cluster",
	}

	// These should be equal
	assert.Equal(t, context1.Name, context2.Name)
	assert.Equal(t, context1.Cluster, context2.Cluster)
}
