package k8s

import (
	"bytes"
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
					err := EnsureNamespaceExists(dynamicClient, namespace)
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
		if isNamespaced {
			resource = dynamicClient.Resource(gvr).Namespace(namespace)
		} else {
			resource = dynamicClient.Resource(gvr)
		}

		resourceObj := &unstructured.Unstructured{Object: resourceData}
		autoLabelling(resourceObj)
		result, err := resource.Create(c, resourceObj, v1.CreateOptions{})
		if err != nil {
			return results, fmt.Errorf("failed to create resource %s: %v", resourceKind, err)
		}
		results = append(results, result)
	}
	return results, nil

}

func autoLabelling(obj *unstructured.Unstructured) {
	labels := obj.GetLabels()
	if labels == nil {
		labels = make(map[string]string)
	}
	labelKey := "kubernetes.io/name"

	if _, exists := labels[labelKey]; !exists {
		labels[labelKey] = obj.GetName()
		obj.SetLabels(labels)
	}
}

// CreateResource creates a Kubernetes resource
func CreateResource(c *gin.Context) {
	clientset, dynamicClient, err := GetClientSet()
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

func UploadYAMLFile(c *gin.Context) {
	clientset, dynamicClient, err := GetClientSet()
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

func tweakListOptions(name string) dynamicinformer.TweakListOptionsFunc {
	// Filter by resource name
	if name != "" {
		return func(options *metav1.ListOptions) {
			options.FieldSelector = fmt.Sprintf("metadata.name=%s", name)
		}
	}
	return nil
}

func LogWorkloads(c *gin.Context) {
	clientset, dynamicClient, err := GetClientSet()
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
	//tweakListOptions := nil

	factory := dynamicinformer.NewFilteredDynamicSharedInformerFactory(dynamicClient, time.Minute, namespace, tweakListOptions(name))
	//factory := dynamicinformer.NewFilteredDynamicSharedInformerFactory(dynamicClient, time.Minute, namespace, func(options *metav1.ListOptions) {
	//	options.FieldSelector = fmt.Sprintf("metadata.name=%s", name) // Filter by resource name
	//})
	informer := factory.ForResource(gvr).Informer()

	mux := &sync.RWMutex{}
	synced := false
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
			uid := string(item.GetUID())
			gvk := item.GroupVersionKind()
			//data, err := item.MarshalJSON()
			//if err != nil {
			//	log.Printf("failed to marshal resource %s: %v", uid, err)
			//	return
			//}
			timestamp := time.Now().Format(time.RFC3339)
			message := fmt.Sprintf("[%s] ADDED: Kind=%s, Name=%s, Namespace=%s, UID=%s",
				timestamp, gvk.Kind, item.GetName(), namespace, uid)
			if err := conn.WriteMessage(websocket.TextMessage, []byte(message)); err != nil {
				log.Println("Error writing to WebSocket:", err)
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
			//data, err := item.MarshalJSON()
			//if err != nil {
			//	log.Printf("failed to marshal resource %s: %v", uid, err)
			//	return
			//}
			uid := string(old.GetUID())
			gvk := old.GroupVersionKind()
			// TODO: Improve the logs information and add some valuable messages
			if old.GetResourceVersion() != new.GetResourceVersion() {
				timestamp := time.Now().Format(time.RFC3339)
				message := fmt.Sprintf("[%s] UPDATED: Kind=%s, Name=%s, Namespace=%s, UID=%s",
					timestamp, gvk.Kind, old.GetName(), old.GetNamespace(), uid)
				if err := conn.WriteMessage(websocket.TextMessage, []byte(message)); err != nil {
					log.Println("Error writing to WebSocket:", err)
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
			uid := string(item.GetUID())
			gvk := item.GroupVersionKind()
			timestamp := time.Now().Format(time.RFC3339)
			message := fmt.Sprintf("[%s] DELETED: Kind=%s, Name=%s, Namespace=%s, UID=%s",
				timestamp, gvk.Kind, item.GetName(), namespace, uid)
			if err := conn.WriteMessage(websocket.TextMessage, []byte(message)); err != nil {
				log.Println("Error writing to WebSocket:", err)
			}
		},
	})

	// TODO: Optimize the websocket connection and handle the interrupt properly
	//ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	//defer cancel()

	go informer.Run(c.Done())

	isSynced := cache.WaitForCacheSync(c.Done(), informer.HasSynced)
	mux.Lock()
	synced = isSynced
	mux.Unlock()
	if !isSynced {
		log.Fatal("failed to sync")
	}
	<-c.Done()
}
