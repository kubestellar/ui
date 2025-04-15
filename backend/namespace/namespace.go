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
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
)

const (
	requestTimeout        = 5 * time.Second
	updateInterval        = 5 * time.Second
	cacheTTL              = 10 * time.Second
	namespaceCacheKey     = "namespace_data"
	maxConcurrentRequests = 5
)

// AvailableContexts defines the list of available Kubernetes contexts
var AvailableContexts = []string{"wds1", "its1"}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(_ *http.Request) bool { return true },
}

// NamespaceDetails holds namespace information and resources
type NamespaceDetails struct {
	Name      string                                 `json:"name"`
	Status    string                                 `json:"status"`
	Labels    map[string]string                      `json:"labels"`
	Resources map[string][]unstructured.Unstructured `json:"resources"`
	Context   string                                 `json:"context,omitempty"`
}

// ExtendedNamespaceDetails adds extra information to NamespaceDetails
type ExtendedNamespaceDetails struct {
	*NamespaceDetails
	CreationTimestamp time.Time `json:"creationTimestamp"`
}

// HasContextPrefix checks if a namespace has a context prefix
func HasContextPrefix(namespace string) (bool, string, string) {
	for _, ctxPrefix := range AvailableContexts {
		prefix := ctxPrefix + "-"
		if strings.HasPrefix(namespace, prefix) {
			cleanName := strings.TrimPrefix(namespace, prefix)
			return true, ctxPrefix, cleanName
		}
	}

	return false, "", namespace
}

// AddContextPrefix adds a context prefix to a namespace if needed
func AddContextPrefix(namespace string, contextName string) string {
	hasPrefix, _, _ := HasContextPrefix(namespace)
	if !hasPrefix {
		return contextName + "-" + namespace
	}
	return namespace
}

// CreateNamespaceWithContext creates a new namespace in the specified context
func CreateNamespaceWithContext(contextName string, namespace models.Namespace) error {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	clientset, _, err := k8s.GetClientSetWithContext(contextName)
	if err != nil {
		return fmt.Errorf("failed to initialize Kubernetes client with context %s: %w", contextName, err)
	}

	// Add context prefix to namespace name if needed
	nameWithPrefix := AddContextPrefix(namespace.Name, contextName)

	_, err = clientset.CoreV1().Namespaces().Create(ctx, &v1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:   nameWithPrefix,
			Labels: namespace.Labels,
		},
	}, metav1.CreateOptions{})

	if err != nil {
		return fmt.Errorf("failed to create namespace: %w", err)
	}
	return nil
}

// UpdateNamespaceWithContext updates namespace labels in the specified context
func UpdateNamespaceWithContext(contextName string, namespaceName string, labels map[string]string) error {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	clientset, _, err := k8s.GetClientSetWithContext(contextName)
	if err != nil {
		return fmt.Errorf("failed to initialize Kubernetes client with context %s: %w", contextName, err)
	}

	ns, err := clientset.CoreV1().Namespaces().Get(ctx, namespaceName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("namespace '%s' not found in context %s: %w", namespaceName, contextName, err)
	}

	ns.Labels = labels
	_, err = clientset.CoreV1().Namespaces().Update(ctx, ns, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("failed to update namespace: %w", err)
	}

	return nil
}

// DeleteNamespaceWithContext removes a namespace from the specified context
func DeleteNamespaceWithContext(contextName string, namespaceName string) error {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	clientset, _, err := k8s.GetClientSetWithContext(contextName)
	if err != nil {
		return fmt.Errorf("failed to initialize Kubernetes client with context %s: %w", contextName, err)
	}

	err = clientset.CoreV1().Namespaces().Delete(ctx, namespaceName, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete namespace '%s' in context %s: %w", namespaceName, contextName, err)
	}
	return nil
}

