package bp_test

import (
	"testing"

	"github.com/kubestellar/kubestellar/api/control/v1alpha1"
	"github.com/kubestellar/ui/backend/wds/bp"
	"github.com/stretchr/testify/assert"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Test the StoredBindingPolicy struct
func TestStoredBindingPolicyStruct(t *testing.T) {
	storedBP := bp.StoredBindingPolicy{
		Name:      "test-policy",
		Namespace: "default",
		ClusterSelectors: []map[string]string{
			{
				"kubernetes.io/cluster-name": "test-cluster",
			},
		},
		APIGroups:  []string{"apps"},
		Resources:  []string{"deployments"},
		Namespaces: []string{"default"},
		SpecificWorkloads: []bp.WorkloadInfo{
			{
				APIVersion: "apps/v1",
				Kind:       "Deployment",
				Name:       "test-deployment",
				Namespace:  "default",
			},
		},
		RawYAML: "apiVersion: control.kubestellar.io/v1alpha1\nkind: BindingPolicy",
	}

	assert.Equal(t, "test-policy", storedBP.Name)
	assert.Equal(t, "default", storedBP.Namespace)
	assert.Len(t, storedBP.ClusterSelectors, 1)
	assert.Equal(t, "test-cluster", storedBP.ClusterSelectors[0]["kubernetes.io/cluster-name"])
	assert.Len(t, storedBP.APIGroups, 1)
	assert.Equal(t, "apps", storedBP.APIGroups[0])
	assert.Len(t, storedBP.Resources, 1)
	assert.Equal(t, "deployments", storedBP.Resources[0])
	assert.Len(t, storedBP.Namespaces, 1)
	assert.Equal(t, "default", storedBP.Namespaces[0])
	assert.Len(t, storedBP.SpecificWorkloads, 1)
	assert.Equal(t, "apps/v1", storedBP.SpecificWorkloads[0].APIVersion)
	assert.Equal(t, "Deployment", storedBP.SpecificWorkloads[0].Kind)
	assert.Equal(t, "test-deployment", storedBP.SpecificWorkloads[0].Name)
	assert.Equal(t, "default", storedBP.SpecificWorkloads[0].Namespace)
	assert.Contains(t, storedBP.RawYAML, "apiVersion: control.kubestellar.io/v1alpha1")
}

// Test the WorkloadInfo struct
func TestWorkloadInfoStruct(t *testing.T) {
	workload := bp.WorkloadInfo{
		APIVersion: "apps/v1",
		Kind:       "Deployment",
		Name:       "test-deployment",
		Namespace:  "default",
	}

	assert.Equal(t, "apps/v1", workload.APIVersion)
	assert.Equal(t, "Deployment", workload.Kind)
	assert.Equal(t, "test-deployment", workload.Name)
	assert.Equal(t, "default", workload.Namespace)
}

// Test the BindingPolicyWithStatus struct
func TestBindingPolicyWithStatusStruct(t *testing.T) {
	bpWithStatus := bp.BindingPolicyWithStatus{
		BindingPolicy: v1alpha1.BindingPolicy{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "test-policy",
				Namespace: "default",
			},
		},
		Status:      "active",
		BindingMode: "Downsync",
		Clusters:    []string{"cluster-1", "cluster-2"},
		Workloads:   []string{"apps/v1/deployments", "core/v1/services"},
	}

	assert.Equal(t, "test-policy", bpWithStatus.Name)
	assert.Equal(t, "default", bpWithStatus.Namespace)
	assert.Equal(t, "active", bpWithStatus.Status)
	assert.Equal(t, "Downsync", bpWithStatus.BindingMode)
	assert.Len(t, bpWithStatus.Clusters, 2)
	assert.Contains(t, bpWithStatus.Clusters, "cluster-1")
	assert.Contains(t, bpWithStatus.Clusters, "cluster-2")
	assert.Len(t, bpWithStatus.Workloads, 2)
	assert.Contains(t, bpWithStatus.Workloads, "apps/v1/deployments")
	assert.Contains(t, bpWithStatus.Workloads, "core/v1/services")
}

// Test the UICreatedPolicies map
func TestUICreatedPoliciesMap(t *testing.T) {
	// Test that the map is initialized
	assert.NotNil(t, bp.UICreatedPolicies)

	// Test adding a policy to the map
	testPolicy := &bp.StoredBindingPolicy{
		Name:      "test-policy",
		Namespace: "default",
	}

	bp.UICreatedPolicies["test-policy"] = testPolicy

	// Test retrieving the policy
	retrieved, exists := bp.UICreatedPolicies["test-policy"]
	assert.True(t, exists)
	assert.Equal(t, "test-policy", retrieved.Name)
	assert.Equal(t, "default", retrieved.Namespace)

	// Clean up
	delete(bp.UICreatedPolicies, "test-policy")
}

