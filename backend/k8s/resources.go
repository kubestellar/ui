package k8s

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"gopkg.in/yaml.v3"
	"io"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/dynamic"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
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

// UploadLocalFile uploads any Kubernetes resource to the endpoint `/api/resource/upload`.
//
// It is mapped to a dynamic URL for creating a Kubernetes workload.
//
// URL Format: `/api/:resourceKind/:namespace`
func UploadLocalFile(c *gin.Context) {
	file, header, err := c.Request.FormFile("wds")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}
	fileExt := filepath.Ext(header.Filename)
	if fileExt != ".yaml" && fileExt != ".yml" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "file extension must be .yaml or .yml",
		})
		return
	}
	originalFilename := strings.TrimSuffix(filepath.Base(header.Filename), fileExt)
	now := time.Now()
	filename := strings.ReplaceAll(strings.ToLower(originalFilename), " ", "-") + "-" + fmt.Sprintf("%v", now.Unix()) + fileExt
	tempDir := "/tmp"
	out, err := os.Create(filepath.Join(tempDir, filename))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}
	defer out.Close()

	if _, err = io.Copy(out, file); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// read the yaml file
	yamlData, err := os.ReadFile(filepath.Join(tempDir, filename))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}
	var resourceData map[string]interface{}
	if err := yaml.Unmarshal(yamlData, &resourceData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid YAML file", "details": err.Error()})
		return
	}

	resourceKind, ok := resourceData["kind"].(string)
	if !ok || resourceKind == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing or invalid 'kind' parameter"})
		return
	}
	namespace, ok := resourceData["metadata"].(map[string]interface{})["namespace"].(string)
	if !ok || namespace == "" {
		namespace = "default"
	}

	requestBody, err := json.Marshal(resourceData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	apiURL := fmt.Sprintf("http://localhost:4000/api/%s/%s", strings.ToLower(resourceKind)+"s", namespace)
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(requestBody))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create API request"})
		return
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send API request", "details": err.Error()})
		return
	}
	defer resp.Body.Close()

	responseData, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response: " + err.Error()})
		return
	}
	var apiResponse map[string]interface{}
	if err := json.Unmarshal(responseData, &apiResponse); err != nil {
		c.JSON(resp.StatusCode, gin.H{"message": "File uploaded but response parsing failed", "response": string(responseData)})
		return
	}
	c.JSON(resp.StatusCode, gin.H{"message": "File uploaded and processed successfully", "response": apiResponse})
}