// GetNamespaceResourcesWithContext fetches resources with context
func GetNamespaceResourcesWithContext(contextName string, namespace string) (*NamespaceDetails, error) {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	// Add context prefix to namespace if needed

	clientset, dynamicClient, err := k8s.GetClientSetWithContext(contextName)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Kubernetes client with context %s: %w", contextName, err)
	}

	ns, err := clientset.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("namespace '%s' not found in context %s: %w", namespace, contextName, err)
	}

	// Clean up namespace name by removing context prefix for display
	nsName := ns.Name
	hasPrefix, _, cleanName := HasContextPrefix(nsName)
	if hasPrefix {
		nsName = cleanName
	}

	details := &NamespaceDetails{
		Name:      nsName,
		Status:    string(ns.Status.Phase),
		Labels:    ns.Labels,
		Resources: make(map[string][]unstructured.Unstructured),
		Context:   contextName,
	}

	// Get discovery info from cache with longer TTL (1 hour)
	var resources []*metav1.APIResourceList
	cacheKey := fmt.Sprintf("api_resources_%s", contextName)
	cachedResources, err := redis.GetNamespaceCache(cacheKey)
	if err == nil && cachedResources != "" {
		if err := json.Unmarshal([]byte(cachedResources), &resources); err != nil {
			resources, err = getFilteredNamespacedResourcesWithContext(clientset)
			if err != nil {
				return nil, fmt.Errorf("failed to discover resources: %w", err)
			}
			if jsonData, err := json.Marshal(resources); err == nil {
				redis.SetNamespaceCache(cacheKey, string(jsonData), 60*time.Minute)
			}
		}
	} else {
		resources, err = getFilteredNamespacedResourcesWithContext(clientset)
		if err != nil {
			return nil, fmt.Errorf("failed to discover resources: %w", err)
		}
		if jsonData, err := json.Marshal(resources); err == nil {
			redis.SetNamespaceCache(cacheKey, string(jsonData), 60*time.Minute)
		}
	}

	// Use a rate limiter to prevent client-side throttling
	rateLimiter := time.NewTicker(200 * time.Millisecond) // 5 requests per second
	defer rateLimiter.Stop()

	// Use worker pool for concurrent resource fetching but with reduced concurrency
	var wg sync.WaitGroup
	resourceCh := make(chan schema.GroupVersionResource, 20)
	resultCh := make(chan struct {
		key   string
		items []unstructured.Unstructured
	}, 20)

	// Reduce concurrent requests to avoid throttling
	maxWorkers := 3 // Reduce from 12 to 3
	semaphore := make(chan struct{}, maxWorkers)

	// Start workers
	for i := 0; i < maxWorkers; i++ {
		go func() {
			for gvr := range resourceCh {
				<-rateLimiter.C         // Wait for rate limiter tick
				semaphore <- struct{}{} // Acquire semaphore

				cacheKey := fmt.Sprintf("ns_%s_ctx_%s_res_%s_%s_%s", namespace, contextName, gvr.Group, gvr.Version, gvr.Resource)
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

					// Cache durations
					cacheDuration := 30 * time.Second

					if isHighFrequencyResource(resourceKey) {
						cacheDuration = 10 * time.Second
					} else if isMediumFrequencyResource(resourceKey) {
						cacheDuration = 20 * time.Second
					} else {
						cacheDuration = 5 * time.Minute
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

	// Queue resource requests
	highPriorityResources := make([]schema.GroupVersionResource, 0)
	normalPriorityResources := make([]schema.GroupVersionResource, 0)

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

			resourceKey := fmt.Sprintf("%s.%s/%s", gv.Group, gv.Version, apiResource.Name)

			// Skip resources known to cause throttling issues
			if shouldSkipResource(resourceKey) {
				continue
			}

			gvr := schema.GroupVersionResource{
				Group:    gv.Group,
				Version:  gv.Version,
				Resource: apiResource.Name,
			}

			if isHighFrequencyResource(resourceKey) {
				highPriorityResources = append(highPriorityResources, gvr)
			} else {
				normalPriorityResources = append(normalPriorityResources, gvr)
			}
		}
	}

	// Process high priority resources first
	for _, gvr := range highPriorityResources {
		wg.Add(1)
		resourceCh <- gvr
	}

	// Then process normal priority resources
	for _, gvr := range normalPriorityResources {
		wg.Add(1)
		resourceCh <- gvr
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

// GetResourcesInitialState fetches the initial state of resources
func GetResourcesInitialState(namespace string, gvr schema.GroupVersionResource, dynamicClient dynamic.Interface, contextName string) ([]unstructured.Unstructured, error) {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	// Try cache first with context key
	cacheKey := fmt.Sprintf("ns_%s_ctx_%s_res_%s_%s_%s", namespace, contextName, gvr.Group, gvr.Version, gvr.Resource)
	cachedResource, _ := redis.GetNamespaceCache(cacheKey)
	if cachedResource != "" {
		var items []unstructured.Unstructured
		if err := json.Unmarshal([]byte(cachedResource), &items); err == nil && len(items) > 0 {
			return items, nil
		}
	}

	// If not in cache, fetch from API
	list, err := dynamicClient.Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	// Cache for future use
	if len(list.Items) > 0 {
		cacheDuration := 10 * time.Second
		resourceKey := fmt.Sprintf("%s.%s/%s", gvr.Group, gvr.Version, gvr.Resource)

		if isHighFrequencyResource(resourceKey) {
			cacheDuration = 5 * time.Second
		} else if isMediumFrequencyResource(resourceKey) {
			cacheDuration = 10 * time.Second
		} else {
			cacheDuration = 30 * time.Second
		}

		if jsonData, err := json.Marshal(list.Items); err == nil {
			redis.SetNamespaceCache(cacheKey, string(jsonData), cacheDuration)
		}
	}

	return list.Items, nil
}

// getFilteredNamespacedResourcesWithContext returns a filtered list of resources to query with context support
func getFilteredNamespacedResourcesWithContext(clientset kubernetes.Interface) ([]*metav1.APIResourceList, error) {
	_, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	resources, err := clientset.Discovery().ServerPreferredNamespacedResources()
	if err != nil {
		return nil, err
	}

	// Filter out API groups that cause throttling
	filteredResources := make([]*metav1.APIResourceList, 0, len(resources))
	for _, resList := range resources {
		gv, err := schema.ParseGroupVersion(resList.GroupVersion)
		if err != nil {
			continue
		}

		// Skip these API groups entirely
		if gv.Group == "coordination.k8s.io" || gv.Group == "discovery.k8s.io" {
			continue
		}

		// Filter individual resources within groups
		filteredAPIResources := make([]metav1.APIResource, 0, len(resList.APIResources))
		for _, res := range resList.APIResources {
			// Skip these resource types
			if res.Name == "events" || res.Name == "endpointslices" ||
				res.Name == "leases" || res.Name == "replicationcontrollers" {
				continue
			}
			filteredAPIResources = append(filteredAPIResources, res)
		}

		if len(filteredAPIResources) > 0 {
			resList.APIResources = filteredAPIResources
			filteredResources = append(filteredResources, resList)
		}
	}

	return filteredResources, nil
}

// GetAllNamespacesWithContext retrieves all namespaces with their resources for a specific context
func GetAllNamespacesWithContext(contextName string) ([]NamespaceDetails, error) {
	// Try to get data from cache first with context key
	cacheKey := fmt.Sprintf("%s_%s", namespaceCacheKey, contextName)
	cachedData, err := redis.GetNamespaceCache(cacheKey)
	if err == nil && cachedData != "" {
		var result []NamespaceDetails
		if err := json.Unmarshal([]byte(cachedData), &result); err == nil {
			return result, nil
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout*2)
	defer cancel()

	clientset, _, err := k8s.GetClientSetWithContext(contextName)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Kubernetes client with context %s: %w", contextName, err)
	}

	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces in context %s: %w", contextName, err)
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

		// Get clean namespace name without context prefix
		nsName := ns.Name
		hasPrefix, _, cleanName := HasContextPrefix(nsName)
		if hasPrefix {
			nsName = cleanName
		}

		// Check if we already have this namespace in Redis cache with context key
		nsKey := fmt.Sprintf("namespace_%s_%s", contextName, ns.Name)
		cachedNs, err := redis.GetNamespaceCache(nsKey)
		if err == nil && cachedNs != "" {
			var details NamespaceDetails
			if err := json.Unmarshal([]byte(cachedNs), &details); err == nil {
				// Ensure the display name has no context prefix
				details.Name = nsName
				details.Context = contextName

				mu.Lock()
				result = append(result, details)
				mu.Unlock()
				continue
			}
		}

		wg.Add(1)
		go func(ns v1.Namespace, displayName string) {
			defer wg.Done()
			<-rateLimiter.C // Wait for rate limiter

			// Create basic namespace details with available data
			details := NamespaceDetails{
				Name:      displayName,
				Status:    string(ns.Status.Phase),
				Labels:    ns.Labels,
				Resources: make(map[string][]unstructured.Unstructured),
				Context:   contextName,
			}

			// Prioritize non-system namespaces
			if !strings.HasPrefix(ns.Name, "kube-") {
				nsDetails, err := fetchNamespaceResourcesWithRetryAndContext(ns.Name, contextName)
				if err == nil && nsDetails != nil {
					details = *nsDetails
					// Cache individual namespace data with context key
					if jsonData, err := json.Marshal(details); err == nil {
						redis.SetNamespaceCache(nsKey, string(jsonData), cacheTTL*2)
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
		}(ns, nsName)
	}

	wg.Wait()

	// Cache the complete result if successful
	if errCount == 0 {
		if jsonData, err := json.Marshal(result); err == nil {
			redis.SetNamespaceCache(cacheKey, string(jsonData), cacheTTL)
		}
	}

	return result, nil
}

// fetchNamespaceResourcesWithRetryAndContext fetches resources with exponential backoff and context
func fetchNamespaceResourcesWithRetryAndContext(namespace string, contextName string) (*NamespaceDetails, error) {
	var (
		details *NamespaceDetails
		err     error
		retries = 3
		backoff = 100 * time.Millisecond
	)

	for i := 0; i < retries; i++ {
		details, err = GetNamespaceResourcesWithContext(contextName, namespace)
		if err == nil {
			return details, nil
		}
		time.Sleep(backoff)
		backoff *= 2 // Exponential backoff
	}

	return nil, err
}

// getLatestNamespaceDataWithContext gets the latest namespace data with context
func getLatestNamespaceDataWithContext(contextName string) ([]NamespaceDetails, error) {
	// Try cache first with context key
	cacheKey := fmt.Sprintf("%s_%s", namespaceCacheKey, contextName)
	cachedData, err := redis.GetNamespaceCache(cacheKey)
	if err == nil && cachedData != "" {
		var result []NamespaceDetails
		if err := json.Unmarshal([]byte(cachedData), &result); err == nil {
			return result, nil
		}
	}

	// If not in cache, get fresh data
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	clientset, _, err := k8s.GetClientSetWithContext(contextName)
	if err != nil {
		return getMinimalNamespaceDataWithContext(contextName)
	}

	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return getMinimalNamespaceDataWithContext(contextName)
	}

	var (
		wg     sync.WaitGroup
		mu     sync.Mutex
		result = make([]NamespaceDetails, 0, len(namespaces.Items))
	)

	// Reduce concurrent processing to avoid throttling
	semaphore := make(chan struct{}, 3)

	// Add rate limiter
	rateLimiter := time.NewTicker(200 * time.Millisecond) // 5 req/sec
	defer rateLimiter.Stop()

	for _, ns := range namespaces.Items {
		// Skip system namespaces
		if shouldHideNamespace(ns.Name) {
			continue
		}

		// Get clean namespace name without context prefix
		nsName := ns.Name
		hasPrefix, _, cleanName := HasContextPrefix(nsName)
		if hasPrefix {
			nsName = cleanName
		}

		wg.Add(1)
		go func(ns v1.Namespace, displayName string) {
			defer wg.Done()
			<-rateLimiter.C                // Wait for rate limiter
			semaphore <- struct{}{}        // Acquire semaphore
			defer func() { <-semaphore }() // Release semaphore

			// Try cache first for this namespace with context
			nsKey := fmt.Sprintf("namespace_%s_%s", contextName, ns.Name)
			cachedNs, err := redis.GetNamespaceCache(nsKey)
			if err == nil && cachedNs != "" {
				var details NamespaceDetails
				if err := json.Unmarshal([]byte(cachedNs), &details); err == nil {
					details.Name = displayName // Use clean name
					details.Context = contextName
					mu.Lock()
					result = append(result, details)
					mu.Unlock()
					return
				}
			}

			// Get resource details with context
			details, err := GetNamespaceResourcesWithContext(contextName, ns.Name)
			if err != nil {
				// Fall back to basic namespace info
				mu.Lock()
				result = append(result, NamespaceDetails{
					Name:      displayName, // Use clean name
					Status:    string(ns.Status.Phase),
					Labels:    ns.Labels,
					Resources: make(map[string][]unstructured.Unstructured),
					Context:   contextName,
				})
				mu.Unlock()
				return
			}

			// Make sure context is set
			details.Context = contextName

			mu.Lock()
			result = append(result, *details)
			mu.Unlock()

			// Cache this namespace data
			if jsonData, err := json.Marshal(details); err == nil {
				redis.SetNamespaceCache(nsKey, string(jsonData), 5*time.Second)
			}
		}(ns, nsName)
	}

	wg.Wait()

	// Cache the complete result
	if jsonData, err := json.Marshal(result); err == nil {
		redis.SetNamespaceCache(cacheKey, string(jsonData), 5*time.Second)
	}

	return result, nil
}

// getMinimalNamespaceDataWithContext gets just namespace names with context
func getMinimalNamespaceDataWithContext(contextName string) ([]NamespaceDetails, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	clientset, _, err := k8s.GetClientSetWithContext(contextName)
	if err != nil {
		return nil, err
	}

	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	result := make([]NamespaceDetails, 0, len(namespaces.Items))
	for _, ns := range namespaces.Items {
		if shouldHideNamespace(ns.Name) {
			continue
		}

		// Clean up namespace name by removing context prefix for display
		nsName := ns.Name
		hasPrefix, _, cleanName := HasContextPrefix(nsName)
		if hasPrefix {
			nsName = cleanName
		}

		result = append(result, NamespaceDetails{
			Name:      nsName,
			Status:    string(ns.Status.Phase),
			Labels:    ns.Labels,
			Resources: make(map[string][]unstructured.Unstructured),
			Context:   contextName,
		})
	}

	return result, nil
}

// MultiContextWebSocketHandler handles WebSocket connections with support for multiple contexts
func MultiContextWebSocketHandler(w http.ResponseWriter, r *http.Request) {
	// Extract context parameter
	contextName := r.URL.Query().Get("context")
	if contextName == "" && len(AvailableContexts) > 0 {
		contextName = AvailableContexts[0] // Default to first context
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not open WebSocket connection", http.StatusBadRequest)
		return
	}
	defer conn.Close()

	// Allow client to switch contexts via messages
	activeContext := contextName

	// Monitor for client disconnections and messages
	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			messageType, p, err := conn.ReadMessage()
			if err != nil {
				return // Client disconnected
			}

			// Handle context switching messages
			if messageType == websocket.TextMessage {
				var message map[string]string
				if err := json.Unmarshal(p, &message); err == nil {
					if ctx, ok := message["switchContext"]; ok && ctx != "" {
						activeContext = ctx
						// Send acknowledgment
						response := map[string]string{
							"type":    "contextChanged",
							"context": activeContext,
						}
						if responseData, err := json.Marshal(response); err == nil {
							_ = conn.WriteMessage(websocket.TextMessage, responseData)
						}
					}
				}
			}
		}
	}()

	// Send initial data immediately with active context
	initialData, err := getLatestNamespaceDataWithContext(activeContext)
	if err == nil && initialData != nil {
		jsonData, _ := json.Marshal(initialData)
		_ = conn.WriteMessage(websocket.TextMessage, jsonData)
	}

	// Stream complete data every 2 seconds
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-done:
			return // Stop if client disconnects
		case <-ticker.C:
			// Get complete data every time using the active context
			completeData, err := getLatestNamespaceDataWithContext(activeContext)
			if err != nil || completeData == nil {
				continue
			}

			// Send all data, not just changes
			jsonData, err := json.Marshal(completeData)
			if err != nil {
				continue
			}

			if err := conn.WriteMessage(websocket.TextMessage, jsonData); err != nil {
				return // Exit if client disconnected
			}
		}
	}
}