// Test the contains function logic (since it's unexported)
func TestContainsLogic(t *testing.T) {
	testCases := []struct {
		slice    []string
		str      string
		expected bool
	}{
		{[]string{"foo", "bar", "baz"}, "bar", true},
		{[]string{"foo", "bar", "baz"}, "qux", false},
		{[]string{"foo", "bar", "baz"}, "foo", true},
		{[]string{"foo", "bar", "baz"}, "baz", true},
		{[]string{"foo", "bar", "baz"}, "", false},
		{[]string{}, "bar", false},
		{[]string{}, "", false},
		{nil, "bar", false},
		{[]string{"Foo", "Bar", "Baz"}, "foo", false}, // Case sensitive
		{[]string{"Foo", "Bar", "Baz"}, "Foo", true},
	}

	for _, tc := range testCases {
		result := containsString(tc.slice, tc.str)
		assert.Equal(t, tc.expected, result,
			"contains(%v, %s) should be %v", tc.slice, tc.str, tc.expected)
	}
}

// Local implementation of contains function for testing
func containsString(slice []string, str string) bool {
	for _, s := range slice {
		if s == str {
			return true
		}
	}
	return false
}

// Test the filterBPsByNamespace function logic (since it's unexported)
func TestFilterBPsByNamespaceLogic(t *testing.T) {
	// Test filtering binding policies by namespace
	testCases := []struct {
		bpolicies interface{}
		namespace string
		expected  int
	}{
		{
			[]map[string]interface{}{
				{"name": "policy1", "namespace": "default"},
				{"name": "policy2", "namespace": "kube-system"},
				{"name": "policy3", "namespace": "default"},
			},
			"default",
			2,
		},
		{
			[]map[string]interface{}{
				{"name": "policy1", "namespace": "default"},
				{"name": "policy2", "namespace": "kube-system"},
			},
			"kube-system",
			1,
		},
		{
			[]map[string]interface{}{
				{"name": "policy1", "namespace": "default"},
			},
			"non-existent",
			0,
		},
	}

	for _, tc := range testCases {
		filtered, count := filterBPsByNamespace(tc.bpolicies, tc.namespace)
		assert.Equal(t, tc.expected, count)
		if tc.expected > 0 {
			assert.NotNil(t, filtered)
		} else {
			assert.Nil(t, filtered)
		}
	}
}

// Local implementation of filterBPsByNamespace function for testing
func filterBPsByNamespace(bpolicies interface{}, namespace string) (interface{}, int) {
	if bpolicies == nil {
		return nil, 0
	}

	policies, ok := bpolicies.([]map[string]interface{})
	if !ok {
		return nil, 0
	}

	var filtered []map[string]interface{}
	for _, policy := range policies {
		if policyNS, exists := policy["namespace"]; exists {
			if ns, ok := policyNS.(string); ok && ns == namespace {
				filtered = append(filtered, policy)
			}
		}
	}

	return filtered, len(filtered)
}

// Test the getFirstMapEntry function logic (since it's unexported)
func TestGetFirstMapEntryLogic(t *testing.T) {
	// Test getting first entry from a map
	testMap := map[string]string{
		"key1": "value1",
		"key2": "value2",
		"key3": "value3",
	}

	key, value := getFirstMapEntry(testMap)
	assert.NotEmpty(t, key)
	assert.NotEmpty(t, value)
	assert.Contains(t, testMap, key)
	assert.Equal(t, testMap[key], value)

	// Test with empty map
	emptyMap := map[string]string{}
	emptyKey, emptyValue := getFirstMapEntry(emptyMap)
	assert.Empty(t, emptyKey)
	assert.Empty(t, emptyValue)
}

// Local implementation of getFirstMapEntry function for testing
func getFirstMapEntry(m map[string]string) (string, string) {
	for k, v := range m {
		return k, v
	}
	return "", ""
}

// Test the getMapKeys function logic (since it's unexported)
func TestGetMapKeysLogic(t *testing.T) {
	// Test getting keys from a map
	testMap := map[string]interface{}{
		"key1": "value1",
		"key2": "value2",
		"key3": "value3",
	}

	keys := getMapKeys(testMap)
	assert.Len(t, keys, 3)
	assert.Contains(t, keys, "key1")
	assert.Contains(t, keys, "key2")
	assert.Contains(t, keys, "key3")

	// Test with empty map
	emptyMap := map[string]interface{}{}
	emptyKeys := getMapKeys(emptyMap)
	assert.Empty(t, emptyKeys)
}

// Local implementation of getMapKeys function for testing
func getMapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
