package ns

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
	"github.com/kubestellar/ui/k8s"
	"github.com/kubestellar/ui/redis"
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/dynamic"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(_ *http.Request) bool { return true },
}

// Map to track active watchers globally to prevent duplicate watches
var activeWatchers sync.Map
var watcherCount atomic.Int32

// WatchEvent represents a change event from the Kubernetes API
type WatchEvent struct {
	Type       string            `json:"type"`
	Object     interface{}       `json:"object"`
	Namespace  string            `json:"namespace,omitempty"`
	Resource   string            `json:"resource,omitempty"`
	Labels     map[string]string `json:"labels,omitempty"`
	LabelCount int               `json:"labelCount,omitempty"`
}

// Key function to fix event processing
func sendEvent(conn *websocket.Conn, event WatchEvent) bool {
	// Marshal the event to JSON
	jsonData, err := json.Marshal(event)
	if err != nil {
		log.Printf("Error marshaling event: %v", err)
		return true
	}

	// Set write deadline to prevent blocking
	conn.SetWriteDeadline(time.Now().Add(5 * time.Second))

	// Send the event to the WebSocket client
	if err := conn.WriteMessage(websocket.TextMessage, jsonData); err != nil {
		log.Printf("Error sending event to WebSocket: %v", err)
		return false
	}

	return true
}

// NamespaceWebSocketHandler handles WebSocket connections with real-time updates
func NamespaceWebSocketHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("WebSocket connection requested")

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		http.Error(w, "Could not open WebSocket connection", http.StatusBadRequest)
		return
	}
	defer conn.Close()

	log.Println("WebSocket connection established")

	// Create context for the connection
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Monitor for disconnections
	go func() {
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				log.Printf("Client disconnected: %v", err)
				cancel()
				return
			}
		}
	}()

	// Send initial data
	initialData, err := getLatestNamespaceData()
	if err == nil && initialData != nil {
		if !sendEvent(conn, *initialData) {
			return
		}
		log.Println("Initial data sent successfully")
	} else {
		log.Printf("Failed to get initial data: %v", err)
	}

	// Send a confirmation message
	if !sendEvent(conn, WatchEvent{
		Type: "WATCHING",
		Object: map[string]interface{}{
			"message": "Starting resource watchers",
		},
	}) {
		return
	}

	// Buffer channel for events
	eventCh := make(chan WatchEvent, 500)

	// Start namespace watcher
	go watchNamespaces(ctx, eventCh)

	// Start resource watchers with direct listing first
	namespaces, err := getActiveNamespaces()
	if err == nil {
		for _, ns := range namespaces {
			if !shouldHideNamespace(ns) {
				go watchNamespaceResources(ctx, eventCh, ns)

				// Send immediate resource data for this namespace
				go sendInitialResourceData(ctx, eventCh, ns)

				// Small delay to avoid overwhelming the client
				time.Sleep(200 * time.Millisecond)
			}
		}
	}

	// Set up heartbeat ticker
	heartbeatTicker := time.NewTicker(15 * time.Second)
	defer heartbeatTicker.Stop()

	// Counter for processed events
	var eventCount atomic.Int32

	// Main event loop
	for {
		select {
		case <-ctx.Done():
			return

		case event := <-eventCh:
			// Process the event
			eventCount.Add(1)

			// Send the event to the client
			if !sendEvent(conn, event) {
				return
			}

		case <-heartbeatTicker.C:
			// Send heartbeat with stats
			if !sendEvent(conn, WatchEvent{
				Type: "STATUS",
				Object: map[string]interface{}{
					"activeWatchers":  watcherCount.Load(),
					"eventsProcessed": eventCount.Load(),
					"timestamp":       time.Now().Unix(),
				},
			}) {
				return
			}
		}
	}
}

