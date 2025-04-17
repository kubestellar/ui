package k8s

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"gopkg.in/yaml.v3"
	"io"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/dynamic/dynamicinformer"
	"k8s.io/client-go/tools/cache"
	"log"
	"net/http"
	"reflect"
	"sort"
	"strings"
	"sync"
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
			if strings.EqualFold(resource.Kind, resourceKind) {
				gv, err := schema.ParseGroupVersion(resourceGroup.GroupVersion)
				if err != nil {
					return schema.GroupVersionResource{}, false, err
				}
				isNamespaced := resource.Namespaced
				return schema.GroupVersionResource{Group: gv.Group, Version: gv.Version, Resource: resource.Name}, isNamespaced, nil
			} else if strings.EqualFold(resource.Name, resourceKind) {
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
func parseRequestBody(c *gin.Context) ([]map[string]interface{}, error) {
	contentType := c.GetHeader("Content-Type")
	// Read request body
	bodyBytes, err := c.GetRawData()
	if err != nil {
		return nil, fmt.Errorf("failed to read request body")
	}

	var yamlDocs []map[string]interface{}

	if strings.Contains(contentType, "application/json") {
		if err := json.Unmarshal(bodyBytes, &yamlDocs); err != nil {
			return nil, fmt.Errorf("invalid JSON format")
		}
		return yamlDocs, nil
	}
	decoder := yaml.NewDecoder(bytes.NewReader(bodyBytes))
	for {
		var doc map[string]interface{}
		if err := decoder.Decode(&doc); err != nil {
			if err == io.EOF {
				break
			}
			return nil, fmt.Errorf("invalid YAML format")
		}
		yamlDocs = append(yamlDocs, doc)
	}
	if len(yamlDocs) == 0 {
		return nil, fmt.Errorf("empty request body")
	}
	return yamlDocs, nil
}

func parseYAMLFile(file io.Reader) ([]map[string]interface{}, error) {
	var yamlDocs []map[string]interface{}
	decoder := yaml.NewDecoder(file)

	for {
		var doc map[string]interface{}
		if err := decoder.Decode(&doc); err != nil {
			if err == io.EOF {
				break
			}
			return nil, fmt.Errorf("invalid YAML file format")
		}
		yamlDocs = append(yamlDocs, doc)
	}

	if len(yamlDocs) == 0 {
		return nil, fmt.Errorf("empty YAML file")
	}
	return yamlDocs, nil
}
func EnsureNamespaceExistsAndAddLabel(dynamicClient dynamic.Interface, namespace string) error {
	// Skip for default namespace which always exists
	if namespace == "default" {
		return nil
	}

	// Get the GVR for Namespace
	nsGVR := schema.GroupVersionResource{Group: "", Version: "v1", Resource: "namespaces"}

	// Check if namespace exists
	_, err := dynamicClient.Resource(nsGVR).Get(context.TODO(), namespace, v1.GetOptions{})
	if err == nil {
		// Namespace exists
		return nil
	}

	// Create namespace if it doesn't exist
	fmt.Printf("Creating namespace: %s\n", namespace)
	nsObj := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "v1",
			"kind":       "Namespace",
			"metadata": map[string]interface{}{
				"name": namespace,
			},
		},
	}
	autoLabelling(nsObj, namespace)

	_, err = dynamicClient.Resource(nsGVR).Create(context.TODO(), nsObj, v1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create namespace %s: %v", namespace, err)
	}

	return nil
}

