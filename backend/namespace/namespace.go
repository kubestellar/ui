package ns

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/katamyra/kubestellarUI/k8s"
	"github.com/katamyra/kubestellarUI/models"
	"github.com/katamyra/kubestellarUI/redis"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// timeout duration for Kubernetes API requests
const requestTimeout = 5 * time.Second

var upgrader = websocket.Upgrader{
	CheckOrigin: func(_ *http.Request) bool { return true },
}

// NamespaceDetails holds namespace information and resources
type NamespaceDetails struct {
	Name      string                                 `json:"name"`
	Status    string                                 `json:"status"`
	Labels    map[string]string                      `json:"labels"`
	Resources map[string][]unstructured.Unstructured `json:"resources"`
}

// CreateNamespace creates a new namespace
func CreateNamespace(namespace models.Namespace) error {
	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return fmt.Errorf("failed to initialize Kubernetes client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	_, err = clientset.CoreV1().Namespaces().Create(ctx, &v1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:   namespace.Name,
			Labels: namespace.Labels,
		},
	}, metav1.CreateOptions{})

	if err != nil {
		return fmt.Errorf("failed to create namespace: %v", err)
	}
	return nil
}

// GetAllNamespaces fetches all namespaces along with their pods
func GetAllNamespaces() ([]models.Namespace, error) {
	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Kubernetes client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %v", err)
	}

	var namespaceDetails []models.Namespace
	for _, ns := range namespaces.Items {
		pods, _ := clientset.CoreV1().Pods(ns.Name).List(ctx, metav1.ListOptions{})

		var podNames []string
		for _, pod := range pods.Items {
			podNames = append(podNames, pod.Name)
		}

		namespaceDetails = append(namespaceDetails, models.Namespace{
			Name:   ns.Name,
			Status: string(ns.Status.Phase),
			Pods:   podNames,
		})
	}

	return namespaceDetails, nil
}

// GetNamespaceResources fetches resources for a namespace using discovery API
func GetNamespaceResources(namespace string) (*NamespaceDetails, error) {
	clientset, dynamicClient, err := k8s.GetClientSet()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Kubernetes client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	ns, err := clientset.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("namespace '%s' not found: %v", namespace, err)
	}

	// Use discovery API to get available API resources
	resources, err := clientset.Discovery().ServerPreferredNamespacedResources()
	if err != nil {
		return nil, fmt.Errorf("failed to discover resources: %v", err)
	}

	details := &NamespaceDetails{
		Name:      ns.Name,
		Status:    string(ns.Status.Phase),
		Labels:    ns.Labels,
		Resources: make(map[string][]unstructured.Unstructured),
	}

	// Fetch resources for the namespace based on discovered API resources
	for _, apiResourceList := range resources {
		for _, apiResource := range apiResourceList.APIResources {
			// Skip resources that can't be listed or watched
			if !containsVerb(apiResource.Verbs, "list") {
				continue
			}

			gv, err := schema.ParseGroupVersion(apiResourceList.GroupVersion)
			if err != nil {
				continue
			}

			gvr := schema.GroupVersionResource{
				Group:    gv.Group,
				Version:  gv.Version,
				Resource: apiResource.Name,
			}

			// Get resources in the namespace
			list, err := dynamicClient.Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{})
			if err != nil {
				// Skip resources that error
				continue
			}

			resourceKey := fmt.Sprintf("%s.%s/%s", gv.Group, gv.Version, apiResource.Name)
			details.Resources[resourceKey] = list.Items
		}
	}

	return details, nil
}

// containsVerb checks if a verb is in the list of verbs
func containsVerb(verbs []string, verb string) bool {
	for _, v := range verbs {
		if v == verb {
			return true
		}
	}
	return false
}

// UpdateNamespace updates namespace labels
func UpdateNamespace(namespaceName string, labels map[string]string) error {
	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return fmt.Errorf("failed to initialize Kubernetes client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	ns, err := clientset.CoreV1().Namespaces().Get(ctx, namespaceName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("namespace '%s' not found", namespaceName)
	}

	ns.Labels = labels
	_, err = clientset.CoreV1().Namespaces().Update(ctx, ns, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("failed to update namespace: %v", err)
	}

	return nil
}

// DeleteNamespace removes a namespace
func DeleteNamespace(name string) error {
	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return fmt.Errorf("failed to initialize Kubernetes client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	err = clientset.CoreV1().Namespaces().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete namespace '%s': %v", name, err)
	}
	return nil
}

// GetAllNamespacesWithResources retrieves all namespaces along with their associated resources.
func GetAllNamespacesWithResources() ([]NamespaceDetails, error) {
	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Kubernetes client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %v", err)
	}

	var namespaceDetails []NamespaceDetails

	for _, ns := range namespaces.Items {
		details, err := GetNamespaceResources(ns.Name)
		if err != nil {
			continue
		}
		namespaceDetails = append(namespaceDetails, *details)
	}

	return namespaceDetails, nil
}

// NamespaceWebSocketHandler handles WebSocket connections and streams namespace updates.
func NamespaceWebSocketHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not open websocket connection", http.StatusBadRequest)
		return
	}
	defer conn.Close()

	for {
		// Try to fetch from Redis cache first
		cachedData, err := redis.GetNamespaceCache("namespace_data")
		if err != nil {
			fmt.Println("Redis error:", err)
		}

		var jsonData []byte
		if cachedData == "" {
			// If cache miss, fetch data from Kubernetes
			data, err := GetAllNamespacesWithResources()
			if err != nil {
				err = conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Error fetching namespaces: %v", err)))
				if err != nil {
					fmt.Println("WebSocket error:", err)
				}
				return
			}

			jsonData, _ = json.Marshal(data)
			err = redis.SetNamespaceCache("namespace_data", string(jsonData), 10*time.Second) // Cache data for 10 seconds

			if err != nil {
				fmt.Println("Redis error:", err)
			}
		} else {
			// Use cached data
			jsonData = []byte(cachedData)
		}

		conn.WriteMessage(websocket.TextMessage, jsonData)
		time.Sleep(5 * time.Second) // Stream updates every 5 seconds
	}
}
