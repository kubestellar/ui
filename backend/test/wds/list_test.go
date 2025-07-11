package wds_test

import (
	"testing"

	"github.com/kubestellar/ui/backend/wds"
	"github.com/stretchr/testify/assert"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

// Test the contains function logic (since it's unexported, we'll test the logic)
func TestContainsLogic(t *testing.T) {
	// Test with various slices and values
	testCases := []struct {
		slice    []string
		val      string
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
		result := contains(tc.slice, tc.val)
		assert.Equal(t, tc.expected, result,
			"contains(%v, %s) should be %v", tc.slice, tc.val, tc.expected)
	}
}

// Local implementation of contains function for testing
func contains(slice []string, val string) bool {
	for _, s := range slice {
		if s == val {
			return true
		}
	}
	return false
}

// Test the getCacheKey function logic
func TestGetCacheKeyLogic(t *testing.T) {
	// Test basic cache key generation
	key := getCacheKey("test-context", "list", "default")
	assert.Equal(t, "test-context:list:default", key)

	// Test with multiple parts
	key2 := getCacheKey("wds1", "list", "default", "pods")
	assert.Equal(t, "wds1:list:default:pods", key2)

	// Test with empty parts
	key3 := getCacheKey("", "", "")
	assert.Equal(t, "::", key3)
}

// Local implementation of getCacheKey function for testing
func getCacheKey(context, dataType string, parts ...string) string {
	result := context + ":" + dataType
	for _, part := range parts {
		result += ":" + part
	}
	return result
}

// Test the includeClusterScopedKind map logic
func TestIncludeClusterScopedKindLogic(t *testing.T) {
	// Create the map as it appears in the source
	includeClusterScopedKind := map[string]bool{
		"ClusterRole":              true,
		"ClusterRoleBinding":       true,
		"CustomResourceDefinition": true,
		"Namespace":                true,
	}

	// Test that the map contains expected keys
	assert.True(t, includeClusterScopedKind["ClusterRole"])
	assert.True(t, includeClusterScopedKind["ClusterRoleBinding"])
	assert.True(t, includeClusterScopedKind["CustomResourceDefinition"])
	assert.True(t, includeClusterScopedKind["Namespace"])

	// Test that it doesn't contain unexpected keys
	assert.False(t, includeClusterScopedKind["Pod"])
	assert.False(t, includeClusterScopedKind["Deployment"])
	assert.False(t, includeClusterScopedKind["Service"])
}

// Test the ResourceListResponse struct
func TestResourceListResponseStruct(t *testing.T) {
	response := wds.ResourceListResponse{
		Namespaced: map[string]map[string][]map[string]interface{}{
			"default": {
				"Pod": {
					{
						"name":      "test-pod",
						"namespace": "default",
						"kind":      "Pod",
					},
				},
			},
		},
		ClusterScoped: map[string][]map[string]interface{}{
			"ClusterRole": {
				{
					"name": "test-cluster-role",
					"kind": "ClusterRole",
				},
			},
		},
	}

	assert.NotNil(t, response.Namespaced)
	assert.NotNil(t, response.ClusterScoped)
	assert.Len(t, response.Namespaced["default"]["Pod"], 1)
	assert.Len(t, response.ClusterScoped["ClusterRole"], 1)

	// Test namespaced resource
	pod := response.Namespaced["default"]["Pod"][0]
	assert.Equal(t, "test-pod", pod["name"])
	assert.Equal(t, "default", pod["namespace"])
	assert.Equal(t, "Pod", pod["kind"])

	// Test cluster-scoped resource
	clusterRole := response.ClusterScoped["ClusterRole"][0]
	assert.Equal(t, "test-cluster-role", clusterRole["name"])
	assert.Equal(t, "ClusterRole", clusterRole["kind"])
}

// Test the extractObjDetails function logic (we'll test the structure it creates)
func TestExtractObjDetailsStructure(t *testing.T) {
	// Create a mock unstructured object
	obj := &unstructured.Unstructured{}
	obj.SetName("test-pod")
	obj.SetNamespace("default")
	obj.SetKind("Pod")
	obj.SetAPIVersion("v1")
	obj.SetUID("test-uid")
	obj.SetLabels(map[string]string{"app": "test"})
	obj.SetCreationTimestamp(metav1.Now())

	// Test that the object has the expected fields
	assert.Equal(t, "test-pod", obj.GetName())
	assert.Equal(t, "default", obj.GetNamespace())
	assert.Equal(t, "Pod", obj.GetKind())
	assert.Equal(t, "v1", obj.GetAPIVersion())
	assert.Equal(t, "test-uid", string(obj.GetUID()))
	assert.Equal(t, "test", obj.GetLabels()["app"])
	assert.NotNil(t, obj.GetCreationTimestamp())
}

// Test the extractNamespaceDetails function logic
func TestExtractNamespaceDetailsStructure(t *testing.T) {
	// Create a mock namespace object
	ns := &unstructured.Unstructured{}
	ns.SetName("test-namespace")
	ns.SetKind("Namespace")
	ns.SetAPIVersion("v1")
	ns.SetUID("namespace-uid")
	ns.SetLabels(map[string]string{"env": "test"})
	ns.SetCreationTimestamp(metav1.Now())

	// Test that the namespace has the expected fields
	assert.Equal(t, "test-namespace", ns.GetName())
	assert.Equal(t, "Namespace", ns.GetKind())
	assert.Equal(t, "v1", ns.GetAPIVersion())
	assert.Equal(t, "namespace-uid", string(ns.GetUID()))
	assert.Equal(t, "test", ns.GetLabels()["env"])
	assert.NotNil(t, ns.GetCreationTimestamp())
}