// CreateNamespace creates a new namespace using default context
func CreateNamespace(namespace models.Namespace) error {
	// Use first available context as default
	if len(AvailableContexts) == 0 {
		return fmt.Errorf("no available contexts defined")
	}

	return CreateNamespaceWithContext(AvailableContexts[0], namespace)
}

// GetAllNamespaces fetches all namespaces along with their pods using default context
func GetAllNamespaces() ([]models.Namespace, error) {
	// Use first available context as default
	if len(AvailableContexts) == 0 {
		return nil, fmt.Errorf("no available contexts defined")
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	contextName := AvailableContexts[0]
	clientset, _, err := k8s.GetClientSetWithContext(contextName)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Kubernetes client: %w", err)
	}

	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	result := make([]models.Namespace, 0, len(namespaces.Items))
	for _, ns := range namespaces.Items {
		// Skip system namespaces
		if shouldHideNamespace(ns.Name) {
			continue
		}

		// Clean up namespace name by removing context prefix for display
		nsName := ns.Name
		hasPrefix, _, cleanName := HasContextPrefix(nsName)
		if hasPrefix {
			nsName = cleanName
		}

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
			Name:   nsName,
			Status: string(ns.Status.Phase),
			Pods:   podNames,
		})
	}

	return result, nil
}

