package ns

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/kubestellar/ui/k8s"
	"github.com/kubestellar/ui/models"
	"github.com/kubestellar/ui/redis"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
)

const (
	requestTimeout        = 5 * time.Second
	updateInterval        = 5 * time.Second
	cacheTTL              = 10 * time.Second
	namespaceCacheKey     = "namespace_data"
	maxConcurrentRequests = 5
)

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

type ExtendedNamespaceDetails struct {
	*NamespaceDetails
	CreationTimestamp time.Time `json:"creationTimestamp"`
}

// GetNamespaceResources fetches resources for a namespace using discovery API
func GetNamespaceResources(namespace string) (*ExtendedNamespaceDetails, error) {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Kubernetes client: %w", err)
	}

	ns, err := clientset.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("namespace '%s' not found: %w", namespace, err)
	}

	details := &NamespaceDetails{
		Name:   ns.Name,
		Status: string(ns.Status.Phase),
		Labels: ns.Labels,
		//Resources: make(map[string][]unstructured.Unstructured),
	}

	return &ExtendedNamespaceDetails{
		NamespaceDetails:  details,
		CreationTimestamp: ns.CreationTimestamp.Time,
	}, nil
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

	// Get discovery info from cache with longer TTL (1 hour)
	var resources []*metav1.APIResourceList
	cachedResources, err := redis.GetNamespaceCache("api_resources")
	if err == nil && cachedResources != "" {
		if err := json.Unmarshal([]byte(cachedResources), &resources); err != nil {
			resources, err = getFilteredNamespacedResources(clientset)
			if err != nil {
				return nil, fmt.Errorf("failed to discover resources: %w", err)
			}
			if jsonData, err := json.Marshal(resources); err == nil {
				redis.SetNamespaceCache("api_resources", string(jsonData), 60*time.Minute)
			}
		}
	} else {
		resources, err = getFilteredNamespacedResources(clientset)
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

					// Increase cache durations substantially to reduce API calls
					cacheDuration := 30 * time.Second

					// Higher change frequency resources get shorter TTL, but still longer than before
					if isHighFrequencyResource(resourceKey) {
						cacheDuration = 10 * time.Second // Increased from 2s
					} else if isMediumFrequencyResource(resourceKey) {
						cacheDuration = 20 * time.Second // Increased from 5s
					} else {
						cacheDuration = 5 * time.Minute // Increased from 1m
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

	// Queue resource requests, skipping low-value resources that cause throttling
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

// getFilteredNamespacedResources returns a filtered list of resources to query
func getFilteredNamespacedResources(clientset kubernetes.Interface) ([]*metav1.APIResourceList, error) {
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

// NamespaceWebSocketHandler handles WebSocket connections with real-time updates
// func NamespaceWebSocketHandler(w http.ResponseWriter, r *http.Request) {
// 	conn, err := upgrader.Upgrade(w, r, nil)
// 	if err != nil {
// 		http.Error(w, "Could not open WebSocket connection", http.StatusBadRequest)
// 		return
// 	}
// 	defer conn.Close()

// 	// Monitor for client disconnections
// 	done := make(chan struct{})
// 	go func() {
// 		defer close(done)
// 		for {
// 			if _, _, err := conn.ReadMessage(); err != nil {
// 				return // Client disconnected
// 			}
// 		}
// 	}()

// 	// Send initial data immediately
// 	initialData, err := getLatestNamespaceData()
// 	if err == nil && initialData != nil {
// 		jsonData, _ := json.Marshal(initialData)
// 		_ = conn.WriteMessage(websocket.TextMessage, jsonData)
// 	}

// 	// Stream complete data every 2 seconds
// 	ticker := time.NewTicker(2 * time.Second)
// 	defer ticker.Stop()

// 	for {
// 		select {var wg sync.WaitGroup
// Ensure this is called on a valid WaitGroup
// 		case <-done:
// 			return // Stop if client disconnects
// 		case <-ticker.C:
// 			// Get complete data every time - don't use diff updates
// 			completeData, err := getLatestNamespaceData()
// 			if err != nil || completeData == nil {
// 				continue
// 			}

// 			// Send all data, not just changes
// 			jsonData, err := json.Marshal(completeData)
// 			if err != nil {
// 				continue
// 			}

// 			if err := conn.WriteMessage(websocket.TextMessage, jsonData); err != nil {
// 				return // Exit if client disconnected
// 			}
// 		}
// 	}
// }

// getHighPriorityNamespaceChanges focuses on frequently-changing namespaces
func getHighPriorityNamespaceChanges() ([]NamespaceDetails, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 900*time.Millisecond) // tight timeout
	defer cancel()

	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return nil, err
	}

	// Get list of namespaces
	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	// Process only non-system namespaces
	result := make([]NamespaceDetails, 0)
	var wg sync.WaitGroup
	resultCh := make(chan NamespaceDetails, len(namespaces.Items))

	// Reduce concurrency to avoid throttling
	semaphore := make(chan struct{}, 3) // Reduced from 10 to 3

	// Add rate limiter
	rateLimiter := time.NewTicker(250 * time.Millisecond) // 4 req/sec
	defer rateLimiter.Stop()

	for _, ns := range namespaces.Items {
		if shouldHideNamespace(ns.Name) {
			continue
		}

		// Check if this namespace has high-priority resources that change frequently
		wg.Add(1)
		go func(ns v1.Namespace) {
			defer wg.Done()
			<-rateLimiter.C                // Wait for rate limiter
			semaphore <- struct{}{}        // Acquire semaphore
			defer func() { <-semaphore }() // Release semaphore

			// Get only high-frequency resources for this namespace
			details, err := getHighFrequencyResourcesOnly(ns.Name)
			if err != nil {
				return
			}

			resultCh <- *details
		}(ns)
	}

	// Wait for all goroutines to finish
	go func() {
		wg.Wait()
		close(resultCh)
	}()

	// Collect results
	for details := range resultCh {
		result = append(result, details)
	}

	return result, nil
}

// getHighFrequencyResourcesOnly focuses only on resources that change frequently
func getHighFrequencyResourcesOnly(namespace string) (*NamespaceDetails, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	clientset, dynamicClient, err := k8s.GetClientSet()
	if err != nil {
		return nil, err
	}

	ns, err := clientset.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	details := &NamespaceDetails{
		Name:      ns.Name,
		Status:    string(ns.Status.Phase),
		Labels:    ns.Labels,
		Resources: make(map[string][]unstructured.Unstructured),
	}

	// Only check for pods and deployments - skip events as they cause throttling
	highFrequencyGVRs := []schema.GroupVersionResource{
		{Group: "", Version: "v1", Resource: "pods"},
		{Group: "apps", Version: "v1", Resource: "deployments"},
		// Removed events as they can cause throttling
	}

	var wg sync.WaitGroup
	mu := sync.Mutex{}

	// Add rate limiter for resource requests
	rateLimiter := time.NewTicker(300 * time.Millisecond)
	defer rateLimiter.Stop()

	for _, gvr := range highFrequencyGVRs {
		wg.Add(1)
		go func(gvr schema.GroupVersionResource) {
			defer wg.Done()
			<-rateLimiter.C // Wait for rate limiter

			resourceKey := fmt.Sprintf("%s.%s/%s", gvr.Group, gvr.Version, gvr.Resource)

			// Try cache first
			cacheKey := fmt.Sprintf("ns_%s_res_%s_%s_%s", namespace, gvr.Group, gvr.Version, gvr.Resource)
			cachedResource, _ := redis.GetNamespaceCache(cacheKey)
			if cachedResource != "" {
				var items []unstructured.Unstructured
				if err := json.Unmarshal([]byte(cachedResource), &items); err == nil && len(items) > 0 {
					mu.Lock()
					details.Resources[resourceKey] = items
					mu.Unlock()
					return
				}
			}

			list, err := dynamicClient.Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{})
			if err != nil {
				return
			}

			if len(list.Items) > 0 {
				mu.Lock()
				details.Resources[resourceKey] = list.Items
				mu.Unlock()

				// Cache results
				if jsonData, err := json.Marshal(list.Items); err == nil {
					redis.SetNamespaceCache(cacheKey, string(jsonData), 5*time.Second) // Shorter cache time
				}
			}
		}(gvr)
	}

	wg.Wait()
	return details, nil
}