func applyResources(c *gin.Context, yamlDocs []map[string]interface{},
	dynamicClient dynamic.Interface,
	discoveryClient discovery.DiscoveryInterface) ([]interface{}, error) {
	var results []interface{}

	for _, resourceData := range yamlDocs {
		resourceKind, ok := resourceData["kind"].(string)
		if !ok {
			return results, fmt.Errorf("resource kind not found in YAML")
		}
		autoNs := c.Query("auto_ns")
		namespace := "default"
		if metadata, ok := resourceData["metadata"].(map[string]interface{}); ok {
			if ns, exists := metadata["namespace"].(string); exists {
				namespace = ns
				if strings.EqualFold(autoNs, "true") || autoNs == "1" {
					err := EnsureNamespaceExistsAndAddLabel(dynamicClient, namespace)
					if err != nil {
						return nil, fmt.Errorf("failed to ensure namespace %s exists: %v", namespace, err)
					}
				}

			}
		}
		gvr, isNamespaced, err := getGVR(discoveryClient, resourceKind)
		if err != nil {
			return results, fmt.Errorf("unsupported resource type: %s", resourceKind)
		}

		var resource dynamic.ResourceInterface
		var labelName string
		if isNamespaced {
			resource = dynamicClient.Resource(gvr).Namespace(namespace)
		} else {
			resource = dynamicClient.Resource(gvr)
		}

		resourceObj := &unstructured.Unstructured{Object: resourceData}
		if isNamespaced && namespace != "default" {
			labelName = namespace
		} else {
			labelName = resourceObj.GetName()
		}
		autoLabelling(resourceObj, labelName)
		result, err := resource.Create(c, resourceObj, v1.CreateOptions{})
		if err != nil {
			return results, fmt.Errorf("failed to create resource %s: %v", resourceKind, err)
		}
		results = append(results, result)
	}
	return results, nil

}

func autoLabelling(obj *unstructured.Unstructured, labelName string) {
	labels := obj.GetLabels()

	if labels == nil {
		labels = make(map[string]string)
	}
	labelKey := "kubernetes.io/kubestellar.workload.name"

	if _, exists := labels[labelKey]; !exists {
		labels[labelKey] = labelName
		obj.SetLabels(labels)
	}
}

