package k8s

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gopkg.in/yaml.v2"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// mapResourceToGVR maps resource types to their GroupVersionResource (GVR)
func mapResourceToGVR(resourceType string) schema.GroupVersionResource {
	switch resourceType {
	case "deployments":
		return schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}
	case "services":
		return schema.GroupVersionResource{Group: "", Version: "v1", Resource: "services"}
	case "configmaps":
		return schema.GroupVersionResource{Group: "", Version: "v1", Resource: "configmaps"}
	case "ingresses":
		return schema.GroupVersionResource{Group: "networking.k8s.io", Version: "v1", Resource: "ingresses"}
	case "persistentvolumeclaims":
		return schema.GroupVersionResource{Group: "", Version: "v1", Resource: "persistentvolumeclaims"}
	default:
		return schema.GroupVersionResource{} // Return empty GVR if not found
	}
}

// CreateResource creates a Kubernetes resource
func CreateResource(c *gin.Context) {
	_, dynamicClient, err := GetClientSet()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resourceType := c.Param("resourceType")
	namespace := c.Param("namespace")

	gvr := mapResourceToGVR(resourceType)
	if gvr.Resource == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported resource type"})
		return
	}

	var resourceData map[string]interface{}

	// Detect Content-Type
	contentType := strings.ToLower(c.Request.Header.Get("Content-Type"))
	bodyBytes, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	// Convert YAML to JSON if needed
	if strings.Contains(contentType, "yaml") || strings.Contains(contentType, "yml") {
		err = yaml.Unmarshal(bodyBytes, &resourceData)
		if err != nil {
			fmt.Println("YAML Unmarshal Error:", err) // Debugging
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid YAML format"})
			return
		}
	} else {
		err = json.Unmarshal(bodyBytes, &resourceData) // Use json.Unmarshal instead of c.ShouldBindJSON()
		if err != nil {
			fmt.Println("JSON Unmarshal Error:", err) // Debugging
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format"})
			return
		}
	}

	// Convert the map to an unstructured resource
	resource := &unstructured.Unstructured{Object: resourceData}
	result, err := dynamicClient.Resource(gvr).Namespace(namespace).Create(c, resource, v1.CreateOptions{})
	if err != nil {
		fmt.Println("Kubernetes API Error:", err) // Debugging
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, result)
}

// GetResource retrieves a resource
func GetResource(c *gin.Context) {
	_, dynamicClient, err := GetClientSet()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resourceType := c.Param("resourceType")
	namespace := c.Param("namespace")
	name := c.Param("name")

	gvr := mapResourceToGVR(resourceType)
	if gvr.Resource == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported resource type"})
		return
	}

	result, err := dynamicClient.Resource(gvr).Namespace(namespace).Get(c, name, v1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetResourceAsJSON retrieves a resource in JSON format
func GetResourceAsJSON(c *gin.Context) {
	_, dynamicClient, err := GetClientSet()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resourceType := c.Param("resourceType")
	namespace := c.Param("namespace")
	name := c.Param("name")

	gvr := mapResourceToGVR(resourceType)
	if gvr.Resource == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported resource type"})
		return
	}

	result, err := dynamicClient.Resource(gvr).Namespace(namespace).Get(c, name, v1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	jsonData, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to convert to JSON"})
		return
	}

	c.Data(http.StatusOK, "application/json", jsonData)
}

// GetResourceAsYAML retrieves a resource in YAML format
func GetResourceAsYAML(c *gin.Context) {
	_, dynamicClient, err := GetClientSet()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resourceType := c.Param("resourceType")
	namespace := c.Param("namespace")
	name := c.Param("name")

	gvr := mapResourceToGVR(resourceType)
	if gvr.Resource == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported resource type"})
		return
	}

	result, err := dynamicClient.Resource(gvr).Namespace(namespace).Get(c, name, v1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	yamlData, err := yaml.Marshal(result)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to convert to YAML"})
		return
	}

	c.Data(http.StatusOK, "application/x-yaml", yamlData)
}

// UpdateResource updates an existing Kubernetes resource
func UpdateResource(c *gin.Context) {
	_, dynamicClient, err := GetClientSet()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resourceType := c.Param("resourceType")
	namespace := c.Param("namespace")
	name := c.Param("name") // Extract resource name

	gvr := mapResourceToGVR(resourceType)
	if gvr.Resource == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported resource type"})
		return
	}

	var resourceData map[string]interface{}
	if err := c.ShouldBindJSON(&resourceData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format"})
		return
	}

	// Ensure the resource has a name before updating
	resource := &unstructured.Unstructured{Object: resourceData}
	resource.SetName(name)

	result, err := dynamicClient.Resource(gvr).Namespace(namespace).Update(c, resource, v1.UpdateOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// DeleteResource deletes a resource
func DeleteResource(c *gin.Context) {
	_, dynamicClient, err := GetClientSet()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resourceType := c.Param("resourceType")
	namespace := c.Param("namespace")
	name := c.Param("name")

	gvr := mapResourceToGVR(resourceType)
	if gvr.Resource == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported resource type"})
		return
	}

	err = dynamicClient.Resource(gvr).Namespace(namespace).Delete(c, name, v1.DeleteOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted successfully"})
}
