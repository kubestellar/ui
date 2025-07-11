package its

import (
	"encoding/json"
	"fmt"
	"testing"

	"github.com/kubestellar/ui/backend/its/manual/handlers"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCSRDataStructures(t *testing.T) {
	// Test CSR struct
	csr := handlers.CSR{}
	csr.Metadata.Name = "test-csr"
	csr.Status.Conditions = []struct {
		Type   string `json:"type"`
		Status string `json:"status"`
	}{
		{Type: "Approved", Status: "True"},
		{Type: "Pending", Status: "False"},
	}

	assert.Equal(t, "test-csr", csr.Metadata.Name)
	assert.Len(t, csr.Status.Conditions, 2)
	assert.Equal(t, "Approved", csr.Status.Conditions[0].Type)
	assert.Equal(t, "True", csr.Status.Conditions[0].Status)

	// Test CSRList struct
	csrList := handlers.CSRList{
		Items: []handlers.CSR{csr},
	}

	assert.Len(t, csrList.Items, 1)
	assert.Equal(t, "test-csr", csrList.Items[0].Metadata.Name)
}

func TestCSRJSONMarshaling(t *testing.T) {
	// Test CSR JSON marshaling
	csr := handlers.CSR{}
	csr.Metadata.Name = "test-csr"
	csr.Status.Conditions = []struct {
		Type   string `json:"type"`
		Status string `json:"status"`
	}{
		{Type: "Approved", Status: "True"},
		{Type: "Pending", Status: "False"},
	}

	// Marshal to JSON
	jsonData, err := json.Marshal(csr)
	require.NoError(t, err, "Should marshal CSR to JSON")

	// Unmarshal back
	var unmarshaledCSR handlers.CSR
	err = json.Unmarshal(jsonData, &unmarshaledCSR)
	require.NoError(t, err, "Should unmarshal JSON back to CSR")

	// Verify data integrity
	assert.Equal(t, csr.Metadata.Name, unmarshaledCSR.Metadata.Name)
	assert.Len(t, unmarshaledCSR.Status.Conditions, 2)
	assert.Equal(t, csr.Status.Conditions[0].Type, unmarshaledCSR.Status.Conditions[0].Type)
	assert.Equal(t, csr.Status.Conditions[0].Status, unmarshaledCSR.Status.Conditions[0].Status)
}

func TestCSRListJSONMarshaling(t *testing.T) {
	// Test CSRList JSON marshaling
	csr1 := handlers.CSR{}
	csr1.Metadata.Name = "test-csr-1"
	csr1.Status.Conditions = []struct {
		Type   string `json:"type"`
		Status string `json:"status"`
	}{
		{Type: "Approved", Status: "True"},
	}

	csr2 := handlers.CSR{}
	csr2.Metadata.Name = "test-csr-2"
	csr2.Status.Conditions = []struct {
		Type   string `json:"type"`
		Status string `json:"status"`
	}{
		{Type: "Pending", Status: "False"},
	}

	csrList := handlers.CSRList{
		Items: []handlers.CSR{csr1, csr2},
	}

	// Marshal to JSON
	jsonData, err := json.Marshal(csrList)
	require.NoError(t, err, "Should marshal CSRList to JSON")

	// Unmarshal back
	var unmarshaledCSRList handlers.CSRList
	err = json.Unmarshal(jsonData, &unmarshaledCSRList)
	require.NoError(t, err, "Should unmarshal JSON back to CSRList")

	// Verify data integrity
	assert.Len(t, unmarshaledCSRList.Items, 2)
	assert.Equal(t, "test-csr-1", unmarshaledCSRList.Items[0].Metadata.Name)
	assert.Equal(t, "test-csr-2", unmarshaledCSRList.Items[1].Metadata.Name)
	assert.Equal(t, "Approved", unmarshaledCSRList.Items[0].Status.Conditions[0].Type)
	assert.Equal(t, "Pending", unmarshaledCSRList.Items[1].Status.Conditions[0].Type)
}

func TestCSREmptyConditions(t *testing.T) {
	// Test CSR with empty conditions
	csr := handlers.CSR{}
	csr.Metadata.Name = "test-csr"
	csr.Status.Conditions = []struct {
		Type   string `json:"type"`
		Status string `json:"status"`
	}{}

	assert.Empty(t, csr.Status.Conditions, "Conditions should be empty")
	assert.Len(t, csr.Status.Conditions, 0, "Conditions length should be 0")
}

func TestCSRMultipleConditions(t *testing.T) {
	// Test CSR with multiple conditions
	csr := handlers.CSR{}
	csr.Metadata.Name = "test-csr"
	csr.Status.Conditions = []struct {
		Type   string `json:"type"`
		Status string `json:"status"`
	}{
		{Type: "Approved", Status: "True"},
		{Type: "Pending", Status: "False"},
		{Type: "Denied", Status: "False"},
		{Type: "Failed", Status: "False"},
	}

	assert.Len(t, csr.Status.Conditions, 4, "Should have 4 conditions")
	assert.Equal(t, "Approved", csr.Status.Conditions[0].Type)
	assert.Equal(t, "Pending", csr.Status.Conditions[1].Type)
	assert.Equal(t, "Denied", csr.Status.Conditions[2].Type)
	assert.Equal(t, "Failed", csr.Status.Conditions[3].Type)
}

func TestCSRSpecialCharacters(t *testing.T) {
	// Test CSR with special characters in name
	csr := handlers.CSR{}
	csr.Metadata.Name = "test-csr-with-special-chars_123"
	csr.Status.Conditions = []struct {
		Type   string `json:"type"`
		Status string `json:"status"`
	}{
		{Type: "Approved", Status: "True"},
	}

	assert.Equal(t, "test-csr-with-special-chars_123", csr.Metadata.Name)
	assert.Len(t, csr.Status.Conditions, 1)
}

func TestCSRListEmptyItems(t *testing.T) {
	// Test CSRList with empty items
	csrList := handlers.CSRList{
		Items: []handlers.CSR{},
	}

	assert.Empty(t, csrList.Items, "Items should be empty")
	assert.Len(t, csrList.Items, 0, "Items length should be 0")
}

func TestCSRListLargeItems(t *testing.T) {
	// Test CSRList with many items
	items := make([]handlers.CSR, 100)
	for i := 0; i < 100; i++ {
		items[i] = handlers.CSR{}
		items[i].Metadata.Name = fmt.Sprintf("test-csr-%d", i)
		items[i].Status.Conditions = []struct {
			Type   string `json:"type"`
			Status string `json:"status"`
		}{
			{Type: "Approved", Status: "True"},
		}
	}

	csrList := handlers.CSRList{
		Items: items,
	}

	assert.Len(t, csrList.Items, 100, "Should handle large number of items")
	assert.Equal(t, "test-csr-0", csrList.Items[0].Metadata.Name)
	assert.Equal(t, "test-csr-99", csrList.Items[99].Metadata.Name)
}

func TestCSRDataValidation(t *testing.T) {
	// Test CSR data validation
	csr := handlers.CSR{}

	// Test with empty name
	assert.Empty(t, csr.Metadata.Name, "Name should be empty by default")

	// Test with nil conditions
	csr.Status.Conditions = nil
	assert.Nil(t, csr.Status.Conditions, "Conditions should be nil when explicitly set")

	// Test with empty conditions slice
	csr.Status.Conditions = []struct {
		Type   string `json:"type"`
		Status string `json:"status"`
	}{}
	assert.Empty(t, csr.Status.Conditions, "Conditions should be empty when set to empty slice")
}

func TestCSRDataCopy(t *testing.T) {
	// Test copying CSR
	original := handlers.CSR{}
	original.Metadata.Name = "original-csr"
	original.Status.Conditions = []struct {
		Type   string `json:"type"`
		Status string `json:"status"`
	}{
		{Type: "Approved", Status: "True"},
	}

	// Create a copy
	copied := original
	copied.Metadata.Name = "copied-csr"
	copied.Status.Conditions = append(copied.Status.Conditions, struct {
		Type   string `json:"type"`
		Status string `json:"status"`
	}{
		Type: "Pending", Status: "False",
	})

	// Verify original is unchanged
	assert.Equal(t, "original-csr", original.Metadata.Name, "Original name should be unchanged")
	assert.Len(t, original.Status.Conditions, 1, "Original conditions should be unchanged")

	// Verify copy has new values
	assert.Equal(t, "copied-csr", copied.Metadata.Name, "Copied name should be changed")
	assert.Len(t, copied.Status.Conditions, 2, "Copied conditions should be changed")
}

func TestCSRDataEquality(t *testing.T) {
	// Test CSR equality
	csr1 := handlers.CSR{}
	csr1.Metadata.Name = "test-csr"
	csr1.Status.Conditions = []struct {
		Type   string `json:"type"`
		Status string `json:"status"`
	}{
		{Type: "Approved", Status: "True"},
	}

	csr2 := handlers.CSR{}
	csr2.Metadata.Name = "test-csr"
	csr2.Status.Conditions = []struct {
		Type   string `json:"type"`
		Status string `json:"status"`
	}{
		{Type: "Approved", Status: "True"},
	}

	// These should be equal
	assert.Equal(t, csr1.Metadata.Name, csr2.Metadata.Name)
	assert.Equal(t, csr1.Status.Conditions[0].Type, csr2.Status.Conditions[0].Type)
	assert.Equal(t, csr1.Status.Conditions[0].Status, csr2.Status.Conditions[0].Status)
}