// Key function to immediately send resource data
func sendInitialResourceData(ctx context.Context, eventCh chan<- WatchEvent, namespace string) {
	log.Printf("Sending initial resource data for namespace: %s", namespace)

	// Get client
	_, dynamicClient, err := k8s.GetClientSet()
	if err != nil {
		log.Printf("Failed to get client for namespace %s: %v", namespace, err)
		return
	}

	// Get high priority resources
	resources, err := getWatchableResources()
	if err != nil {
		resources = []schema.GroupVersionResource{
			{Group: "", Version: "v1", Resource: "pods"},
			{Group: "apps", Version: "v1", Resource: "deployments"},
			{Group: "apps", Version: "v1", Resource: "statefulsets"},
			{Group: "", Version: "v1", Resource: "services"},
		}
	}

	// Only use high priority resources for initial data
	highPriorityResources := []schema.GroupVersionResource{}
	for _, gvr := range resources {
		resourceKey := fmt.Sprintf("%s.%s/%s", gvr.Group, gvr.Version, gvr.Resource)
		if isHighPriorityResource(resourceKey) {
			highPriorityResources = append(highPriorityResources, gvr)
		}
	}

	// List resources and send them directly
	for _, gvr := range highPriorityResources {
		// Skip if context is canceled
		if ctx.Err() != nil {
			return
		}

		resourceKey := fmt.Sprintf("%s.%s/%s", gvr.Group, gvr.Version, gvr.Resource)

		// List resources
		list, err := dynamicClient.Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{})
		if err != nil {
			log.Printf("Failed to list %s in %s: %v", resourceKey, namespace, err)
			continue
		}

		// Skip if empty
		if len(list.Items) == 0 {
			continue
		}

		log.Printf("Found %d %s in namespace %s", len(list.Items), resourceKey, namespace)

		// Send each item as an ADDED event
		for _, item := range list.Items {
			labels := item.GetLabels()
			if labels == nil {
				labels = make(map[string]string)
			}

			event := WatchEvent{
				Type:       "ADDED",
				Object:     item.Object,
				Namespace:  namespace,
				Resource:   resourceKey,
				Labels:     labels,
				LabelCount: len(labels),
			}

			// Try to send the event
			select {
			case eventCh <- event:
				// Sent successfully
			case <-ctx.Done():
				return
			default:
				// Channel full, discard
				log.Printf("Event channel full, discarding event for %s in %s", resourceKey, namespace)
			}

			// Small delay to avoid flooding
			time.Sleep(10 * time.Millisecond)
		}

		// Delay between resource types
		time.Sleep(100 * time.Millisecond)
	}

	log.Printf("Completed initial data for namespace: %s", namespace)
}

// watchNamespaces watches for namespace changes
func watchNamespaces(ctx context.Context, eventCh chan<- WatchEvent) {
	watcherKey := "namespaces-watcher"

	if _, exists := activeWatchers.LoadOrStore(watcherKey, true); exists {
		<-ctx.Done()
		return
	}

	defer activeWatchers.Delete(watcherKey)
	watcherCount.Add(1)
	defer watcherCount.Add(-1)

	log.Println("Starting namespace watcher")

	backoff := 1 * time.Second
	maxBackoff := 30 * time.Second

	for {
		if ctx.Err() != nil {
			return
		}

		clientset, _, err := k8s.GetClientSet()
		if err != nil {
			time.Sleep(backoff)
			backoff = min(backoff*2, maxBackoff)
			continue
		}

		backoff = 1 * time.Second

		watcher, err := clientset.CoreV1().Namespaces().Watch(ctx, metav1.ListOptions{
			TimeoutSeconds: pointer(int64(300)),
		})
		if err != nil {
			time.Sleep(backoff)
			backoff = min(backoff*2, maxBackoff)
			continue
		}

		for event := range watcher.ResultChan() {
			if ctx.Err() != nil {
				watcher.Stop()
				return
			}

			if ns, ok := event.Object.(*corev1.Namespace); ok {
				nsName := ns.GetName()
				labels := ns.GetLabels()

				select {
				case eventCh <- WatchEvent{
					Type:       string(event.Type),
					Object:     ns,
					Namespace:  nsName,
					Resource:   "v1/namespaces",
					Labels:     labels,
					LabelCount: len(labels),
				}:
					// Event sent
				case <-ctx.Done():
					watcher.Stop()
					return
				default:
					// Channel full, discard
				}

				// Start watching resources in new namespace
				if event.Type == watch.Added {
					if !shouldHideNamespace(nsName) {
						go watchNamespaceResources(ctx, eventCh, nsName)
						go sendInitialResourceData(ctx, eventCh, nsName)
					}
				}
			}
		}

		time.Sleep(backoff)
		backoff = min(backoff*2, maxBackoff)
	}
}

