package models_test

import (
	"encoding/json"
	"testing"

	"github.com/kubestellar/ui/backend/models"
	"github.com/stretchr/testify/assert"
)

func TestClusterStructInitialization(t *testing.T) {
	c := models.Cluster{
		Name:   "test-cluster",
		Region: "us-east-1",
		Value:  []string{"v1", "v2"},
		Node:   "node-1",
	}
	assert.Equal(t, "test-cluster", c.Name)
	assert.Equal(t, "us-east-1", c.Region)
	assert.Equal(t, []string{"v1", "v2"}, c.Value)
	assert.Equal(t, "node-1", c.Node)
}

func TestClusterStatusJSONMarshaling(t *testing.T) {
	status := models.ClusterStatus{
		ClusterName: "clusterA",
		Status:      models.StatusOnboarded,
	}
	data, err := json.Marshal(status)
	assert.NoError(t, err)

	jsonStr := string(data)
	assert.Contains(t, jsonStr, "clusterName", "JSON should contain 'clusterName' key")

	var unmarshaled models.ClusterStatus
	err = json.Unmarshal(data, &unmarshaled)
	assert.NoError(t, err)
	assert.Equal(t, status, unmarshaled)
}

func TestOnboardingLogsResponseJSONMarshaling(t *testing.T) {
	logs := []models.OnboardingEvent{
		{
			ClusterName: "clusterA",
			Status:      models.StatusOnboarded,
			Message:     "Onboarded successfully",
			Timestamp:   models.OnboardingEvent{}.Timestamp, // zero value is fine for this test
		},
	}
	resp := models.OnboardingLogsResponse{
		ClusterName: "clusterA",
		Status:      models.StatusOnboarded,
		Logs:        logs,
		Count:       1,
	}
	data, err := json.Marshal(resp)
	assert.NoError(t, err)

	// Unmarshal to a map to check the logs array keys
	var result map[string]interface{}
	err = json.Unmarshal(data, &result)
	assert.NoError(t, err)

	logsArr, ok := result["logs"].([]interface{})
	assert.True(t, ok, "logs should be an array")
	for _, entry := range logsArr {
		logEntry, ok := entry.(map[string]interface{})
		assert.True(t, ok, "each log entry should be a map")
		_, hasClusterName := logEntry["clusterName"]
		assert.True(t, hasClusterName, "each log entry should have 'clusterName' key")
	}
}

func TestOnboardingResponseJSONMarshaling(t *testing.T) {
	resp := models.OnboardingResponse{
		Message:           "Success",
		Status:            models.StatusSuccess,
		LogsEndpoint:      "/logs",
		WebsocketEndpoint: "/ws",
	}
	data, err := json.Marshal(resp)
	assert.NoError(t, err)

	var unmarshaled models.OnboardingResponse
	err = json.Unmarshal(data, &unmarshaled)
	assert.NoError(t, err)
	assert.Equal(t, resp, unmarshaled)

	jsonStr := string(data)
	assert.Contains(t, jsonStr, "logsEndpoint", "JSON should contain 'logsEndpoint' key")
	assert.Contains(t, jsonStr, "websocketEndpoint", "JSON should contain 'websocketEndpoint' key")
}

func TestStatusResponseJSONMarshaling(t *testing.T) {
	resp := models.StatusResponse{
		ClusterName: "clusterA",
		Status:      models.StatusOnboarded,
	}
	data, err := json.Marshal(resp)
	assert.NoError(t, err)

	var unmarshaled models.StatusResponse
	err = json.Unmarshal(data, &unmarshaled)
	assert.NoError(t, err)
	assert.Equal(t, resp, unmarshaled)

	jsonStr := string(data)
	assert.Contains(t, jsonStr, "clusterName", "JSON should contain 'clusterName' key")
	assert.Contains(t, jsonStr, "status", "JSON should contain 'status' key")
}