// UpdateNamespace updates namespace labels using default context
func UpdateNamespace(namespaceName string, labels map[string]string) error {
	// Use first available context as default
	if len(AvailableContexts) == 0 {
		return fmt.Errorf("no available contexts defined")
	}

	return UpdateNamespaceWithContext(AvailableContexts[0], namespaceName, labels)
}

// DeleteNamespace removes a namespace using default context
func DeleteNamespace(name string) error {
	// Use first available context as default
	if len(AvailableContexts) == 0 {
		return fmt.Errorf("no available contexts defined")
	}

	return DeleteNamespaceWithContext(AvailableContexts[0], name)
}

// GetAllNamespacesWithResources retrieves all namespaces with their resources using default context
func GetAllNamespacesWithResources() ([]NamespaceDetails, error) {
	// Use first available context as default
	if len(AvailableContexts) == 0 {
		return nil, fmt.Errorf("no available contexts defined")
	}

	return GetAllNamespacesWithContext(AvailableContexts[0])
}

// GetNamespaceResources fetches resources for a namespace using discovery API with default context
func GetNamespaceResources(namespace string) (*ExtendedNamespaceDetails, error) {
	// Use first available context as default
	if len(AvailableContexts) == 0 {
		return nil, fmt.Errorf("no available contexts defined")
	}

	contextName := AvailableContexts[0]
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	clientset, _, err := k8s.GetClientSetWithContext(contextName)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Kubernetes client: %w", err)
	}

	ns, err := clientset.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("namespace '%s' not found: %w", namespace, err)
	}

	// Clean up namespace name by removing context prefix for display
	nsName := ns.Name
	hasPrefix, _, cleanName := HasContextPrefix(nsName)
	if hasPrefix {
		nsName = cleanName
	}

	details := &NamespaceDetails{
		Name:      nsName,
		Status:    string(ns.Status.Phase),
		Labels:    ns.Labels,
		Resources: make(map[string][]unstructured.Unstructured),
		Context:   contextName,
	}

	return &ExtendedNamespaceDetails{
		NamespaceDetails:  details,
		CreationTimestamp: ns.CreationTimestamp.Time,
	}, nil
}