// watchNamespaceResources watches for resource changes in a specific namespace
func watchNamespaceResources(ctx context.Context, eventCh chan<- WatchEvent, namespace string) {
	watcherKey := "namespace-resources-" + namespace

	if _, exists := activeWatchers.LoadOrStore(watcherKey, true); exists {
		<-ctx.Done()
		return
	}

	defer activeWatchers.Delete(watcherKey)

	log.Printf("Starting resource watchers for namespace: %s", namespace)

	_, dynamicClient, err := k8s.GetClientSet()
	if err != nil {
		log.Printf("Error getting dynamic client: %v", err)
		return
	}

	// Get resources to watch
	resources, err := getWatchableResources()
	if err != nil {
		resources = []schema.GroupVersionResource{
			{Group: "", Version: "v1", Resource: "pods"},
			{Group: "apps", Version: "v1", Resource: "deployments"},
		}
	}

	// Process in batches to avoid throttling
	highPriorityResources := []schema.GroupVersionResource{}
	mediumPriorityResources := []schema.GroupVersionResource{}

	for _, gvr := range resources {
		resourceKey := fmt.Sprintf("%s.%s/%s", gvr.Group, gvr.Version, gvr.Resource)

		if isHighPriorityResource(resourceKey) {
			highPriorityResources = append(highPriorityResources, gvr)
		} else if isMediumFrequencyResource(resourceKey) {
			mediumPriorityResources = append(mediumPriorityResources, gvr)
		}
	}

	// Create resource watchers limited by semaphore
	maxConcurrentWatches := 3
	semaphore := make(chan struct{}, maxConcurrentWatches)

	// Start high priority watchers first
	for _, gvr := range highPriorityResources {
		if ctx.Err() != nil {
			return
		}

		resourceKey := fmt.Sprintf("%s.%s/%s", gvr.Group, gvr.Version, gvr.Resource)

		// Acquire semaphore
		select {
		case semaphore <- struct{}{}:
			// Got semaphore
		case <-ctx.Done():
			return
		}

		watcherCount.Add(1)

		go func(g schema.GroupVersionResource, rKey string) {
			defer func() {
				<-semaphore
				watcherCount.Add(-1)
			}()

			watchSingleResource(ctx, dynamicClient, eventCh, namespace, g)
		}(gvr, resourceKey)

		// Small delay between watchers
		time.Sleep(200 * time.Millisecond)
	}

	// Wait before starting medium priority watchers
	select {
	case <-ctx.Done():
		return
	case <-time.After(2 * time.Second):
		// Continue
	}

	// Start medium priority watchers
	for _, gvr := range mediumPriorityResources {
		if ctx.Err() != nil {
			return
		}

		resourceKey := fmt.Sprintf("%s.%s/%s", gvr.Group, gvr.Version, gvr.Resource)

		// Acquire semaphore
		select {
		case semaphore <- struct{}{}:
			// Got semaphore
		case <-ctx.Done():
			return
		}

		watcherCount.Add(1)

		go func(g schema.GroupVersionResource, rKey string) {
			defer func() {
				<-semaphore
				watcherCount.Add(-1)
			}()

			watchSingleResource(ctx, dynamicClient, eventCh, namespace, g)
		}(gvr, resourceKey)

		// Larger delay for medium priority
		time.Sleep(500 * time.Millisecond)
	}

	// Also watch for namespace label changes
	go watchNamespaceLabels(ctx, eventCh, namespace)

	<-ctx.Done()
}

