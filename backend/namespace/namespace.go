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
	// Try to get data from cache first
	cachedData, err := redis.GetNamespaceCache(namespaceCacheKey)
	if err == nil && cachedData != "" {
		var result []NamespaceDetails
		if err := json.Unmarshal([]byte(cachedData), &result); err == nil {
			return result, nil
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout*2)
	defer cancel()

	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Kubernetes client: %w", err)
	}

	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	// Process namespaces with strict rate limiting
	var (
		wg          sync.WaitGroup
		mu          sync.Mutex
		result      = make([]NamespaceDetails, 0, len(namespaces.Items))
		rateLimiter = time.NewTicker(time.Second / 4) // Max 4 requests per second
		errCount    int
	)
	defer rateLimiter.Stop()

	for _, ns := range namespaces.Items {
		// Skip system namespaces
		if shouldHideNamespace(ns.Name) {
			continue
		}

		// Check if we already have this namespace in Redis cache
		nsKey := fmt.Sprintf("namespace_%s", ns.Name)
		cachedNs, err := redis.GetNamespaceCache(nsKey)
		if err == nil && cachedNs != "" {
			var details NamespaceDetails
			if err := json.Unmarshal([]byte(cachedNs), &details); err == nil {
				mu.Lock()
				result = append(result, details)
				mu.Unlock()
				continue
			}
		}

		wg.Add(1)
		go func(ns v1.Namespace) {
			defer wg.Done()
			<-rateLimiter.C // Wait for rate limiter

			// Create basic namespace details with available data
			details := NamespaceDetails{
				Name:      ns.Name,
				Status:    string(ns.Status.Phase),
				Labels:    ns.Labels,
				Resources: make(map[string][]unstructured.Unstructured),
			}

			// Prioritize non-system namespaces
			if !strings.HasPrefix(ns.Name, "kube-") {
				nsDetails, err := fetchNamespaceResourcesWithRetry(ns.Name)
				if err == nil && nsDetails != nil {
					details = *nsDetails
					// Cache individual namespace data
					if jsonData, err := json.Marshal(details); err == nil {
						redis.SetNamespaceCache(fmt.Sprintf("namespace_%s", ns.Name), string(jsonData), cacheTTL*2)
					}
				} else {
					mu.Lock()
					errCount++
					mu.Unlock()
				}
			}

			mu.Lock()
			result = append(result, details)
			mu.Unlock()
		}(ns)
	}

	wg.Wait()

	// Cache the complete result if successful
	if errCount == 0 {
		if jsonData, err := json.Marshal(result); err == nil {
			redis.SetNamespaceCache(namespaceCacheKey, string(jsonData), cacheTTL)
		}
	}

	return result, nil
}

// fetchNamespaceResourcesWithRetry fetches resources with exponential backoff
func fetchNamespaceResourcesWithRetry(namespace string) (*NamespaceDetails, error) {
	var (
		details *NamespaceDetails
		err     error
		retries = 3
		backoff = 100 * time.Millisecond
	)

	for i := 0; i < retries; i++ {
		details, err = GetNamespaceResourcesLimited(namespace)
		if err == nil {
			return details, nil
		}
		time.Sleep(backoff)
		backoff *= 2 // Exponential backoff
	}

	return nil, err
}