// NamespaceWebSocketHandler handles WebSocket connections with real-time updates
func NamespaceWebSocketHandler(w http.ResponseWriter, r *http.Request) {
	// Use MultiContextWebSocketHandler for all WebSocket connections
	MultiContextWebSocketHandler(w, r)
}

// GetAllContextNamespaces returns namespaces from all available contexts
func GetAllContextNamespaces() (map[string][]NamespaceDetails, error) {
	result := make(map[string][]NamespaceDetails)

	// Use a wait group to parallelize fetches from different contexts
	var wg sync.WaitGroup
	var mu sync.Mutex
	var errs []error

	for _, ctx := range AvailableContexts {
		wg.Add(1)
		go func(contextName string) {
			defer wg.Done()

			namespaces, err := getLatestNamespaceDataWithContext(contextName)
			if err != nil {
				mu.Lock()
				errs = append(errs, fmt.Errorf("error fetching namespaces from context %s: %w", contextName, err))
				mu.Unlock()
				return
			}

			mu.Lock()
			result[contextName] = namespaces
			mu.Unlock()
		}(ctx)
	}

	wg.Wait()

	if len(result) == 0 && len(errs) > 0 {
		// Return the first error if we couldn't get any namespaces
		return nil, errs[0]
	}

	return result, nil
}

// MultiContextNamespaceWebSocketHandler sends updates from all contexts
func MultiContextNamespaceWebSocketHandler(w http.ResponseWriter, r *http.Request) {
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

	// Send initial data immediately from all contexts
	initialData, err := GetAllContextNamespaces()
	if err == nil && initialData != nil {
		jsonData, _ := json.Marshal(initialData)
		_ = conn.WriteMessage(websocket.TextMessage, jsonData)
	}

	// Stream complete data every 2 seconds
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-done:
			return // Stop if client disconnects
		case <-ticker.C:
			// Get complete data from all contexts
			completeData, err := GetAllContextNamespaces()
			if err != nil || len(completeData) == 0 {
				continue
			}

			// Send all data
			jsonData, err := json.Marshal(completeData)
			if err != nil {
				continue
			}

			if err := conn.WriteMessage(websocket.TextMessage, jsonData); err != nil {
				return // Exit if client disconnected
			}
		}
	}
}

// / WatchAllContextsNamespaces watches namespaces across all contexts
func WatchAllContextsNamespaces(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not open WebSocket connection", http.StatusBadRequest)
		return
	}
	defer conn.Close()

	// Create a context that cancels when the connection closes
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	// Create a mutex to protect WebSocket writes
	var writeMutex sync.Mutex

	// Safe write function to avoid concurrent writes
	safeWrite := func(messageType int, data []byte) error {
		writeMutex.Lock()
		defer writeMutex.Unlock()

		// Check context before writing
		select {
		case <-ctx.Done():
			return fmt.Errorf("context canceled")
		default:
			return conn.WriteMessage(messageType, data)
		}
	}

	// Monitor for client disconnections
	go func() {
		defer cancel()
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return // Client disconnected
			}
		}
	}()

	// Send connection established message immediately
	connMessage := map[string]string{
		"status": "connected",
	}
	jsonConnMsg, _ := json.Marshal(connMessage)
	if err := safeWrite(websocket.TextMessage, jsonConnMsg); err != nil {
		return
	}

	// Setup trigger channel for data refreshes
	triggerRefresh := make(chan struct{}, 1)

	// Start data fetching in background
	go func() {
		// Send initial data in chunks for faster response
		for _, contextName := range AvailableContexts {
			go func(ctx context.Context, contextName string) {
				namespaces, err := getMinimalNamespaceDataWithContext(contextName)
				if err != nil {
					return
				}

				// Send data for this context immediately
				message := map[string]interface{}{
					"context": contextName,
					"data":    namespaces,
				}
				jsonData, _ := json.Marshal(message)
				safeWrite(websocket.TextMessage, jsonData)
			}(ctx, contextName)
		}

		// Watch for changes in each context
		for _, contextName := range AvailableContexts {
			go func(ctx context.Context, contextName string) {
				clientset, _, err := k8s.GetClientSetWithContext(contextName)
				if err != nil {
					return
				}

				watcher, err := clientset.CoreV1().Namespaces().Watch(ctx, metav1.ListOptions{})
				if err != nil {
					return
				}
				defer watcher.Stop()

				for {
					select {
					case <-ctx.Done():
						return
					case _, ok := <-watcher.ResultChan():
						if !ok {
							return
						}
						select {
						case triggerRefresh <- struct{}{}:
						default:
						}
					}
				}
			}(ctx, contextName)
		}
	}()

	// Minimum time between refreshes
	minRefreshInterval := 10 * time.Second
	lastRefresh := time.Now().Add(-minRefreshInterval)

	// Process triggers and send full refreshes
	for {
		select {
		case <-ctx.Done():
			return
		case <-triggerRefresh:
			if time.Since(lastRefresh) < minRefreshInterval {
				continue
			}
			lastRefresh = time.Now()

			refreshData, err := GetAllContextNamespaces()
			if err != nil || refreshData == nil {
				continue
			}

			jsonData, err := json.Marshal(refreshData)
			if err != nil {
				continue
			}

			redis.SetNamespaceCache("all_contexts_data", string(jsonData), 30*time.Second)
			if err := safeWrite(websocket.TextMessage, jsonData); err != nil {
				return
			}
		}
	}
}