// watchSingleResource watches a single resource type in a namespace
func watchSingleResource(
	ctx context.Context,
	dynamicClient dynamic.Interface,
	eventCh chan<- WatchEvent,
	namespace string,
	gvr schema.GroupVersionResource,
) {
	resourceKey := fmt.Sprintf("%s.%s/%s", gvr.Group, gvr.Version, gvr.Resource)

	// Track resource labels to detect changes
	resourceLabels := make(map[string]map[string]string)

	backoff := 1 * time.Second
	maxBackoff := 30 * time.Second

	for {
		if ctx.Err() != nil {
			return
		}

		// Create a resource client for this GVR
		resourceClient := dynamicClient.Resource(gvr).Namespace(namespace)

		// Start a watcher with a shorter timeout
		watcher, err := resourceClient.Watch(ctx, metav1.ListOptions{
			TimeoutSeconds: pointer(int64(60)),
		})

		if err != nil {
			if isPermissionError(err) || isNotSupportedError(err) {
				return
			}

			time.Sleep(backoff)
			backoff = min(backoff*2, maxBackoff)
			continue
		}

		log.Printf("Watch established for %s in namespace %s", resourceKey, namespace)
		backoff = 1 * time.Second

		for event := range watcher.ResultChan() {
			if ctx.Err() != nil {
				watcher.Stop()
				return
			}

			// Process the event
			obj, ok := event.Object.(*unstructured.Unstructured)
			if !ok {
				continue
			}

			resourceName := obj.GetName()
			labels := obj.GetLabels()
			if labels == nil {
				labels = make(map[string]string)
			}

			// Check for label changes
			if event.Type == watch.Modified || event.Type == watch.Added {
				previousLabels, exists := resourceLabels[resourceName]

				if exists && event.Type == watch.Modified && labelsChanged(previousLabels, labels) {
					// Send label change event
					select {
					case eventCh <- WatchEvent{
						Type:       "RESOURCE_LABEL_CHANGED",
						Object:     labels,
						Namespace:  namespace,
						Resource:   fmt.Sprintf("%s/%s", resourceKey, resourceName),
						Labels:     labels,
						LabelCount: len(labels),
					}:
						// Label event sent
					case <-ctx.Done():
						watcher.Stop()
						return
					default:
						// Channel full, skip
					}
				}

				resourceLabels[resourceName] = labels
			} else if event.Type == watch.Deleted {
				delete(resourceLabels, resourceName)
			}

			// Send standard event
			select {
			case eventCh <- WatchEvent{
				Type:       string(event.Type),
				Object:     obj.Object, // Important: use obj.Object, not just obj
				Namespace:  namespace,
				Resource:   resourceKey,
				Labels:     labels,
				LabelCount: len(labels),
			}:
				// Event sent
			case <-ctx.Done():
				watcher.Stop()
				return
			default:
				// Channel full, skip
				log.Printf("Event channel full, skipping event for %s/%s", resourceKey, resourceName)
			}
		}

		log.Printf("Watch connection closed for %s in %s, reconnecting...", resourceKey, namespace)
		time.Sleep(2 * time.Second)
	}
}

// watchNamespaceLabels watches for label changes on a specific namespace
func watchNamespaceLabels(ctx context.Context, eventCh chan<- WatchEvent, namespace string) {
	watcherKey := "namespace-labels-" + namespace

	if _, exists := activeWatchers.LoadOrStore(watcherKey, true); exists {
		<-ctx.Done()
		return
	}

	defer activeWatchers.Delete(watcherKey)
	watcherCount.Add(1)
	defer watcherCount.Add(-1)

	var previousLabels map[string]string

	backoff := 1 * time.Second
	maxBackoff := 30 * time.Second

	for {
		if ctx.Err() != nil {
			return
		}

		clientset, _, err := k8s.GetClientSet()
		if err != nil {
			time.Sleep(backoff)
			backoff = min(backoff*2, maxBackoff)
			continue
		}

		backoff = 1 * time.Second

		watcher, err := clientset.CoreV1().Namespaces().Watch(ctx, metav1.ListOptions{
			FieldSelector:  "metadata.name=" + namespace,
			TimeoutSeconds: pointer(int64(300)),
		})

		if err != nil {
			time.Sleep(backoff)
			backoff = min(backoff*2, maxBackoff)
			continue
		}

		backoff = 1 * time.Second

		for event := range watcher.ResultChan() {
			if ctx.Err() != nil {
				watcher.Stop()
				return
			}

			if ns, ok := event.Object.(*v1.Namespace); ok {
				if ns.GetName() != namespace {
					continue
				}

				currentLabels := ns.GetLabels()

				if previousLabels != nil && event.Type == watch.Modified {
					if labelsChanged(previousLabels, currentLabels) {
						select {
						case eventCh <- WatchEvent{
							Type:       "LABEL_CHANGED",
							Object:     currentLabels,
							Namespace:  namespace,
							Resource:   "namespace.labels",
							Labels:     currentLabels,
							LabelCount: len(currentLabels),
						}:
							// Event sent
						case <-ctx.Done():
							watcher.Stop()
							return
						default:
							// Channel full, skip
						}
					}
				}

				previousLabels = currentLabels

				if event.Type == watch.Deleted {
					return
				}
			}
		}

		time.Sleep(2 * time.Second)
	}
}