// // getLatestNamespaceData tries multiple ways to get namespace data
// func getLatestNamespaceData() ([]NamespaceDetails, error) {
// 	// Try cache first
// 	cachedData, err := redis.GetNamespaceCache(namespaceCacheKey)
// 	if err == nil && cachedData != "" {
// 		var result []NamespaceDetails
// 		if err := json.Unmarshal([]byte(cachedData), &result); err == nil {
// 			return result, nil
// 		}
// 	}

// 	// Try live data with timeout
// 	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
// 	defer cancel()

// 	clientset, _, err := k8s.GetClientSet()
// 	if err != nil {
// 		return getMinimalNamespaceData()
// 	}

// 	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
// 	if err != nil {
// 		return getMinimalNamespaceData()
// 	}

// 	var (
// 		wg     sync.WaitGroup
// 		mu     sync.Mutex
// 		result = make([]NamespaceDetails, 0, len(namespaces.Items))
// 	)

// 	// Reduce concurrent processing to avoid throttling
// 	semaphore := make(chan struct{}, 3) // Reduced from 15 to 3

// 	// Add rate limiter
// 	rateLimiter := time.NewTicker(200 * time.Millisecond) // 5 req/sec
// 	defer rateLimiter.Stop()

// 	for _, ns := range namespaces.Items {
// 		if shouldHideNamespace(ns.Name) {
// 			continue
// 		}

