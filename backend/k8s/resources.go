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
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/dynamic"
)

// mapResourceToGVR maps resource types to their GroupVersionResource (GVR)
func getGVR(discoveryClient discovery.DiscoveryInterface, resourceKind string) (schema.GroupVersionResource, bool, error) {
	resourceList, err := discoveryClient.ServerPreferredResources()
	if err != nil {
		return schema.GroupVersionResource{}, false, err
	}

	for _, resourceGroup := range resourceList {
		for _, resource := range resourceGroup.APIResources {
			// we are looking for the resourceKind
			if resource.Name == resourceKind {
				gv, err := schema.ParseGroupVersion(resourceGroup.GroupVersion)
				if err != nil {
					return schema.GroupVersionResource{}, false, err
				}
				isNamespaced := resource.Namespaced
				return schema.GroupVersionResource{Group: gv.Group, Version: gv.Version, Resource: resource.Name}, isNamespaced, nil
			}
		}
	}
	return schema.GroupVersionResource{}, false, fmt.Errorf("resource not found")
}

// CreateResource creates a Kubernetes resource
func CreateResource(c *gin.Context) {
	clientset, dynamicClient, err := GetClientSet()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	resourceKind := c.Param("resourceKind")
	namespace := c.Param("namespace")
	discoveryClient := clientset.Discovery()
	gvr, isNamespaced, err := getGVR(discoveryClient, resourceKind)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported resource type"})
		return
	}
	var resource dynamic.ResourceInterface

	// cluster-wide resouces does not look for namespaces
	if isNamespaced {
		resource = dynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		resource = dynamicClient.Resource(gvr)
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
	resourceObj := &unstructured.Unstructured{Object: resourceData}
	// TODO: Retry Logic
	result, err := resource.Create(c, resourceObj, v1.CreateOptions{})
	if err != nil {
		fmt.Println("Kubernetes API Error:", err) // Debugging
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, result)
}

// GetResource retrieves a resource
func GetResource(c *gin.Context) {
	clientset, dynamicClient, err := GetClientSet()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resourceKind := c.Param("resourceKind")
	namespace := c.Param("namespace")
	name := c.Param("name")

	discoveryClient := clientset.Discovery()
	gvr, isNamespaced, err := getGVR(discoveryClient, resourceKind)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported resource type"})
		return
	}

	var resource dynamic.ResourceInterface
	if isNamespaced {
		resource = dynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		resource = dynamicClient.Resource(gvr)
	}
	result, err := resource.Get(c, name, v1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	format := c.Query("format")
	if format == "yaml" || format == "yml" {
		yamlData, err := yaml.Marshal(result)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to convert to YAML"})
			return
		}
		c.Data(http.StatusOK, "application/x-yaml", yamlData)
		return
	}

	c.JSON(http.StatusOK, result)
}

// ListResources lists all resources of a given type in a namespace
func ListResources(c *gin.Context) {
	clientset, dynamicClient, err := GetClientSet()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resourceKind := c.Param("resourceKind")
	namespace := c.Param("namespace")

	discoveryClient := clientset.Discovery()
	gvr, isNamespaced, err := getGVR(discoveryClient, resourceKind)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported resource type"})
		return
	}

	var resource dynamic.ResourceInterface
	if isNamespaced {
		resource = dynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		resource = dynamicClient.Resource(gvr)
	}

	// Retrieve list of resources
	result, err := resource.List(c, v1.ListOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	format := c.Query("format")
	if format == "yaml" || format == "yml" {
		yamlData, err := yaml.Marshal(result)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to convert to YAML"})
			return
		}
		c.Data(http.StatusOK, "application/x-yaml", yamlData)
		return
	}

	c.JSON(http.StatusOK, result)
}

// UpdateResource updates an existing Kubernetes resource
func UpdateResource(c *gin.Context) {
	clientset, dynamicClient, err := GetClientSet()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resourceKind := c.Param("resourceKind")
	namespace := c.Param("namespace")
	name := c.Param("name") // Extract resource name

	discoveryClient := clientset.Discovery()
	gvr, isNamespaced, err := getGVR(discoveryClient, resourceKind)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported resource type"})
		return
	}
	var resource dynamic.ResourceInterface

	if isNamespaced {
		resource = dynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		resource = dynamicClient.Resource(gvr)
	}

	var resourceData map[string]interface{}
	if err := c.ShouldBindJSON(&resourceData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format"})
		return
	}

	// Ensure the resource has a name before updating
	resourceObj := &unstructured.Unstructured{Object: resourceData}
	resourceObj.SetName(name)
	// TODO: Retry Logic
	result, err := resource.Update(c, resourceObj, v1.UpdateOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// DeleteResource deletes a resource
func DeleteResource(c *gin.Context) {
	clientset, dynamicClient, err := GetClientSet()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resourceKind := c.Param("resourceKind")
	namespace := c.Param("namespace")
	name := c.Param("name")

	discoveryClient := clientset.Discovery()
	gvr, isNamespaced, err := getGVR(discoveryClient, resourceKind)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported resource type"})
		return
	}
	var resource dynamic.ResourceInterface

	if isNamespaced {
		resource = dynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		resource = dynamicClient.Resource(gvr)
	}

	err = resource.Delete(c, name, v1.DeleteOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted successfully"})
}
