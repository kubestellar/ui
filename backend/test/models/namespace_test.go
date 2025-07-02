package models_test

import (
	"encoding/json"
	"testing"

	"github.com/kubestellar/ui/models"
	"github.com/stretchr/testify/assert"
)

func TestNamespaceStructInitialization(t *testing.T) {
	ns := models.Namespace{
		Name:        "test-ns",
		Status:      "Active",
		Labels:      map[string]string{"env": "prod"},
		Pods:        []string{"pod1", "pod2"},
		Deployments: []string{"deploy1"},
		Services:    []string{"svc1"},
	}
	assert.Equal(t, "test-ns", ns.Name)
	assert.Equal(t, "Active", ns.Status)
	assert.Equal(t, map[string]string{"env": "prod"}, ns.Labels)
	assert.Equal(t, []string{"pod1", "pod2"}, ns.Pods)
	assert.Equal(t, []string{"deploy1"}, ns.Deployments)
	assert.Equal(t, []string{"svc1"}, ns.Services)
}

func TestNamespaceJSONMarshaling(t *testing.T) {
	ns := models.Namespace{
		Name:        "test-ns",
		Status:      "Active",
		Labels:      map[string]string{"env": "prod"},
		Pods:        []string{"pod1", "pod2"},
		Deployments: []string{"deploy1"},
		Services:    []string{"svc1"},
	}
	data, err := json.Marshal(ns)
	assert.NoError(t, err)

	// Unmarshal to a map to check for the correct key
	var result map[string]interface{}
	err = json.Unmarshal(data, &result)
	assert.NoError(t, err)

	_, hasName := result["name"]
	_, hasNamespaceName := result["namespaceName"]
	assert.True(t, hasName, "JSON should contain 'name' key")
	assert.False(t, hasNamespaceName, "JSON should not contain 'namespaceName' key")

	var unmarshaled models.Namespace
	err = json.Unmarshal(data, &unmarshaled)
	assert.NoError(t, err)
	assert.Equal(t, ns, unmarshaled)
}