// Helper function to create a pointer to int64
func int64Ptr(i int64) *int64 {
	return &i
}

// shouldHideNamespace returns true if a namespace should be hidden from the UI
func shouldHideNamespace(name string) bool {
	// Remove any context prefix if present
	_, _, nameWithoutPrefix := HasContextPrefix(name)

	// Only hide the most critical system namespaces
	prefixesToHide := []string{
		"kube-system",
		"kube-public",
		"kube-node-lease",
	}

	for _, prefix := range prefixesToHide {
		if nameWithoutPrefix == prefix {
			return true
		}
	}

	return false
}

// getLatestNamespaceData tries multiple ways to get namespace data
func getLatestNamespaceData() ([]NamespaceDetails, error) {
	// Use first available context as default
	if len(AvailableContexts) == 0 {
		return nil, fmt.Errorf("no available contexts defined")
	}

	return getLatestNamespaceDataWithContext(AvailableContexts[0])
}

// getMinimalNamespaceData gets just namespace names without heavy resource details
func getMinimalNamespaceData() ([]NamespaceDetails, error) {
	// Use first available context as default
	if len(AvailableContexts) == 0 {
		return nil, fmt.Errorf("no available contexts defined")
	}

	return getMinimalNamespaceDataWithContext(AvailableContexts[0])
}

// WatchNamespaceInContext sets up watch for resources in a namespace in a specific context
func WatchNamespaceInContext(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	contextName := r.URL.Query().Get("context")

	if namespace == "" {
		http.Error(w, "Namespace parameter is required", http.StatusBadRequest)
		return
	}

	// Use default context if not specified
	if contextName == "" && len(AvailableContexts) > 0 {
		contextName = AvailableContexts[0]
	}

	// Store original namespace (without prefix) for display purposes
	// _, _, originalNamespace := HasContextPrefix(namespace)

	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not open WebSocket connection", http.StatusBadRequest)
		return
	}
	defer conn.Close()

	// Create a context that cancels when the client disconnects
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	// Monitor for client disconnections and context switch commands
	go func() {
		defer cancel()
		for {
			messageType, p, err := conn.ReadMessage()
			if err != nil {
				return // Client disconnected
			}

			// Parse messages for potential context switching
			if messageType == websocket.TextMessage {
				var message map[string]string
				if err := json.Unmarshal(p, &message); err == nil {
					if newContext, ok := message["switchContext"]; ok && newContext != "" {
						// Context switch requested - this would require reconnecting
						// the watchers, which is complex - just notify the client
						response := map[string]string{
							"type":    "info",
							"message": "Context switch requested to " + newContext + ". Please reconnect for the new context.",
						}
						if jsonData, err := json.Marshal(response); err == nil {
							_ = conn.WriteMessage(websocket.TextMessage, jsonData)
						}
					}
				}
			}
		}
	}()

	// Send initial namespace state
	initialData, err := GetNamespaceResourcesWithContext(contextName, namespace)
	if err != nil {
		sendErrorMsg(conn, fmt.Sprintf("Failed to get initial state: %s", err.Error()))
	} else if initialData != nil {
		message := map[string]interface{}{
			"type": "initial",
			"data": initialData,
		}
		sendJsonMessage(conn, message)
	}

	// Get dynamic client for watching resources with the specified context
	_, dynamicClient, err := k8s.GetClientSetWithContext(contextName)
	if err != nil {
		sendErrorMsg(conn, fmt.Sprintf("Failed to initialize Kubernetes client with context %s: %s", contextName, err.Error()))
		return
	}

	// Define high-priority resources to watch
	highPriorityGVRs := []schema.GroupVersionResource{
		{Group: "", Version: "v1", Resource: "pods"},
		{Group: "apps", Version: "v1", Resource: "deployments"},
		{Group: "apps", Version: "v1", Resource: "replicasets"},
		{Group: "", Version: "v1", Resource: "services"},
		{Group: "", Version: "v1", Resource: "configmaps"},
		{Group: "", Version: "v1", Resource: "secrets"},
	}

	// Set up multi-resource watcher
	watchResults := setupMultiResourceWatcher(ctx, dynamicClient, namespace, highPriorityGVRs)

	// Process events and send to WebSocket client
	processWatchEvents(ctx, conn, watchResults)
}

// Helper functions for WebSocket messaging
func sendErrorMsg(conn *websocket.Conn, errorMsg string) {
	message := map[string]interface{}{
		"type":  "error",
		"error": errorMsg,
	}
	sendJsonMessage(conn, message)
}

func sendJsonMessage(conn *websocket.Conn, message interface{}) {
	jsonData, err := json.Marshal(message)
	if err != nil {
		return
	}
	_ = conn.WriteMessage(websocket.TextMessage, jsonData)
}

// setupMultiResourceWatcher creates watchers for multiple resources
func setupMultiResourceWatcher(ctx context.Context, dynamicClient dynamic.Interface, namespace string,
	resources []schema.GroupVersionResource) <-chan map[string]interface{} {

	resultCh := make(chan map[string]interface{}, 100)

	// Start a goroutine for each resource type
	var wg sync.WaitGroup
	for _, gvr := range resources {
		wg.Add(1)
		go func(gvr schema.GroupVersionResource) {
			defer wg.Done()

			// Set up watch
			watcher, err := dynamicClient.Resource(gvr).Namespace(namespace).Watch(ctx, metav1.ListOptions{
				TimeoutSeconds: int64Ptr(3600), // 1 hour
			})
			if err != nil {
				return
			}
			defer watcher.Stop()

			resourceType := fmt.Sprintf("%s.%s/%s", gvr.Group, gvr.Version, gvr.Resource)

			// Process events
			for {
				select {
				case <-ctx.Done():
					return
				case event, ok := <-watcher.ResultChan():
					if !ok {
						return
					}

					// Send event with resource type info
					select {
					case resultCh <- map[string]interface{}{
						"type":         "event",
						"resourceType": resourceType,
						"eventType":    string(event.Type),
						"object":       event.Object,
					}:
					case <-ctx.Done():
						return
					}
				}
			}
		}(gvr)
	}

	// Close result channel when all watchers are done
	go func() {
		wg.Wait()
		close(resultCh)
	}()

	return resultCh
}

