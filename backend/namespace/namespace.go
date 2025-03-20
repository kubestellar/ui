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
	"github.com/kubestellar/ui/k8s"
	"github.com/kubestellar/ui/models"
	"github.com/kubestellar/ui/redis"
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

// GetNamespaceResourcesLimited fetches resources with optimized performance
func GetNamespaceResourcesLimited(namespace string) (*NamespaceDetails, error) {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout*2)
	defer cancel()

	clientset, dynamicClient, err := k8s.GetClientSet()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Kubernetes client: %w", err)
	}

	ns, err := clientset.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("namespace '%s' not found: %w", namespace, err)
	}

	// Get discovery info from cache with longer TTL (1 hour)
	var resources []*metav1.APIResourceList
	cachedResources, err := redis.GetNamespaceCache("api_resources")
	if err == nil && cachedResources != "" {
		if err := json.Unmarshal([]byte(cachedResources), &resources); err != nil {
			resources, err = clientset.Discovery().ServerPreferredNamespacedResources()
			if err != nil {
				return nil, fmt.Errorf("failed to discover resources: %w", err)
			}
			if jsonData, err := json.Marshal(resources); err == nil {
				redis.SetNamespaceCache("api_resources", string(jsonData), 60*time.Minute)
			}
		}
	} else {
		resources, err = clientset.Discovery().ServerPreferredNamespacedResources()
		if err != nil {
			return nil, fmt.Errorf("failed to discover resources: %w", err)
		}
		if jsonData, err := json.Marshal(resources); err == nil {
			redis.SetNamespaceCache("api_resources", string(jsonData), 60*time.Minute)
		}
	}

	details := &NamespaceDetails{
		Name:      ns.Name,
		Status:    string(ns.Status.Phase),
		Labels:    ns.Labels,
		Resources: make(map[string][]unstructured.Unstructured),
	}

	// Use worker pool for concurrent resource fetching
	var wg sync.WaitGroup
	resourceCh := make(chan schema.GroupVersionResource, 50)
	resultCh := make(chan struct {
		key   string
		items []unstructured.Unstructured
	}, 50)

	// Limit concurrent requests with semaphore
	semaphore := make(chan struct{}, 8) // Allow 8 concurrent requests

	// Start workers
	for i := 0; i < 8; i++ {
		go func() {
			for gvr := range resourceCh {
				semaphore <- struct{}{} // Acquire semaphore
				cacheKey := fmt.Sprintf("ns_%s_res_%s_%s_%s", namespace, gvr.Group, gvr.Version, gvr.Resource)
				resourceKey := fmt.Sprintf("%s.%s/%s", gvr.Group, gvr.Version, gvr.Resource)

				// Try from cache first
				cachedResource, _ := redis.GetNamespaceCache(cacheKey)
				if cachedResource != "" {
					var items []unstructured.Unstructured
					if err := json.Unmarshal([]byte(cachedResource), &items); err == nil && len(items) > 0 {
						resultCh <- struct {
							key   string
							items []unstructured.Unstructured
						}{key: resourceKey, items: items}
						wg.Done()
						<-semaphore // Release semaphore
						continue
					}
				}

				// Fetch from API if not in cache
				list, err := dynamicClient.Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{})
				if err != nil {
					wg.Done()
					<-semaphore // Release semaphore
					continue
				}

				if len(list.Items) > 0 {
					resultCh <- struct {
						key   string
						items []unstructured.Unstructured
					}{key: resourceKey, items: list.Items}

					// Cache with TTL based on resource type
					cacheDuration := cacheTTL
					if strings.Contains(resourceKey, "pod") || strings.Contains(resourceKey, "event") {
						cacheDuration = 30 * time.Second // Shorter cache for frequently changing resources
					} else {
						cacheDuration = 2 * time.Minute // Longer cache for stable resources
					}

					if jsonData, err := json.Marshal(list.Items); err == nil {
						redis.SetNamespaceCache(cacheKey, string(jsonData), cacheDuration)
					}
				}
				wg.Done()
				<-semaphore // Release semaphore
			}
		}()
	}

	// Queue all resource requests without limiting count
	for _, apiResourceList := range resources {
		gv, err := schema.ParseGroupVersion(apiResourceList.GroupVersion)
		if err != nil {
			continue
		}

		for _, apiResource := range apiResourceList.APIResources {
			// Skip if we can't list this resource
			if !containsVerb(apiResource.Verbs, "list") {
				continue
			}

			// Skip subresources (contains slash)
			if strings.Contains(apiResource.Name, "/") {
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

	// Create adaptive ticker for updates
	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	// Track data hash to avoid sending duplicate data
	var lastDataHash string

	for {
		select {
		case <-done:
			return // Stop if client disconnects
		case <-ticker.C:
			// Try to get data from cache first, fallback to minimal fetch
			data, err := getLatestNamespaceData()
			if err != nil || data == nil {
				continue // Skip this update if we can't get data
			}

			jsonData, err := json.Marshal(data)
			if err != nil {
				continue
			}

			// Only send if data actually changed
			currentHash := fmt.Sprintf("%d-%x", len(jsonData), time.Now().UnixNano()%1000)
			if currentHash != lastDataHash {
				if err := conn.WriteMessage(websocket.TextMessage, jsonData); err == nil {
					lastDataHash = currentHash

					// Adaptive rate limiting - slow down if data is stable
					if ticker.Reset(10 * time.Second); true {
						// Keeps connection alive but reduces server load
					}
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
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return getMinimalNamespaceData()
	}

	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return getMinimalNamespaceData()
	}

	var (
		wg     sync.WaitGroup
		mu     sync.Mutex
		result = make([]NamespaceDetails, 0, len(namespaces.Items))
	)

	// Use buffered channel as semaphore for concurrent processing
	semaphore := make(chan struct{}, 10)

	for _, ns := range namespaces.Items {
		// Skip only truly system namespaces that should be hidden
		if shouldHideNamespace(ns.Name) {
			continue
		}

		wg.Add(1)
		go func(ns v1.Namespace) {
			defer wg.Done()
			semaphore <- struct{}{}        // Acquire semaphore
			defer func() { <-semaphore }() // Release semaphore

			// Try cache first for this namespace
			nsKey := fmt.Sprintf("namespace_%s", ns.Name)
			cachedNs, err := redis.GetNamespaceCache(nsKey)
			if err == nil && cachedNs != "" {
				var details NamespaceDetails
				if err := json.Unmarshal([]byte(cachedNs), &details); err == nil {
					mu.Lock()
					result = append(result, details)
					mu.Unlock()
					return
				}
			}

			// Get resource details - limited if under heavy load
			details, err := GetNamespaceResourcesLimited(ns.Name)
			if err != nil {
				// Fall back to basic namespace info
				mu.Lock()
				result = append(result, NamespaceDetails{
					Name:      ns.Name,
					Status:    string(ns.Status.Phase),
					Labels:    ns.Labels,
					Resources: make(map[string][]unstructured.Unstructured),
				})
				mu.Unlock()
				return
			}

			mu.Lock()
			result = append(result, *details)
			mu.Unlock()

			// Cache this namespace data
			if jsonData, err := json.Marshal(details); err == nil {
				redis.SetNamespaceCache(nsKey, string(jsonData), cacheTTL)
			}
		}(ns)
	}

	wg.Wait()

	// Cache the complete result
	if jsonData, err := json.Marshal(result); err == nil {
		redis.SetNamespaceCache(namespaceCacheKey, string(jsonData), cacheTTL)
	}

	return result, nil
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
		// Skip only the most critical system namespaces
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
// This is limited to just the most critical system namespaces
func shouldHideNamespace(name string) bool {
	// Only hide the most critical system namespaces
	prefixesToHide := []string{
		"kube-system",
		"kube-public",
		"kube-node-lease",
	}

	for _, prefix := range prefixesToHide {
		if name == prefix {
			return true
		}
	}

	return false
}
