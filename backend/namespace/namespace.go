package ns

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
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

const (
	requestTimeout        = 5 * time.Second
	updateInterval        = 5 * time.Second
	cacheTTL              = 10 * time.Second
	namespaceCacheKey     = "namespace_data"
	maxConcurrentRequests = 5
)

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
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return fmt.Errorf("failed to initialize Kubernetes client: %w", err)
	}

	_, err = clientset.CoreV1().Namespaces().Create(ctx, &v1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:   namespace.Name,
			Labels: namespace.Labels,
		},
	}, metav1.CreateOptions{})

	if err != nil {
		return fmt.Errorf("failed to create namespace: %w", err)
	}
	return nil
}

// GetAllNamespaces fetches all namespaces along with their pods
func GetAllNamespaces() ([]models.Namespace, error) {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Kubernetes client: %w", err)
	}

	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	result := make([]models.Namespace, 0, len(namespaces.Items))
	for _, ns := range namespaces.Items {
		pods, err := clientset.CoreV1().Pods(ns.Name).List(ctx, metav1.ListOptions{})
		if err != nil {
			// Log error but continue with empty pod list
			continue
		}

		podNames := make([]string, 0, len(pods.Items))
		for _, pod := range pods.Items {
			podNames = append(podNames, pod.Name)
		}

		result = append(result, models.Namespace{
			Name:   ns.Name,
			Status: string(ns.Status.Phase),
			Pods:   podNames,
		})
	}

	return result, nil
}

// GetNamespaceResources fetches resources for a namespace using discovery API
func GetNamespaceResources(namespace string) (*NamespaceDetails, error) {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	clientset, dynamicClient, err := k8s.GetClientSet()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Kubernetes client: %w", err)
	}

	ns, err := clientset.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("namespace '%s' not found: %w", namespace, err)
	}

	resources, err := clientset.Discovery().ServerPreferredNamespacedResources()
	if err != nil {
		return nil, fmt.Errorf("failed to discover resources: %w", err)
	}

	details := &NamespaceDetails{
		Name:      ns.Name,
		Status:    string(ns.Status.Phase),
		Labels:    ns.Labels,
		Resources: make(map[string][]unstructured.Unstructured),
	}

	// Use worker pool for concurrent resource fetching
	var wg sync.WaitGroup
	resourceCh := make(chan schema.GroupVersionResource, 100)
	resultCh := make(chan struct {
		key   string
		items []unstructured.Unstructured
	}, 100)

	// Start workers
	for i := 0; i < maxConcurrentRequests; i++ {
		go func() {
			for gvr := range resourceCh {
				list, err := dynamicClient.Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{})
				if err != nil {
					wg.Done()
					continue
				}

				resourceKey := fmt.Sprintf("%s.%s/%s", gvr.Group, gvr.Version, gvr.Resource)
				resultCh <- struct {
					key   string
					items []unstructured.Unstructured
				}{key: resourceKey, items: list.Items}
				wg.Done()
			}
		}()
	}

	// Queue resource requests
	for _, apiResourceList := range resources {
		gv, err := schema.ParseGroupVersion(apiResourceList.GroupVersion)
		if err != nil {
			continue
		}

		for _, apiResource := range apiResourceList.APIResources {
			if !containsVerb(apiResource.Verbs, "list") {
				continue
			}

			wg.Add(1)
			resourceCh <- schema.GroupVersionResource{
				Group:    gv.Group,
				Version:  gv.Version,
				Resource: apiResource.Name,
			}
		}
	}

	// Close channels after processing
	go func() {
		wg.Wait()
		close(resourceCh)
		close(resultCh)
	}()

	// Collect results
	for result := range resultCh {
		if len(result.items) > 0 {
			details.Resources[result.key] = result.items
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
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return fmt.Errorf("failed to initialize Kubernetes client: %w", err)
	}

	ns, err := clientset.CoreV1().Namespaces().Get(ctx, namespaceName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("namespace '%s' not found: %w", namespaceName, err)
	}

	ns.Labels = labels
	_, err = clientset.CoreV1().Namespaces().Update(ctx, ns, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("failed to update namespace: %w", err)
	}

	return nil
}