// CreateResource creates a Kubernetes resource
func CreateResource(c *gin.Context) {
	cookieContext, err := c.Cookie("ui-wds-context")
	if err != nil {
		cookieContext = "wds1"
	}
	clientset, dynamicClient, err := GetClientSetWithContext(cookieContext)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	discoveryClient := clientset.Discovery()

	// Parse request (JSON or YAML)
	yamlDocs, err := parseRequestBody(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results, err := applyResources(c, yamlDocs, dynamicClient, discoveryClient)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// Return all created resources
	c.JSON(http.StatusCreated, gin.H{"resources": results})
}

// GetResource retrieves a resource
func GetResource(c *gin.Context) {
	cookieContext, err := c.Cookie("ui-wds-context")
	if err != nil {
		cookieContext = "wds1"
	}
	clientset, dynamicClient, err := GetClientSetWithContext(cookieContext)
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
	cookieContext, err := c.Cookie("ui-wds-context")
	if err != nil {
		cookieContext = "wds1"
	}
	clientset, dynamicClient, err := GetClientSetWithContext(cookieContext)
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
	cookieContext, err := c.Cookie("ui-wds-context")
	if err != nil {
		cookieContext = "wds1"
	}
	clientset, dynamicClient, err := GetClientSetWithContext(cookieContext)
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
	cookieContext, err := c.Cookie("ui-wds-context")
	if err != nil {
		cookieContext = "wds1"
	}
	clientset, dynamicClient, err := GetClientSetWithContext(cookieContext)
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

func UploadYAMLFile(c *gin.Context) {
	cookieContext, err := c.Cookie("ui-wds-context")
	if err != nil {
		cookieContext = "wds1"
	}
	clientset, dynamicClient, err := GetClientSetWithContext(cookieContext)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	discoveryClient := clientset.Discovery()

	// Read uploaded file
	file, _, err := c.Request.FormFile("wds")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read file"})
		return
	}
	defer file.Close()

	// Parse YAML file
	yamlDocs, err := parseYAMLFile(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Apply resources
	results, err := applyResources(c, yamlDocs, dynamicClient, discoveryClient)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"resources": results})
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func LogWorkloads(c *gin.Context) {
	cookieContext, err := c.Cookie("ui-wds-context")
	if err != nil {
		cookieContext = "wds1"
	}
	clientset, dynamicClient, err := GetClientSetWithContext(cookieContext)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// websocket connection
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WebSocket Upgrade Error:", err)
		return
	}
	defer conn.Close()

	resourceKind := c.Param("resourceKind")
	namespace := c.Param("namespace")
	name := c.Query("name")

	if namespace == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("no namespace exists with name %s", namespace)})
		return
	}

	discoveryClient := clientset.Discovery()
	gvr, _, err := getGVR(discoveryClient, resourceKind)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported resource type"})
		return
	}

	// Create informer factory filtering by name if provided
	tweakListOptions := func(options *metav1.ListOptions) {
		if name != "" {
			options.FieldSelector = fmt.Sprintf("metadata.name=%s", name)
		}
	}

	factory := dynamicinformer.NewFilteredDynamicSharedInformerFactory(dynamicClient, time.Minute, namespace, tweakListOptions)
	informer := factory.ForResource(gvr).Informer()

	mux := &sync.RWMutex{}
	synced := false

	// Helper functions for sending messages
	sendMessage := func(msgType string, format string, args ...interface{}) {
		timestamp := time.Now().Format(time.RFC3339)
		prefix := fmt.Sprintf("[%s] %s: ", timestamp, msgType)
		message := prefix + fmt.Sprintf(format, args...)

		if err := conn.WriteMessage(websocket.TextMessage, []byte(message)); err != nil {
			log.Printf("Error writing to WebSocket: %v", err)
		}
	}

	// Helper for getting nested values with proper error handling
	getNestedValue := func(obj map[string]interface{}, valueType string, keys ...string) (interface{}, bool) {
		var value interface{}
		var exists bool
		var err error

		switch valueType {
		case "string":
			value, exists, err = unstructured.NestedString(obj, keys...)
		case "int64":
			value, exists, err = unstructured.NestedInt64(obj, keys...)
		case "map":
			value, exists, err = unstructured.NestedMap(obj, keys...)
		case "slice":
			value, exists, err = unstructured.NestedSlice(obj, keys...)
		case "bool":
			value, exists, err = unstructured.NestedBool(obj, keys...)
		}

		if err != nil {
			log.Printf("Error getting nested value for %v: %v", keys, err)
			return nil, false
		}
		return value, exists
	}

	informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(obj interface{}) {
			mux.RLock()
			defer mux.RUnlock()
			if !synced {
				return
			}

			item, ok := obj.(*unstructured.Unstructured)
			if !ok {
				log.Printf("item is not *unstructured.Unstructured")
				return
			}

			gvk := item.GroupVersionKind()
			objectName := item.GetName()
			objectNamespace := item.GetNamespace()
			uid := string(item.GetUID())

			sendMessage("ADDED", "Kind=%s, Name=%s, Namespace=%s, UID=%s",
				gvk.Kind, objectName, objectNamespace, uid)

			// Resource-specific additional information on creation
			switch {
			case strings.EqualFold(gvk.Kind, "Deployment"):
				if replicas, exists, _ := unstructured.NestedInt64(item.Object, "spec", "replicas"); exists {
					sendMessage("INFO", "Deployment %s created with %d replicas", objectName, replicas)
				}

				// Log container images on creation
				if containers, ok := getNestedValue(item.Object, "slice", "spec", "template", "spec", "containers"); ok && containers != nil {
					for i, c := range containers.([]interface{}) {
						container := c.(map[string]interface{})
						containerName := container["name"].(string)
						image := container["image"].(string)
						sendMessage("INFO", "Container #%d: %s using image %s", i+1, containerName, image)
					}
				}

			case strings.EqualFold(gvk.Kind, "Service"):
				if serviceType, exists, _ := unstructured.NestedString(item.Object, "spec", "type"); exists {
					sendMessage("INFO", "Service %s created with type %s", objectName, serviceType)
				}

				// Log service ports
				if ports, ok := getNestedValue(item.Object, "slice", "spec", "ports"); ok && ports != nil {
					for _, p := range ports.([]interface{}) {
						port := p.(map[string]interface{})
						portStr := fmt.Sprintf("%v", port["port"])
						protocol := "TCP"
						if proto, exists := port["protocol"]; exists {
							protocol = proto.(string)
						}
						sendMessage("INFO", "Service port: %s/%s", portStr, protocol)
					}
				}

			case strings.EqualFold(gvk.Kind, "ConfigMap"):
				if data, ok := getNestedValue(item.Object, "map", "data"); ok && data != nil {
					keys := make([]string, 0, len(data.(map[string]interface{})))
					for k := range data.(map[string]interface{}) {
						keys = append(keys, k)
					}
					sendMessage("INFO", "ConfigMap %s created with keys: %s", objectName, strings.Join(keys, ", "))
				}

			case strings.EqualFold(gvk.Kind, "Secret"):
				if data, ok := getNestedValue(item.Object, "map", "data"); ok && data != nil {
					keys := make([]string, 0, len(data.(map[string]interface{})))
					for k := range data.(map[string]interface{}) {
						keys = append(keys, k)
					}
					sendMessage("INFO", "Secret %s created with keys: %s", objectName, strings.Join(keys, ", "))
				}
			}
		},
		UpdateFunc: func(oldObj, newObj interface{}) {
			mux.RLock()
			defer mux.RUnlock()
			if !synced {
				return
			}

			old, ok := oldObj.(*unstructured.Unstructured)
			if !ok {
				log.Printf("item is not *unstructured.Unstructured")
				return
			}
			new, ok := newObj.(*unstructured.Unstructured)
			if !ok {
				log.Printf("item is not *unstructured.Unstructured")
				return
			}

			// Skip if resource version hasn't changed
			if old.GetResourceVersion() == new.GetResourceVersion() {
				return
			}

			uid := string(old.GetUID())
			gvk := old.GroupVersionKind()
			objectName := old.GetName()
			objectNamespace := old.GetNamespace()

			sendMessage("UPDATED", "Kind=%s, Name=%s, Namespace=%s, UID=%s",
				gvk.Kind, objectName, objectNamespace, uid)

			// Check for label changes
			labelsOld := old.GetLabels()
			labelsNew := new.GetLabels()
			if !reflect.DeepEqual(labelsOld, labelsNew) {
				// Find added, removed, and changed labels
				added := []string{}
				changed := []string{}
				removed := []string{}

				for k, v := range labelsNew {
					oldVal, exists := labelsOld[k]
					if !exists {
						added = append(added, fmt.Sprintf("%s=%s", k, v))
					} else if oldVal != v {
						changed = append(changed, fmt.Sprintf("%s: %s → %s", k, oldVal, v))
					}
				}

				for k := range labelsOld {
					if _, exists := labelsNew[k]; !exists {
						removed = append(removed, k)
					}
				}

				if len(added) > 0 {
					sendMessage("LABELS ADDED", "%s", strings.Join(added, ", "))
				}
				if len(changed) > 0 {
					sendMessage("LABELS CHANGED", "%s", strings.Join(changed, ", "))
				}
				if len(removed) > 0 {
					sendMessage("LABELS REMOVED", "%s", strings.Join(removed, ", "))
				}
			}

			// Resource-specific update checks
			switch {
			case strings.EqualFold(gvk.Kind, "Deployment"):
				// Check for replicas changes
				oldReplicas, oldExists, _ := unstructured.NestedInt64(old.Object, "spec", "replicas")
				newReplicas, newExists, _ := unstructured.NestedInt64(new.Object, "spec", "replicas")

				if oldExists && newExists && oldReplicas != newReplicas {
					sendMessage("REPLICAS CHANGED", "%s: %d → %d", objectName, oldReplicas, newReplicas)
				}

				// Check for container image changes
				oldSpec, oldSpecExists, _ := unstructured.NestedMap(old.Object, "spec", "template", "spec")
				newSpec, newSpecExists, _ := unstructured.NestedMap(new.Object, "spec", "template", "spec")

				if oldSpecExists && newSpecExists {
					oldContainers, oldContExists, _ := unstructured.NestedSlice(oldSpec, "containers")
					newContainers, newContExists, _ := unstructured.NestedSlice(newSpec, "containers")

					if oldContExists && newContExists {
						// Build a map for old containers by name for easy lookup
						oldContainerMap := make(map[string]map[string]interface{})
						for _, c := range oldContainers {
							container := c.(map[string]interface{})
							name := container["name"].(string)
							oldContainerMap[name] = container
						}

						// Check each new container against old ones
						for _, c := range newContainers {
							container := c.(map[string]interface{})
							name := container["name"].(string)
							newImage := container["image"].(string)

							if oldContainer, exists := oldContainerMap[name]; exists {
								oldImage := oldContainer["image"].(string)
								if oldImage != newImage {
									sendMessage("CONTAINER IMAGE", "%s: %s → %s", name, oldImage, newImage)
								}

								// Check resource requests/limits
								oldResources, oldResExists := oldContainer["resources"]
								newResources, newResExists := container["resources"]

								if oldResExists && newResExists && !reflect.DeepEqual(oldResources, newResources) {
									oldResMap := oldResources.(map[string]interface{})
									newResMap := newResources.(map[string]interface{})

									// Check requests
									if oldReq, oldExists := oldResMap["requests"]; oldExists {
										if newReq, newExists := newResMap["requests"]; newExists {
											if !reflect.DeepEqual(oldReq, newReq) {
												sendMessage("RESOURCE REQUESTS", "%s resources updated", name)

												// Detailed CPU/memory changes
												oldReqMap := oldReq.(map[string]interface{})
												newReqMap := newReq.(map[string]interface{})

												if oldCPU, exists := oldReqMap["cpu"]; exists {
													if newCPU, exists := newReqMap["cpu"]; exists && oldCPU != newCPU {
														sendMessage("CPU REQUEST", "%s: %v → %v", name, oldCPU, newCPU)
													}
												}

												if oldMem, exists := oldReqMap["memory"]; exists {
													if newMem, exists := newReqMap["memory"]; exists && oldMem != newMem {
														sendMessage("MEMORY REQUEST", "%s: %v → %v", name, oldMem, newMem)
													}
												}
											}
										}
									}

									// Check limits
									if oldLim, oldExists := oldResMap["limits"]; oldExists {
										if newLim, newExists := newResMap["limits"]; newExists {
											if !reflect.DeepEqual(oldLim, newLim) {
												sendMessage("RESOURCE LIMITS", "%s limits updated", name)

												// Detailed CPU/memory changes
												oldLimMap := oldLim.(map[string]interface{})
												newLimMap := newLim.(map[string]interface{})

												if oldCPU, exists := oldLimMap["cpu"]; exists {
													if newCPU, exists := newLimMap["cpu"]; exists && oldCPU != newCPU {
														sendMessage("CPU LIMIT", "%s: %v → %v", name, oldCPU, newCPU)
													}
												}

												if oldMem, exists := oldLimMap["memory"]; exists {
													if newMem, exists := newLimMap["memory"]; exists && oldMem != newMem {
														sendMessage("MEMORY LIMIT", "%s: %v → %v", name, oldMem, newMem)
													}
												}
											}
										}
									}
								}
							} else {
								// New container added
								sendMessage("CONTAINER ADDED", "%s with image %s", name, newImage)
							}
						}

						// Check for removed containers
						for _, c := range oldContainers {
							container := c.(map[string]interface{})
							name := container["name"].(string)

							found := false
							for _, nc := range newContainers {
								newContainer := nc.(map[string]interface{})
								if newContainer["name"] == name {
									found = true
									break
								}
							}

							if !found {
								sendMessage("CONTAINER REMOVED", "%s", name)
							}
						}
					}
				}

				// Check for status changes
				oldStatus, oldStatusExists, _ := unstructured.NestedMap(old.Object, "status")
				newStatus, newStatusExists, _ := unstructured.NestedMap(new.Object, "status")

				if oldStatusExists && newStatusExists {
					oldAvail, oldAvailExists, _ := unstructured.NestedInt64(oldStatus, "availableReplicas")
					newAvail, newAvailExists, _ := unstructured.NestedInt64(newStatus, "availableReplicas")

					if oldAvailExists && newAvailExists && oldAvail != newAvail {
						sendMessage("AVAILABILITY", "%s: Available replicas %d → %d", objectName, oldAvail, newAvail)
					}

					// Check conditions
					oldCond, oldCondExists, _ := unstructured.NestedSlice(oldStatus, "conditions")
					newCond, newCondExists, _ := unstructured.NestedSlice(newStatus, "conditions")

					if oldCondExists && newCondExists {
						oldCondMap := make(map[string]map[string]interface{})
						for _, c := range oldCond {
							condition := c.(map[string]interface{})
							condType := condition["type"].(string)
							oldCondMap[condType] = condition
						}

						for _, c := range newCond {
							condition := c.(map[string]interface{})
							condType := condition["type"].(string)
							status := condition["status"].(string)

							if oldCondition, exists := oldCondMap[condType]; exists {
								oldStatus := oldCondition["status"].(string)
								if oldStatus != status {
									sendMessage("CONDITION", "%s: %s changed from %s to %s", objectName, condType, oldStatus, status)
									if reason, exists := condition["reason"]; exists {
										sendMessage("REASON", "%s: %s", condType, reason)
									}
								}
							}
						}
					}
				}

			case strings.EqualFold(gvk.Kind, "Service"):
				// Check for service type changes
				oldType, oldTypeExists, _ := unstructured.NestedString(old.Object, "spec", "type")
				newType, newTypeExists, _ := unstructured.NestedString(new.Object, "spec", "type")

				if oldTypeExists && newTypeExists && oldType != newType {
					sendMessage("SERVICE TYPE", "%s: %s → %s", objectName, oldType, newType)
				}

				// Check for port changes
				oldPorts, oldPortsExists, _ := unstructured.NestedSlice(old.Object, "spec", "ports")
				newPorts, newPortsExists, _ := unstructured.NestedSlice(new.Object, "spec", "ports")

				if oldPortsExists && newPortsExists && !reflect.DeepEqual(oldPorts, newPorts) {
					sendMessage("PORTS CHANGED", "%s service ports updated", objectName)

					// Map old ports by port number for comparison
					oldPortMap := make(map[int64]map[string]interface{})
					for _, p := range oldPorts {
						port := p.(map[string]interface{})
						if portNum, ok := port["port"].(int64); ok {
							oldPortMap[portNum] = port
						}
					}

					// Check new ports
					for _, p := range newPorts {
						port := p.(map[string]interface{})
						portNum, _ := port["port"].(int64)

						if oldPort, exists := oldPortMap[portNum]; exists {
							// Compare existing port details
							if !reflect.DeepEqual(oldPort, port) {
								sendMessage("PORT UPDATE", "Port %d configuration changed", portNum)
							}
						} else {
							// New port added
							protocol := "TCP"
							if proto, exists := port["protocol"]; exists {
								protocol = proto.(string)
							}
							sendMessage("PORT ADDED", "%d/%s", portNum, protocol)
						}
					}

					// Check for removed ports
					for portNum := range oldPortMap {
						found := false
						for _, p := range newPorts {
							port := p.(map[string]interface{})
							if newPortNum, ok := port["port"].(int64); ok && newPortNum == portNum {
								found = true
								break
							}
						}

						if !found {
							sendMessage("PORT REMOVED", "%d", portNum)
						}
					}
				}

			case strings.EqualFold(gvk.Kind, "ConfigMap"):
				// Check for data changes
				oldData, oldDataExists, _ := unstructured.NestedMap(old.Object, "data")
				newData, newDataExists, _ := unstructured.NestedMap(new.Object, "data")

				if oldDataExists && newDataExists {
					// Find added, changed, and removed keys
					added := []string{}
					changed := []string{}
					removed := []string{}

					for k := range newData {
						if _, exists := oldData[k]; !exists {
							added = append(added, k)
						}
					}

					for k := range oldData {
						if _, exists := newData[k]; !exists {
							removed = append(removed, k)
						} else if !reflect.DeepEqual(oldData[k], newData[k]) {
							changed = append(changed, k)
						}
					}

					if len(added) > 0 {
						sendMessage("CONFIG ADDED", "%s: Added keys: %s", objectName, strings.Join(added, ", "))
					}
					if len(changed) > 0 {
						sendMessage("CONFIG MODIFIED", "%s: Modified keys: %s", objectName, strings.Join(changed, ", "))
					}
					if len(removed) > 0 {
						sendMessage("CONFIG REMOVED", "%s: Removed keys: %s", objectName, strings.Join(removed, ", "))
					}
				}

			case strings.EqualFold(gvk.Kind, "Secret"):
				// Only report changes to keys, not values (for security)
				oldData, oldDataExists, _ := unstructured.NestedMap(old.Object, "data")
				newData, newDataExists, _ := unstructured.NestedMap(new.Object, "data")

				if oldDataExists && newDataExists {
					oldKeys := make([]string, 0, len(oldData))
					for k := range oldData {
						oldKeys = append(oldKeys, k)
					}

					newKeys := make([]string, 0, len(newData))
					for k := range newData {
						newKeys = append(newKeys, k)
					}

					sort.Strings(oldKeys)
					sort.Strings(newKeys)

					if !reflect.DeepEqual(oldKeys, newKeys) {
						sendMessage("SECRET KEYS", "%s: Secret keys have been modified", objectName)
					} else {
						// Keys are the same, but value(s) changed
						for k := range oldData {
							if !reflect.DeepEqual(oldData[k], newData[k]) {
								sendMessage("SECRET VALUE", "%s: Value for key '%s' has been changed", objectName, k)
								break
							}
						}
					}
				}

			case strings.EqualFold(gvk.Kind, "StatefulSet"), strings.EqualFold(gvk.Kind, "DaemonSet"):
				// Similar to Deployment updates
				oldReplicas, oldExists, _ := unstructured.NestedInt64(old.Object, "spec", "replicas")
				newReplicas, newExists, _ := unstructured.NestedInt64(new.Object, "spec", "replicas")

				if oldExists && newExists && oldReplicas != newReplicas {
					sendMessage("REPLICAS CHANGED", "%s %s: %d → %d", gvk.Kind, objectName, oldReplicas, newReplicas)
				}

				// Status updates
				oldStatus, oldStatusExists, _ := unstructured.NestedMap(old.Object, "status")
				newStatus, newStatusExists, _ := unstructured.NestedMap(new.Object, "status")

				if oldStatusExists && newStatusExists {
					oldReady, oldReadyExists, _ := unstructured.NestedInt64(oldStatus, "readyReplicas")
					newReady, newReadyExists, _ := unstructured.NestedInt64(newStatus, "readyReplicas")

					if oldReadyExists && newReadyExists && oldReady != newReady {
						sendMessage("READY REPLICAS", "%s %s: %d → %d", gvk.Kind, objectName, oldReady, newReady)
					}
				}

			case strings.EqualFold(gvk.Kind, "Ingress"):
				// Check for host changes
				oldRules, oldRulesExists, _ := unstructured.NestedSlice(old.Object, "spec", "rules")
				newRules, newRulesExists, _ := unstructured.NestedSlice(new.Object, "spec", "rules")

				if oldRulesExists && newRulesExists && !reflect.DeepEqual(oldRules, newRules) {
					oldHosts := []string{}
					for _, r := range oldRules {
						rule := r.(map[string]interface{})
						if host, exists := rule["host"]; exists {
							oldHosts = append(oldHosts, host.(string))
						}
					}

					newHosts := []string{}
					for _, r := range newRules {
						rule := r.(map[string]interface{})
						if host, exists := rule["host"]; exists {
							newHosts = append(newHosts, host.(string))
						}
					}

					sort.Strings(oldHosts)
					sort.Strings(newHosts)

					if !reflect.DeepEqual(oldHosts, newHosts) {
						sendMessage("INGRESS HOSTS", "%s: Host configuration changed", objectName)
						sendMessage("HOSTS CHANGED", "Before: %s, After: %s", strings.Join(oldHosts, ", "), strings.Join(newHosts, ", "))
					} else {
						sendMessage("INGRESS RULES", "%s: Path rules have been updated", objectName)
					}
				}

				// Check for TLS changes
				oldTLS, oldTLSExists, _ := unstructured.NestedSlice(old.Object, "spec", "tls")
				newTLS, newTLSExists, _ := unstructured.NestedSlice(new.Object, "spec", "tls")

				if (!oldTLSExists && newTLSExists) || (oldTLSExists && !newTLSExists) {
					sendMessage("TLS CONFIG", "%s: TLS configuration %s", objectName, "added")
					sendMessage("TLS CONFIG", "%s: TLS configuration %s", objectName, "removed")
				} else if oldTLSExists && newTLSExists && !reflect.DeepEqual(oldTLS, newTLS) {
					sendMessage("TLS CONFIG", "%s: TLS configuration modified", objectName)
				}
			}
		},
		DeleteFunc: func(obj interface{}) {
			mux.RLock()
			defer mux.RUnlock()
			if !synced {
				return
			}

			item, ok := obj.(*unstructured.Unstructured)
			if !ok {
				log.Printf("item is not *unstructured.Unstructured")
				return
			}

			gvk := item.GroupVersionKind()
			objectName := item.GetName()
			objectNamespace := item.GetNamespace()
			uid := string(item.GetUID())

			sendMessage("DELETED", "Kind=%s, Name=%s, Namespace=%s, UID=%s",
				gvk.Kind, objectName, objectNamespace, uid)

			// Resource-specific deletion messages
			switch {
			case strings.EqualFold(gvk.Kind, "Service"):
				sendMessage("SERVICE REMOVED", "Service %s in namespace %s was deleted", objectName, objectNamespace)

			case strings.EqualFold(gvk.Kind, "Deployment"):
				sendMessage("DEPLOYMENT REMOVED", "Deployment %s in namespace %s was deleted", objectName, objectNamespace)

			case strings.EqualFold(gvk.Kind, "ConfigMap"):
				sendMessage("CONFIG REMOVED", "ConfigMap %s in namespace %s was deleted", objectName, objectNamespace)

			case strings.EqualFold(gvk.Kind, "Secret"):
				sendMessage("SECRET REMOVED", "Secret %s in namespace %s was deleted", objectName, objectNamespace)

			case strings.EqualFold(gvk.Kind, "Ingress"):
				sendMessage("INGRESS REMOVED", "Ingress %s in namespace %s was deleted", objectName, objectNamespace)
			}
		},
	})

	go informer.Run(c.Done())

	isSynced := cache.WaitForCacheSync(c.Done(), informer.HasSynced)
	mux.Lock()
	synced = isSynced
	mux.Unlock()

	if !isSynced {
		sendMessage("ERROR", "Failed to sync informer cache")
		log.Println("Failed to sync informer cache")
		return
	}

	sendMessage("INFO", "Started monitoring %s in namespace %s", resourceKind, namespace)
	if name != "" {
		sendMessage("INFO", "Filtered to resource name: %s", name)
	}

	<-c.Done()
	sendMessage("INFO", "Stopping monitoring session")
}
