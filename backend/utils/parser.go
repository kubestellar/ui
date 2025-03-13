package utils

import (
	"encoding/json"

	"gopkg.in/yaml.v2"
)

// YAMLToJSON converts YAML to JSON
func YAMLToJSON(yamlData []byte) (map[string]interface{}, error) {
	var jsonData map[string]interface{}
	err := yaml.Unmarshal(yamlData, &jsonData)
	if err != nil {
		return nil, err
	}

	jsonStr, _ := json.Marshal(jsonData)
	json.Unmarshal(jsonStr, &jsonData)
	return jsonData, nil
}