// DeleteNamespace removes a namespace
func DeleteNamespace(name string) error {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return fmt.Errorf("failed to initialize Kubernetes client: %w", err)
	}

	err = clientset.CoreV1().Namespaces().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete namespace '%s': %w", name, err)
	}
	return nil
}

// GetAllNamespacesWithResources retrieves all namespaces with their resources
func GetAllNamespacesWithResources() ([]NamespaceDetails, error) {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Kubernetes client: %w", err)
	}

	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	// Process namespaces concurrently with limited parallelism
	var (
		wg     sync.WaitGroup
		mu     sync.Mutex
		result = make([]NamespaceDetails, 0, len(namespaces.Items))
		sem    = make(chan struct{}, maxConcurrentRequests)
	)

	for _, ns := range namespaces.Items {
		wg.Add(1)
		go func(nsName string) {
			defer wg.Done()
			sem <- struct{}{}        // Acquire semaphore
			defer func() { <-sem }() // Release semaphore

			details, err := GetNamespaceResources(nsName)
			if err != nil {
				return
			}

			mu.Lock()
			result = append(result, *details)
			mu.Unlock()
		}(ns.Name)
	}

	wg.Wait()
	return result, nil
}

// NamespaceWebSocketHandler handles WebSocket connections with optimized real-time updates
func NamespaceWebSocketHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not open WebSocket connection", http.StatusBadRequest)
		return
	}
	defer conn.Close()

	// Monitor for client disconnections
	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return // Client disconnected
			}
		}
	}()

	// Send cached data immediately
	cachedData, err := redis.GetNamespaceCache(namespaceCacheKey)
	if err == nil && cachedData != "" {
		_ = conn.WriteMessage(websocket.TextMessage, []byte(cachedData))
	}

	// Ticker for periodic updates
	ticker := time.NewTicker(updateInterval)
	defer ticker.Stop()

	for {
		select {
		case <-done:
			return // Stop if client disconnects
		case <-ticker.C:
			// Fetch live data in a separate goroutine to avoid blocking
			go func() {
				data, err := GetAllNamespacesWithResources()
				var jsonData []byte

				if err != nil {
					// If fetching fails, use cached data
					if cachedData != "" {
						jsonData = []byte(cachedData)
					} else {
						_ = conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Error: %v", err)))
						return
					}
				} else {
					// Process and filter data before sending
					FilterSensitiveData(data)

					jsonData, err = json.Marshal(data)
					if err != nil {
						return
					}

					// Update cache
					redis.SetNamespaceCache(namespaceCacheKey, string(jsonData), cacheTTL)
				}

				// Send data to the client
				_ = conn.WriteMessage(websocket.TextMessage, jsonData)
			}()
		}
	}
}

// FilterSensitiveData removes sensitive namespace details and resources
func FilterSensitiveData(data []NamespaceDetails) {
	sensitiveNamespaces := map[string]bool{
		"kube-system":     true,
		"kube-public":     true,
		"kube-node-lease": true,
	}

	sensitiveResources := map[string]bool{
		"secrets":         true,
		"configmaps":      true,
		"serviceaccounts": true,
	}

	for i := range data {
		// Redact sensitive namespace details
		if sensitiveNamespaces[data[i].Name] {
			data[i].Resources = make(map[string][]unstructured.Unstructured)
			data[i].Labels = map[string]string{"redacted": "true"}
			continue
		}

		// Remove sensitive resources
		for resourceType := range data[i].Resources {
			for sensitive := range sensitiveResources {
				if strings.HasSuffix(resourceType, "/"+sensitive) || strings.Contains(resourceType, "certificates") {
					delete(data[i].Resources, resourceType)
					break
				}
			}
		}
	}
}