// getWatchableResources uses discovery API to find watchable resources
func getWatchableResources() ([]schema.GroupVersionResource, error) {
	// Try cache first
	cachedGVRs, err := getResourcesFromCache()
	if err == nil {
		return cachedGVRs, nil
	}

	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return nil, fmt.Errorf("failed to get clientset: %w", err)
	}

	discoveryClient, ok := clientset.Discovery().(*discovery.DiscoveryClient)
	if !ok {
		return nil, fmt.Errorf("failed to get discovery client")
	}

	// Get server resources with error handling for partial discovery
	_, apiResourceLists, err := discoveryClient.ServerGroupsAndResources()
	if err != nil {
		if !discovery.IsGroupDiscoveryFailedError(err) {
			return nil, err
		}
		// Continue with partial results
	}

	// Prioritize resources
	highPriorityResources := make([]schema.GroupVersionResource, 0)
	normalPriorityResources := make([]schema.GroupVersionResource, 0)
	lowPriorityResources := make([]schema.GroupVersionResource, 0)

	for _, apiResourceList := range apiResourceLists {
		gv, err := schema.ParseGroupVersion(apiResourceList.GroupVersion)
		if err != nil {
			continue
		}

		for _, apiResource := range apiResourceList.APIResources {
			// Only include namespaced resources that we can watch
			if !apiResource.Namespaced || !containsString(apiResource.Verbs, "watch") {
				continue
			}

			// Skip subresources
			if strings.Contains(apiResource.Name, "/") {
				continue
			}

			resourceKey := fmt.Sprintf("%s.%s/%s", gv.Group, gv.Version, apiResource.Name)

			// Skip resources known to cause issues
			if shouldSkipResource(resourceKey) {
				continue
			}

			gvr := schema.GroupVersionResource{
				Group:    gv.Group,
				Version:  gv.Version,
				Resource: apiResource.Name,
			}

			if isHighPriorityResource(resourceKey) {
				highPriorityResources = append(highPriorityResources, gvr)
			} else if isMediumFrequencyResource(resourceKey) {
				normalPriorityResources = append(normalPriorityResources, gvr)
			} else {
				lowPriorityResources = append(lowPriorityResources, gvr)
			}
		}
	}

	// Combine with high priority first
	result := make([]schema.GroupVersionResource, 0,
		len(highPriorityResources)+len(normalPriorityResources)+len(lowPriorityResources))

	result = append(result, highPriorityResources...)
	result = append(result, normalPriorityResources...)
	result = append(result, lowPriorityResources...)

	// Cache for future use
	cacheResources(result)

	return result, nil
}

// getResourcesFromCache attempts to get resources from cache
func getResourcesFromCache() ([]schema.GroupVersionResource, error) {
	// Get cached resources from Redis
	cachedResources, err := redis.GetNamespaceCache("watchable_resources")
	if err != nil || cachedResources == "" {
		return nil, fmt.Errorf("resources not in cache")
	}

	var result []schema.GroupVersionResource
	if err := json.Unmarshal([]byte(cachedResources), &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal cached resources: %w", err)
	}

	return result, nil
}