// 		wg.Add(1)
// 		go func(ns v1.Namespace) {
// 			defer wg.Done()
// 			<-rateLimiter.C                // Wait for rate limiter
// 			semaphore <- struct{}{}        // Acquire semaphore
// 			defer func() { <-semaphore }() // Release semaphore

// 			// Try cache first for this namespace
// 			nsKey := fmt.Sprintf("namespace_%s", ns.Name)
// 			cachedNs, err := redis.GetNamespaceCache(nsKey)
// 			if err == nil && cachedNs != "" {
// 				var details NamespaceDetails
// 				if err := json.Unmarshal([]byte(cachedNs), &details); err == nil {
// 					mu.Lock()
// 					result = append(result, details)
// 					mu.Unlock()
// 					return
// 				}
// 			}

// 			// Get resource details - limited if under heavy load
// 			details, err := GetNamespaceResourcesLimited(ns.Name)
// 			if err != nil {
// 				// Fall back to basic namespace info
// 				mu.Lock()
// 				result = append(result, NamespaceDetails{
// 					Name:      ns.Name,
// 					Status:    string(ns.Status.Phase),
// 					Labels:    ns.Labels,
// 					Resources: make(map[string][]unstructured.Unstructured),
// 				})
// 				mu.Unlock()
// 				return
// 			}

// 			mu.Lock()
// 			result = append(result, *details)
// 			mu.Unlock()

// 			// Cache this namespace data for shorter period to ensure freshness
// 			if jsonData, err := json.Marshal(details); err == nil {
// 				redis.SetNamespaceCache(nsKey, string(jsonData), 5*time.Second) // Reduced from 30s to 5s
// 			}
// 		}(ns)
// 	}

// 	wg.Wait()

// 	// Cache the complete result for shorter time to ensure freshness
// 	if jsonData, err := json.Marshal(result); err == nil {
// 		redis.SetNamespaceCache(namespaceCacheKey, string(jsonData), 5*time.Second) // Reduced from 20s to 5s
// 	}

// 	return result, nil
// }

// getMinimalNamespaceData gets just namespace names without heavy resource details
func getMinimalNamespaceData() ([]NamespaceDetails, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
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

// containsVerb checks if a specific verb exists in the list of verbs
func containsVerb(verbs []string, verb string) bool {
	for _, v := range verbs {
		if v == verb {
			return true
		}
	}
	return false
}