// processWatchEvents handles events from watchers and sends them to the client
func processWatchEvents(ctx context.Context, conn *websocket.Conn, events <-chan map[string]interface{}) {
	// Rate limiting to avoid overwhelming the client
	ticker := time.NewTicker(100 * time.Millisecond) // Limit to 10 events per second
	defer ticker.Stop()

	// Batch processing
	const batchSize = 10
	eventBatch := make([]map[string]interface{}, 0, batchSize)
	batchTicker := time.NewTicker(500 * time.Millisecond) // Send batch every 500ms max
	defer batchTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			return

		case event, ok := <-events:
			if !ok {
				return // Channel closed
			}

			<-ticker.C // Rate limit

			// Add to batch
			eventBatch = append(eventBatch, event)

			// Send immediately if batch is full
			if len(eventBatch) >= batchSize {
				message := map[string]interface{}{
					"type":   "batch",
					"events": eventBatch,
				}
				sendJsonMessage(conn, message)
				eventBatch = make([]map[string]interface{}, 0, batchSize)
			}

		case <-batchTicker.C:
			// Send batch even if not full
			if len(eventBatch) > 0 {
				message := map[string]interface{}{
					"type":   "batch",
					"events": eventBatch,
				}
				sendJsonMessage(conn, message)
				eventBatch = make([]map[string]interface{}, 0, batchSize)
			}
		}
	}
}

// Helper functions to categorize resources by update frequency
func isHighFrequencyResource(resourceKey string) bool {
	highFrequencyTypes := []string{"pod", "event", "replicaset", "deployment", "job"}
	for _, t := range highFrequencyTypes {
		if strings.Contains(resourceKey, t) {
			return true
		}
	}
	return false
}

func isMediumFrequencyResource(resourceKey string) bool {
	mediumFrequencyTypes := []string{"service", "configmap", "secret", "persistentvolumeclaim"}
	for _, t := range mediumFrequencyTypes {
		if strings.Contains(resourceKey, t) {
			return true
		}
	}
	return false
}

// shouldSkipResource returns true for resources that should be skipped to avoid throttling
func shouldSkipResource(resourceKey string) bool {
	// Skip resources with high volume or those causing throttling
	resourcesToSkip := []string{
		"coordination.k8s.io",    // leases
		"discovery.k8s.io",       // endpointslices
		"events",                 // high volume
		"leases",                 // high volume
		"endpointslices",         // high volume
		"replicationcontrollers", // often empty but causes throttling
	}

	for _, r := range resourcesToSkip {
		if strings.Contains(resourceKey, r) {
			return true
		}
	}
	return false
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

// GetAllContextsNamespaces fetches namespace information from all available contexts simultaneously
func GetAllContextsNamespaces(w http.ResponseWriter, r *http.Request) {
	// Results will be indexed by context name
	results := make(map[string][]NamespaceDetails)
	errors := make(map[string]string)

	// Use a wait group to handle concurrent fetches
	var wg sync.WaitGroup
	var mu sync.Mutex

	// Specify if client wants minimal or detailed view
	detailed := r.URL.Query().Get("detailed") == "true"

	// For each available context, fetch namespaces concurrently
	for _, ctxName := range AvailableContexts {
		wg.Add(1)
		go func(contextName string) {
			defer wg.Done()

			var namespaces []NamespaceDetails
			var err error

			if detailed {
				// Get detailed namespace information including resources
				namespaces, err = GetAllNamespacesWithContext(contextName)
			} else {
				// Get minimal namespace information (faster)
				namespaces, err = getMinimalNamespaceDataWithContext(contextName)
			}

			mu.Lock()
			defer mu.Unlock()

			if err != nil {
				errors[contextName] = err.Error()
			} else {
				results[contextName] = namespaces
			}
		}(ctxName)
	}

	// Wait for all goroutines to finish
	wg.Wait()

	// Prepare response
	response := struct {
		Contexts map[string][]NamespaceDetails `json:"contexts"`
		Errors   map[string]string             `json:"errors,omitempty"`
	}{
		Contexts: results,
		Errors:   errors,
	}

	// If no contexts returned any data, return an error
	if len(results) == 0 {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Failed to retrieve namespaces from any context",
			"details": errors,
		})
		return
	}

	// Return the combined results
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetContextNamespace gets details about a specific namespace in a specified context
func GetContextNamespace(w http.ResponseWriter, r *http.Request) {
	// Extract path parameters - this assumes you're using a router that
	// places parameters in the request context or URL path
	segments := strings.Split(r.URL.Path, "/")
	if len(segments) < 4 {
		http.Error(w, "Invalid URL path", http.StatusBadRequest)
		return
	}

	// Last segment should be the namespace name
	namespaceName := segments[len(segments)-1]

	// Extract context from query parameters
	contextName := r.URL.Query().Get("context")
	if contextName == "" && len(AvailableContexts) > 0 {
		contextName = AvailableContexts[0]
	}

	// Get namespace details with resources
	details, err := GetNamespaceResourcesWithContext(contextName, namespaceName)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error fetching namespace: %s", err.Error()), http.StatusNotFound)
		return
	}

	// Return the namespace details
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(details)
}

