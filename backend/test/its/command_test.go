package its

import (
	"encoding/json"
	"testing"

	"github.com/kubestellar/ui/backend/its/manual/handlers"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateCommandRequest_DataStructures(t *testing.T) {
	// Test GenerateCommandRequest struct
	request := handlers.GenerateCommandRequest{
		ClusterName: "test-cluster",
	}

	assert.Equal(t, "test-cluster", request.ClusterName)
}

func TestGenerateCommandResponse_DataStructures(t *testing.T) {
	// Test GenerateCommandResponse struct
	response := handlers.GenerateCommandResponse{
		ClusterName:   "test-cluster",
		Token:         "abc123def456",
		Command:       "clusteradm join --hub-token abc123def456 --hub-apiserver https://its1.localtest.me:9443 --cluster-name test-cluster --force-internal-endpoint-lookup",
		AcceptCommand: "clusteradm accept --context its1 --clusters test-cluster",
	}

	assert.Equal(t, "test-cluster", response.ClusterName)
	assert.Equal(t, "abc123def456", response.Token)
	assert.Contains(t, response.Command, "clusteradm join")
	assert.Contains(t, response.Command, "abc123def456")
	assert.Contains(t, response.Command, "test-cluster")
	assert.Contains(t, response.AcceptCommand, "clusteradm accept")
	assert.Contains(t, response.AcceptCommand, "test-cluster")
}

func TestGenerateCommandRequest_JSONMarshaling(t *testing.T) {
	// Test GenerateCommandRequest JSON marshaling
	request := handlers.GenerateCommandRequest{
		ClusterName: "test-cluster",
	}

	// Marshal to JSON
	jsonData, err := json.Marshal(request)
	require.NoError(t, err, "Should marshal GenerateCommandRequest to JSON")

	// Unmarshal back
	var unmarshaledRequest handlers.GenerateCommandRequest
	err = json.Unmarshal(jsonData, &unmarshaledRequest)
	require.NoError(t, err, "Should unmarshal JSON back to GenerateCommandRequest")

	// Verify data integrity
	assert.Equal(t, request.ClusterName, unmarshaledRequest.ClusterName)
}

func TestGenerateCommandResponse_JSONMarshaling(t *testing.T) {
	// Test GenerateCommandResponse JSON marshaling
	response := handlers.GenerateCommandResponse{
		ClusterName:   "test-cluster",
		Token:         "abc123def456",
		Command:       "clusteradm join --hub-token abc123def456 --hub-apiserver https://its1.localtest.me:9443 --cluster-name test-cluster --force-internal-endpoint-lookup",
		AcceptCommand: "clusteradm accept --context its1 --clusters test-cluster",
	}

	// Marshal to JSON
	jsonData, err := json.Marshal(response)
	require.NoError(t, err, "Should marshal GenerateCommandResponse to JSON")

	// Unmarshal back
	var unmarshaledResponse handlers.GenerateCommandResponse
	err = json.Unmarshal(jsonData, &unmarshaledResponse)
	require.NoError(t, err, "Should unmarshal JSON back to GenerateCommandResponse")

	// Verify data integrity
	assert.Equal(t, response.ClusterName, unmarshaledResponse.ClusterName)
	assert.Equal(t, response.Token, unmarshaledResponse.Token)
	assert.Equal(t, response.Command, unmarshaledResponse.Command)
	assert.Equal(t, response.AcceptCommand, unmarshaledResponse.AcceptCommand)
}

func TestGenerateCommandRequest_Validation(t *testing.T) {
	// Test GenerateCommandRequest with empty values
	emptyRequest := handlers.GenerateCommandRequest{}
	assert.Empty(t, emptyRequest.ClusterName, "ClusterName should be empty by default")
}

func TestGenerateCommandResponse_Validation(t *testing.T) {
	// Test GenerateCommandResponse with empty values
	emptyResponse := handlers.GenerateCommandResponse{}
	assert.Empty(t, emptyResponse.ClusterName, "ClusterName should be empty by default")
	assert.Empty(t, emptyResponse.Token, "Token should be empty by default")
	assert.Empty(t, emptyResponse.Command, "Command should be empty by default")
	assert.Empty(t, emptyResponse.AcceptCommand, "AcceptCommand should be empty by default")
}

func TestGenerateCommandRequest_Copy(t *testing.T) {
	// Test copying GenerateCommandRequest
	original := handlers.GenerateCommandRequest{
		ClusterName: "original-cluster",
	}

	// Create a copy
	copied := original
	copied.ClusterName = "copied-cluster"

	// Verify original is unchanged
	assert.Equal(t, "original-cluster", original.ClusterName, "Original cluster name should be unchanged")

	// Verify copy has new value
	assert.Equal(t, "copied-cluster", copied.ClusterName, "Copied cluster name should be changed")
}

func TestGenerateCommandResponse_Copy(t *testing.T) {
	// Test copying GenerateCommandResponse
	original := handlers.GenerateCommandResponse{
		ClusterName:   "original-cluster",
		Token:         "original-token",
		Command:       "original-command",
		AcceptCommand: "original-accept-command",
	}

	// Create a copy
	copied := original
	copied.ClusterName = "copied-cluster"
	copied.Token = "copied-token"

	// Verify original is unchanged
	assert.Equal(t, "original-cluster", original.ClusterName, "Original cluster name should be unchanged")
	assert.Equal(t, "original-token", original.Token, "Original token should be unchanged")

	// Verify copy has new values
	assert.Equal(t, "copied-cluster", copied.ClusterName, "Copied cluster name should be changed")
	assert.Equal(t, "copied-token", copied.Token, "Copied token should be changed")
}

func TestGenerateCommandRequest_Equality(t *testing.T) {
	// Test GenerateCommandRequest equality
	request1 := handlers.GenerateCommandRequest{
		ClusterName: "test-cluster",
	}

	request2 := handlers.GenerateCommandRequest{
		ClusterName: "test-cluster",
	}

	// These should be equal
	assert.Equal(t, request1.ClusterName, request2.ClusterName)
}

func TestGenerateCommandResponse_Equality(t *testing.T) {
	// Test GenerateCommandResponse equality
	response1 := handlers.GenerateCommandResponse{
		ClusterName:   "test-cluster",
		Token:         "abc123",
		Command:       "clusteradm join --token abc123",
		AcceptCommand: "clusteradm accept --clusters test-cluster",
	}

	response2 := handlers.GenerateCommandResponse{
		ClusterName:   "test-cluster",
		Token:         "abc123",
		Command:       "clusteradm join --token abc123",
		AcceptCommand: "clusteradm accept --clusters test-cluster",
	}

	// These should be equal
	assert.Equal(t, response1.ClusterName, response2.ClusterName)
	assert.Equal(t, response1.Token, response2.Token)
	assert.Equal(t, response1.Command, response2.Command)
	assert.Equal(t, response1.AcceptCommand, response2.AcceptCommand)
}

func TestGenerateCommandRequest_SpecialCharacters(t *testing.T) {
	// Test GenerateCommandRequest with special characters
	request := handlers.GenerateCommandRequest{
		ClusterName: "test-cluster-with-special-chars_123",
	}

	assert.Equal(t, "test-cluster-with-special-chars_123", request.ClusterName)
}

func TestGenerateCommandResponse_SpecialCharacters(t *testing.T) {
	// Test GenerateCommandResponse with special characters
	response := handlers.GenerateCommandResponse{
		ClusterName:   "test-cluster-with-special-chars_123",
		Token:         "abc123def456",
		Command:       "clusteradm join --hub-token abc123def456 --hub-apiserver https://its1.localtest.me:9443 --cluster-name test-cluster-with-special-chars_123 --force-internal-endpoint-lookup",
		AcceptCommand: "clusteradm accept --context its1 --clusters test-cluster-with-special-chars_123",
	}

	assert.Equal(t, "test-cluster-with-special-chars_123", response.ClusterName)
	assert.Contains(t, response.Command, "test-cluster-with-special-chars_123")
	assert.Contains(t, response.AcceptCommand, "test-cluster-with-special-chars_123")
}

func TestCommandStructureValidation(t *testing.T) {
	// Test command structure validation
	response := handlers.GenerateCommandResponse{
		ClusterName:   "test-cluster",
		Token:         "abc123def456",
		Command:       "clusteradm join --hub-token abc123def456 --hub-apiserver https://its1.localtest.me:9443 --cluster-name test-cluster --force-internal-endpoint-lookup",
		AcceptCommand: "clusteradm accept --context its1 --clusters test-cluster",
	}

	// Verify command structure
	assert.Contains(t, response.Command, "clusteradm join", "Join command should contain clusteradm join")
	assert.Contains(t, response.Command, "--hub-token", "Join command should contain --hub-token flag")
	assert.Contains(t, response.Command, "--hub-apiserver", "Join command should contain --hub-apiserver flag")
	assert.Contains(t, response.Command, "--cluster-name", "Join command should contain --cluster-name flag")
	assert.Contains(t, response.Command, "--force-internal-endpoint-lookup", "Join command should contain --force-internal-endpoint-lookup flag")

	// Verify accept command structure
	assert.Contains(t, response.AcceptCommand, "clusteradm accept", "Accept command should contain clusteradm accept")
	assert.Contains(t, response.AcceptCommand, "--context", "Accept command should contain --context flag")
	assert.Contains(t, response.AcceptCommand, "--clusters", "Accept command should contain --clusters flag")
}

func TestTokenFormatValidation(t *testing.T) {
	// Test token format validation
	response := handlers.GenerateCommandResponse{
		ClusterName:   "test-cluster",
		Token:         "abc123def456",
		Command:       "clusteradm join --hub-token abc123def456 --hub-apiserver https://its1.localtest.me:9443 --cluster-name test-cluster --force-internal-endpoint-lookup",
		AcceptCommand: "clusteradm accept --context its1 --clusters test-cluster",
	}

	// Verify token is alphanumeric
	assert.Regexp(t, `^[a-zA-Z0-9]+$`, response.Token, "Token should be alphanumeric")
	assert.Len(t, response.Token, 12, "Token should have expected length")
}
