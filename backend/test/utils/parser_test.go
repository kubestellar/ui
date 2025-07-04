package utils

import (
	"encoding/json"
	"testing"

	"github.com/kubestellar/ui/backend/utils"
)

func TestYAMLToJSON(t *testing.T) {
	t.Run("should convert simple YAML to JSON", func(t *testing.T) {
		yamlData := []byte(`
name: test
age: 30
active: true
`)
		result, err := utils.YAMLToJSON(yamlData)
		if err != nil {
			t.Errorf("Failed to convert YAML to JSON: %v", err)
		}

		// Check individual fields since the order might vary
		if result["name"] != "test" {
			t.Errorf("Expected name 'test', got %v", result["name"])
		}
		if result["age"] != float64(30) { // JSON conversion changes int to float64
			t.Errorf("Expected age 30, got %v", result["age"])
		}
		if result["active"] != true {
			t.Errorf("Expected active true, got %v", result["active"])
		}
	})

	t.Run("should convert nested YAML to JSON", func(t *testing.T) {
		yamlData := []byte(`
person:
  name: John
  address:
    street: 123 Main St
    city: Anytown
  hobbies:
    - reading
    - swimming
`)
		result, err := utils.YAMLToJSON(yamlData)
		if err != nil {
			t.Errorf("Failed to convert nested YAML to JSON: %v", err)
		}

		// YAML unmarshaling creates map[interface{}]interface{} for nested maps
		person, ok := result["person"].(map[interface{}]interface{})
		if !ok {
			t.Error("Expected person to be a map[interface{}]interface{}")
			return
		}

		if person["name"] != "John" {
			t.Errorf("Expected name 'John', got %v", person["name"])
		}

		// Check address
		address, ok := person["address"].(map[interface{}]interface{})
		if !ok {
			t.Error("Expected address to be a map[interface{}]interface{}")
			return
		}

		if address["street"] != "123 Main St" {
			t.Errorf("Expected street '123 Main St', got %v", address["street"])
		}
	})

	t.Run("should return error for YAML array", func(t *testing.T) {
		yamlData := []byte(`
- name: item1
  value: 100
- name: item2
  value: 200
`)
		_, err := utils.YAMLToJSON(yamlData)
		if err == nil {
			t.Error("Expected error for YAML array since function only supports maps, but got none")
		}
	})

	t.Run("should handle empty YAML", func(t *testing.T) {
		yamlData := []byte(``)
		result, err := utils.YAMLToJSON(yamlData)
		if err != nil {
			t.Errorf("Failed to convert empty YAML: %v", err)
		}

		if result != nil {
			t.Errorf("Expected nil for empty YAML, got %v", result)
		}
	})

	t.Run("should return error for YAML with only whitespace", func(t *testing.T) {
		yamlData := []byte(`   
		
		`)
		_, err := utils.YAMLToJSON(yamlData)
		if err == nil {
			t.Error("Expected error for malformed YAML with tabs, but got none")
		}
	})

	t.Run("should convert YAML with different data types", func(t *testing.T) {
		yamlData := []byte(`
string_value: "hello"
int_value: 42
float_value: 3.14
bool_value: true
null_value: null
`)
		result, err := utils.YAMLToJSON(yamlData)
		if err != nil {
			t.Errorf("Failed to convert YAML with different types: %v", err)
		}

		// Check individual fields
		if result["string_value"] != "hello" {
			t.Errorf("Expected string_value 'hello', got %v", result["string_value"])
		}
		if result["int_value"] != float64(42) { // JSON conversion changes int to float64
			t.Errorf("Expected int_value 42, got %v", result["int_value"])
		}
		if result["float_value"] != 3.14 {
			t.Errorf("Expected float_value 3.14, got %v", result["float_value"])
		}
		if result["bool_value"] != true {
			t.Errorf("Expected bool_value true, got %v", result["bool_value"])
		}
		if result["null_value"] != nil {
			t.Errorf("Expected null_value to be nil, got %v", result["null_value"])
		}
	})

	t.Run("should handle invalid YAML", func(t *testing.T) {
		yamlData := []byte(`
invalid yaml:
  - missing quotes: this is "unclosed
  - invalid: [structure
`)
		_, err := utils.YAMLToJSON(yamlData)
		if err == nil {
			t.Error("Expected error for invalid YAML, but got none")
		}
	})

	t.Run("should convert Kubernetes-like YAML", func(t *testing.T) {
		yamlData := []byte(`
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  labels:
    app: test
spec:
  containers:
  - name: test-container
    image: nginx:latest
    ports:
    - containerPort: 80
`)
		result, err := utils.YAMLToJSON(yamlData)
		if err != nil {
			t.Errorf("Failed to convert Kubernetes YAML: %v", err)
		}

		// Verify some key fields
		if result["apiVersion"] != "v1" {
			t.Errorf("Expected apiVersion 'v1', got %v", result["apiVersion"])
		}

		if result["kind"] != "Pod" {
			t.Errorf("Expected kind 'Pod', got %v", result["kind"])
		}

		// YAML unmarshaling creates map[interface{}]interface{} for nested maps
		metadata, ok := result["metadata"].(map[interface{}]interface{})
		if !ok {
			t.Error("Expected metadata to be a map[interface{}]interface{}")
		} else {
			if metadata["name"] != "test-pod" {
				t.Errorf("Expected name 'test-pod', got %v", metadata["name"])
			}
		}
	})

	t.Run("should preserve JSON serialization compatibility", func(t *testing.T) {
		yamlData := []byte(`
name: test
age: 30
`)
		result, err := utils.YAMLToJSON(yamlData)
		if err != nil {
			t.Errorf("Failed to convert YAML: %v", err)
		}

		// Should be able to marshal back to JSON
		jsonBytes, err := json.Marshal(result)
		if err != nil {
			t.Errorf("Failed to marshal result to JSON: %v", err)
		}

		// Should be able to unmarshal the JSON
		var unmarshaled map[string]interface{}
		err = json.Unmarshal(jsonBytes, &unmarshaled)
		if err != nil {
			t.Errorf("Failed to unmarshal JSON: %v", err)
		}

		// Basic check that we have the expected fields
		if len(result) == 0 {
			t.Error("Result should not be empty")
		}
	})
}