// GetMultiContextNamespaceComparison compares the same namespace across multiple contexts
func GetMultiContextNamespaceComparison(w http.ResponseWriter, r *http.Request) {
	// Debug logging to help troubleshoot
	fmt.Printf("Request URL path: %s\n", r.URL.Path)
	fmt.Printf("Query params: %s\n", r.URL.RawQuery)

	// Extract namespace name from path
	segments := strings.Split(r.URL.Path, "/")
	fmt.Printf("Path segments: %v\n", segments)

	if len(segments) < 4 {
		http.Error(w, "Invalid URL path", http.StatusBadRequest)
		return
	}

	// Last segment should be the namespace name
	namespaceName := segments[len(segments)-1]
	fmt.Printf("Extracted namespace name: %s\n", namespaceName)

	// Results indexed by context
	results := make(map[string]*NamespaceDetails)
	errors := make(map[string]string)

	// Extract contexts from query parameter (comma-separated)
	contextsParam := r.URL.Query().Get("contexts")
	var contextsToCheck []string

	if contextsParam != "" {
		// Use the specified contexts
		contextsToCheck = strings.Split(contextsParam, ",")
		fmt.Printf("Using specified contexts: %v\n", contextsToCheck)
	} else {
		// Use all available contexts
		contextsToCheck = AvailableContexts
		fmt.Printf("Using all available contexts: %v\n", contextsToCheck)
	}

	// Fetch the namespace from each context concurrently
	var wg sync.WaitGroup
	var mu sync.Mutex

	for _, ctxName := range contextsToCheck {
		wg.Add(1)
		go func(contextName string) {
			defer wg.Done()

			fmt.Printf("Fetching details for namespace %s in context %s\n", namespaceName, contextName)
			details, err := GetNamespaceResourcesWithContext(contextName, namespaceName)

			mu.Lock()
			defer mu.Unlock()

			if err != nil {
				fmt.Printf("Error in context %s: %s\n", contextName, err.Error())
				errors[contextName] = err.Error()
			} else if details == nil {
				fmt.Printf("No details returned for context %s\n", contextName)
				errors[contextName] = "No namespace details returned"
			} else {
				fmt.Printf("Successfully fetched details for context %s\n", contextName)
				results[contextName] = details
			}
		}(ctxName)
	}

	// Wait for all fetches to complete
	wg.Wait()

	// Check if we got any results
	if len(results) == 0 && len(errors) > 0 {
		// All requests failed
		errorResponse := map[string]interface{}{
			"error":   "Failed to fetch namespace data from any context",
			"details": errors,
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(errorResponse)
		return
	}

	// Prepare the response
	response := struct {
		Namespace string                       `json:"namespace"`
		Contexts  map[string]*NamespaceDetails `json:"contexts"`
		Errors    map[string]string            `json:"errors,omitempty"`
	}{
		Namespace: namespaceName,
		Contexts:  results,
		Errors:    errors,
	}

	// Return the comparison data
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// SynchronizeNamespace ensures a namespace has the same configuration across contexts
func SynchronizeNamespace(w http.ResponseWriter, r *http.Request) {
	// Only accept POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract namespace name from path
	segments := strings.Split(r.URL.Path, "/")
	if len(segments) < 4 {
		http.Error(w, "Invalid URL path", http.StatusBadRequest)
		return
	}

	// Last segment should be the namespace name
	namespaceName := segments[len(segments)-1]

	// Parse synchronization options from request body
	var options struct {
		SourceContext  string   `json:"sourceContext"`
		TargetContexts []string `json:"targetContexts"`
		SyncLabels     bool     `json:"syncLabels"`
		SyncResources  []string `json:"syncResources"` // Resource types to sync
	}

	if err := json.NewDecoder(r.Body).Decode(&options); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate options
	if options.SourceContext == "" {
		http.Error(w, "Source context is required", http.StatusBadRequest)
		return
	}

	if len(options.TargetContexts) == 0 {
		http.Error(w, "At least one target context is required", http.StatusBadRequest)
		return
	}

	// Get the source namespace
	sourceNamespace, err := GetNamespaceResourcesWithContext(options.SourceContext, namespaceName)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error fetching source namespace: %s", err.Error()), http.StatusNotFound)
		return
	}

	// Track synchronization results
	results := make(map[string]interface{})

	// For each target context, synchronize the namespace
	for _, targetCtx := range options.TargetContexts {
		// Skip if target is the same as source
		if targetCtx == options.SourceContext {
			results[targetCtx] = "Source and target are the same, skipped"
			continue
		}

		// First, check if the namespace exists in the target context
		_, err := GetNamespaceResourcesWithContext(targetCtx, namespaceName)
		if err != nil {
			// Namespace doesn't exist, create it
			namespace := models.Namespace{
				Name:   namespaceName,
				Labels: sourceNamespace.Labels,
			}

			if err := CreateNamespaceWithContext(targetCtx, namespace); err != nil {
				results[targetCtx] = fmt.Sprintf("Failed to create namespace: %s", err.Error())
				continue
			}

			results[targetCtx] = "Namespace created successfully"
		} else {
			// Namespace exists, update it if needed
			if options.SyncLabels {
				if err := UpdateNamespaceWithContext(targetCtx, namespaceName, sourceNamespace.Labels); err != nil {
					results[targetCtx] = fmt.Sprintf("Failed to update labels: %s", err.Error())
					continue
				}

				results[targetCtx] = "Labels synchronized successfully"
			} else {
				results[targetCtx] = "No changes made (labels sync disabled)"
			}
		}

		// Resource synchronization would be more complex and require additional functions
		// This is left as a more advanced implementation
	}

	// Return the synchronization results
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"namespace": namespaceName,
		"source":    options.SourceContext,
		"results":   results,
	})
}