// GetNamespaceResourcesLimited fetches limited resources to avoid throttling
func GetNamespaceResourcesLimited(namespace string) (*NamespaceDetails, error) {
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

	// Try to get discovery info from cache
	var resources []*metav1.APIResourceList
	cachedResources, err := redis.GetNamespaceCache("api_resources")
	if err == nil && cachedResources != "" {
		if err := json.Unmarshal([]byte(cachedResources), &resources); err != nil {
			// If unmarshal fails, fetch from API
			resources, err = clientset.Discovery().ServerPreferredNamespacedResources()
			if err != nil {
				return nil, fmt.Errorf("failed to discover resources: %w", err)
			}
			// Cache for future use
			if jsonData, err := json.Marshal(resources); err == nil {
				redis.SetNamespaceCache("api_resources", string(jsonData), 30*time.Minute)
			}
		}
	} else {
		resources, err = clientset.Discovery().ServerPreferredNamespacedResources()
		if err != nil {
			return nil, fmt.Errorf("failed to discover resources: %w", err)
		}
		// Cache for future use
		if jsonData, err := json.Marshal(resources); err == nil {
			redis.SetNamespaceCache("api_resources", string(jsonData), 30*time.Minute)
		}
	}

	details := &NamespaceDetails{
		Name:      ns.Name,
		Status:    string(ns.Status.Phase),
		Labels:    ns.Labels,
		Resources: make(map[string][]unstructured.Unstructured),
	}

	// Limit to important resources to avoid throttling and hide sensitive resources
	importantResources := map[string]bool{
		"pods":         true,
		"services":     true,
		"deployments":  true,
		"statefulsets": true,
	}

	resourceCount := 0
	for _, apiResourceList := range resources {
		if resourceCount >= 10 { // Limit number of resource types
			break
		}

		gv, err := schema.ParseGroupVersion(apiResourceList.GroupVersion)
		if err != nil {
			continue
		}

		for _, apiResource := range apiResourceList.APIResources {
			if !containsVerb(apiResource.Verbs, "list") {
				continue
			}

			// Skip sensitive resources
			if isSensitiveResource(apiResource.Name) {
				continue
			}

			// Skip less important resources for throttling prevention
			isImportant := importantResources[apiResource.Name]
			if !isImportant && resourceCount >= 5 {
				continue
			}

			gvr := schema.GroupVersionResource{
				Group:    gv.Group,
				Version:  gv.Version,
				Resource: apiResource.Name,
			}

			resourceKey := fmt.Sprintf("%s.%s/%s", gvr.Group, gvr.Version, gvr.Resource)

			// Try from cache first
			cacheKey := fmt.Sprintf("ns_%s_res_%s", namespace, resourceKey)
			cachedResource, _ := redis.GetNamespaceCache(cacheKey)
			if cachedResource != "" {
				var items []unstructured.Unstructured
				if err := json.Unmarshal([]byte(cachedResource), &items); err == nil && len(items) > 0 {
					details.Resources[resourceKey] = items
					resourceCount++
					continue
				}
			}

			// Fetch from API if not in cache
			list, err := dynamicClient.Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{})
			if err != nil {
				continue
			}

			if len(list.Items) > 0 {
				details.Resources[resourceKey] = list.Items
				// Cache this resource
				if jsonData, err := json.Marshal(list.Items); err == nil {
					redis.SetNamespaceCache(cacheKey, string(jsonData), cacheTTL)
				}
				resourceCount++
			}
		}
	}

	return details, nil
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

	// Send initial data immediately - always from cache if available
	cachedData, err := redis.GetNamespaceCache(namespaceCacheKey)
	if err == nil && cachedData != "" {
		_ = conn.WriteMessage(websocket.TextMessage, []byte(cachedData))
	} else {
		// If no cache available, send minimal data to client
		initialData, _ := getMinimalNamespaceData()
		if initialData != nil {
			jsonData, _ := json.Marshal(initialData)
			_ = conn.WriteMessage(websocket.TextMessage, jsonData)
		}
	}

	// Create a ticker with gradually increasing interval
	// Start with frequent updates then slow down
	interval := 3 * time.Second
	ticker := time.NewTicker(interval)
	updateCount := 0
	defer ticker.Stop()

	for {
		select {
		case <-done:
			return // Stop if client disconnects
		case <-ticker.C:
			// Gradually increase update interval to reduce load
			updateCount++
			if updateCount == 5 {
				ticker.Reset(5 * time.Second)
			} else if updateCount == 10 {
				ticker.Reset(10 * time.Second)
			}

			// Try to get data from cache first, fallback to minimal fetch
			data, err := getLatestNamespaceData()
			if err != nil || data == nil {
				continue // Skip this update if we can't get data
			}

			jsonData, err := json.Marshal(data)
			if err != nil {
				continue
			}

			// Only send if data actually changed (using hash comparison)
			currentHash := fmt.Sprintf("%d", len(jsonData))
			lastSentHash, _ := redis.GetNamespaceCache("last_sent_hash")

			if currentHash != lastSentHash {
				if err := conn.WriteMessage(websocket.TextMessage, jsonData); err == nil {
					redis.SetNamespaceCache("last_sent_hash", currentHash, cacheTTL)
				}
			}
		}
	}
}

// getLatestNamespaceData tries multiple ways to get namespace data
func getLatestNamespaceData() ([]NamespaceDetails, error) {
	// Try cache first
	cachedData, err := redis.GetNamespaceCache(namespaceCacheKey)
	if err == nil && cachedData != "" {
		var result []NamespaceDetails
		if err := json.Unmarshal([]byte(cachedData), &result); err == nil {
			return result, nil
		}
	}

	// Try live data with timeout
	dataChan := make(chan []NamespaceDetails, 1)
	errChan := make(chan error, 1)

	go func() {
		data, err := GetAllNamespacesWithResources()
		if err != nil {
			errChan <- err
			return
		}
		dataChan <- data
	}()

	select {
	case data := <-dataChan:
		return data, nil
	case <-time.After(3 * time.Second):
		// Timeout - get minimal data
		return getMinimalNamespaceData()
	case <-errChan:
		// Error - get minimal data
		return getMinimalNamespaceData()
	}
}

// getMinimalNamespaceData gets just namespace names without heavy resource details
func getMinimalNamespaceData() ([]NamespaceDetails, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return nil, err
	}

	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	result := make([]NamespaceDetails, 0, len(namespaces.Items))
	for _, ns := range namespaces.Items {
		// Skip system namespaces
		if shouldHideNamespace(ns.Name) {
			continue
		}

		result = append(result, NamespaceDetails{
			Name:      ns.Name,
			Status:    string(ns.Status.Phase),
			Labels:    ns.Labels,
			Resources: make(map[string][]unstructured.Unstructured),
		})
	}

	return result, nil
}

// shouldHideNamespace returns true if a namespace should be hidden from the UI
func shouldHideNamespace(name string) bool {
	prefixesToHide := []string{
		"kube-",
		"openshift-",
		"istio-system",
		"knative-",
		"calico-",
		"tigera-",
	}

	for _, prefix := range prefixesToHide {
		if strings.HasPrefix(name, prefix) {
			return true
		}
	}

	return false
}

// isSensitiveResource returns true if a resource type contains sensitive data
func isSensitiveResource(resourceType string) bool {
	sensitiveResources := map[string]bool{
		"secrets":                    true,
		"configmaps":                 true,
		"certificatesigningrequests": true,
		"certificaterequests":        true,
		"certificates":               true,
		"tokenreviews":               true,
		"rolebindings":               true,
		"clusterrolebindings":        true,
		"roles":                      true,
		"clusterroles":               true,
	}

	return sensitiveResources[resourceType]
}