// cacheResources caches the resources for future use
func cacheResources(resources []schema.GroupVersionResource) {
	jsonData, err := json.Marshal(resources)
	if err != nil {
		return
	}

	// Cache for 15 minutes using Redis
	redis.SetNamespaceCache("watchable_resources", string(jsonData), 15*time.Minute)
}

// containsString checks if a string is in a slice
func containsString(slice []string, s string) bool {
	for _, item := range slice {
		if item == s {
			return true
		}
	}
	return false
}

// labelsChanged detects if labels have changed
func labelsChanged(oldLabels, newLabels map[string]string) bool {
	// Different number of labels means they changed
	if len(oldLabels) != len(newLabels) {
		return true
	}

	// Check if any label value changed
	for k, v := range newLabels {
		if oldVal, exists := oldLabels[k]; !exists || oldVal != v {
			return true
		}
	}

	// Check for removed labels
	for k := range oldLabels {
		if _, exists := newLabels[k]; !exists {
			return true
		}
	}

	// No changes detected
	return false
}

// getLatestNamespaceData retrieves initial data for connection
func getLatestNamespaceData() (*WatchEvent, error) {
	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return nil, fmt.Errorf("failed to get clientset: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	// Filter out system namespaces
	visibleNamespaces := make([]corev1.Namespace, 0)

	for _, ns := range namespaces.Items {
		if !shouldHideNamespace(ns.Name) {
			visibleNamespaces = append(visibleNamespaces, ns)
		}
	}

	// Create the initial data event
	return &WatchEvent{
		Type:   "INITIAL_DATA",
		Object: visibleNamespaces,
	}, nil
}

// getActiveNamespaces returns all active namespaces
func getActiveNamespaces() ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	clientset, _, err := k8s.GetClientSet()
	if err != nil {
		return nil, fmt.Errorf("failed to get clientset: %w", err)
	}

	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	result := make([]string, 0, len(namespaces.Items))
	for _, ns := range namespaces.Items {
		if !shouldHideNamespace(ns.Name) {
			result = append(result, ns.Name)
		}
	}

	return result, nil
}

// Helper function to create a pointer to an int64
func pointer(i int64) *int64 {
	return &i
}

// isPermissionError checks if the error is a permission error
func isPermissionError(err error) bool {
	return strings.Contains(err.Error(), "forbidden") || strings.Contains(err.Error(), "unauthorized")
}

// isNotSupportedError checks if the error indicates an operation is not supported
func isNotSupportedError(err error) bool {
	return strings.Contains(err.Error(), "not supported") || strings.Contains(err.Error(), "method not allowed")
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

// isHighPriorityResource identifies resources that update frequently and are critical to monitor
func isHighPriorityResource(resourceKey string) bool {
	highPriorityTypes := []string{"pod", "deployment", "service", "statefulset", "daemonset"}
	for _, t := range highPriorityTypes {
		if strings.Contains(resourceKey, t) {
			return true
		}
	}
	return false
}

// Alias for backward compatibility
func isHighFrequencyResource(resourceKey string) bool {
	return isHighPriorityResource(resourceKey)
}

func isMediumFrequencyResource(resourceKey string) bool {
	mediumFrequencyTypes := []string{"configmap", "secret", "persistentvolumeclaim", "ingress", "job"}
	for _, t := range mediumFrequencyTypes {
		if strings.Contains(resourceKey, t) {
			return true
		}
	}
	return false
}

// shouldHideNamespace returns true for system namespaces that should be hidden
func shouldHideNamespace(namespace string) bool {
	// Common system namespaces to hide
	systemNamespaces := []string{
		"kube-system",
		"kube-public",
		"kube-node-lease",
	}

	for _, ns := range systemNamespaces {
		if namespace == ns {
			return true
		}
	}

	// Also hide namespaces with common prefixes
	prefixesToHide := []string{
		"openshift-",
		"system-",
	}

	for _, prefix := range prefixesToHide {
		if strings.HasPrefix(namespace, prefix) {
			return true
		}
	}

	return false
}

// min for durations
func min(a, b time.Duration) time.Duration {
	if a < b {
		return a
	}
	return b
}
