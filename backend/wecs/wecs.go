package wecs

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/kubestellar/ui/its/manual/handlers"
	"github.com/kubestellar/ui/k8s"
	"github.com/kubestellar/ui/redis"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// Cache expiration durations
const (
	// Cache all cluster data for 60 seconds
	ClusterDataCacheDuration = 60 * time.Second

	// Cache individual namespace data for 30 seconds
	NamespaceCacheDuration = 30 * time.Second

	// Cache pod logs for a shorter duration as they change frequently
	PodLogsCacheDuration = 10 * time.Second
)

// ResourceData contains data for a Kubernetes resource.
type ResourceData struct {
	Name              string          `json:"name"`
	Kind              string          `json:"kind"`
	Raw               json.RawMessage `json:"raw"`
	ReplicaSets       []ResourceData  `json:"replicaSets,omitempty"`
	Pods              []ResourceData  `json:"pods,omitempty"`
	CreationTimestamp time.Time       `json:"creationTimestamp"`
}

// ResourceTypeData groups resources by their type.
type ResourceTypeData struct {
	Kind      string         `json:"kind"`
	Group     string         `json:"group"`
	Version   string         `json:"version"`
	Resources []ResourceData `json:"resources"`
}

// NamespaceData groups resource types by namespace.
type NamespaceData struct {
	Name          string             `json:"namespace"`
	ResourceTypes []ResourceTypeData `json:"resourceTypes"`
}

// ClusterData groups namespaces by cluster.
type ClusterData struct {
	Name        string          `json:"cluster"`
	Namespaces  []NamespaceData `json:"namespaces"`
	LastUpdated time.Time       `json:"lastUpdated"`
}

// getCacheKey generates a consistent cache key for different data types
func getCacheKey(dataType string, parts ...string) string {
	return fmt.Sprintf("k8s:%s:%s", dataType, strings.Join(parts, ":"))
}

// getITSData loads kubeconfig and returns managed clusters matching a prefix.
func getITSData() ([]handlers.ManagedClusterInfo, error) {
	// Try to get from cache first
	var cachedClusters []handlers.ManagedClusterInfo
	cacheKey := getCacheKey("itsdata")

	found, err := redis.GetJSONValue(cacheKey, &cachedClusters)
	if err != nil {
		log.Printf("Error retrieving ITS data from cache: %v", err)
	} else if found && len(cachedClusters) > 0 {
		log.Printf("Using cached ITS data (%d clusters)", len(cachedClusters))
		return cachedClusters, nil
	}

	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := handlers.HomeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
	}
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, err
	}

	var managedClusters []handlers.ManagedClusterInfo

	for contextName := range config.Contexts {
		if strings.HasPrefix(contextName, "its") {
			clientConfig := clientcmd.NewNonInteractiveClientConfig(
				*config,
				contextName,
				&clientcmd.ConfigOverrides{},
				clientcmd.NewDefaultClientConfigLoadingRules(),
			)
			restConfig, err := clientConfig.ClientConfig()
			if err != nil {
				log.Printf("Error creating REST config for context %s: %v", contextName, err)
				continue
			}
			clientset, err := kubernetes.NewForConfig(restConfig)
			if err != nil {
				log.Printf("Error creating clientset for context %s: %v", contextName, err)
				continue
			}
			clustersBytes, err := clientset.RESTClient().Get().
				AbsPath("/apis/cluster.open-cluster-management.io/v1").
				Resource("managedclusters").
				DoRaw(context.TODO())
			if err != nil {
				log.Printf("Error fetching managed clusters from context %s: %v", contextName, err)
				continue
			}
			var clusterList struct {
				Items []struct {
					Metadata struct {
						Name              string            `json:"name"`
						Labels            map[string]string `json:"labels"`
						CreationTimestamp string            `json:"creationTimestamp"`
					} `json:"metadata"`
				} `json:"items"`
			}
			if err := json.Unmarshal(clustersBytes, &clusterList); err != nil {
				log.Printf("Error unmarshaling clusters from context %s: %v", contextName, err)
				continue
			}
			for _, item := range clusterList.Items {
				creationTime, _ := time.Parse(time.RFC3339, item.Metadata.CreationTimestamp)
				managedClusters = append(managedClusters, handlers.ManagedClusterInfo{
					Name:         item.Metadata.Name,
					Labels:       item.Metadata.Labels,
					CreationTime: creationTime,
					Context:      contextName,
				})
			}
		}
	}

	// Cache the result for future use
	if len(managedClusters) > 0 {
		err := redis.SetJSONValue(cacheKey, managedClusters, 5*time.Minute)
		if err != nil {
			log.Printf("Error caching ITS data: %v", err)
		}
	}

	return managedClusters, nil
}

// StreamK8sDataChronologically streams hierarchical cluster data chronologically.
func StreamK8sDataChronologically(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	// Setup a ping/pong mechanism to keep the connection alive
	conn.SetPingHandler(func(pingMsg string) error {
		return conn.WriteControl(websocket.PongMessage, []byte(pingMsg), time.Now().Add(5*time.Second))
	})

	// Start a ticker to send ping messages
	pingTicker := time.NewTicker(30 * time.Second)
	defer pingTicker.Stop()

	// Run ping handler in separate goroutine
	go func() {
		for range pingTicker.C {
			if err := conn.WriteControl(websocket.PingMessage, []byte{}, time.Now().Add(5*time.Second)); err != nil {
				log.Printf("Ping error: %v", err)
				return
			}
		}
	}()

	excludedNamespaces := map[string]bool{
		"open-cluster-management-hub":          true,
		"open-cluster-management":              true,
		"kube-system":                          true,
		"kube-node-lease":                      true,
		"kube-public":                          true,
		"gatekeeper-system":                    true,
		"openshift-operator-lifecycle-manager": true,
		"openshift-apiserver":                  true,
		"openshift-controller-manager":         true,
		"open-cluster-management-agent-addon":  true,
		"open-cluster-management-agent":        true,
	}

	// Main data refresh loop
	fetchTicker := time.NewTicker(1 * time.Second)
	defer fetchTicker.Stop()

	for range fetchTicker.C {
		// Try to fetch from cache first
		var allClusters []ClusterData
		allClustersCacheKey := getCacheKey("allclusters")

		cacheHit, err := redis.GetJSONValue(allClustersCacheKey, &allClusters)
		if err != nil {
			log.Printf("Error retrieving cluster data from cache: %v", err)
		}

		// Check if we need to refresh the data
		needsRefresh := !cacheHit
		if !needsRefresh && len(allClusters) > 0 {
			firstCluster := allClusters[0]
			if time.Since(firstCluster.LastUpdated) > ClusterDataCacheDuration {
				needsRefresh = true
				log.Printf("Cache expired for cluster data, refreshing...")
			}
		}

		if needsRefresh {
			log.Printf("Fetching fresh cluster data...")
			clustersInfo, err := getITSData()
			if err != nil {
				log.Printf("Error fetching ITS data: %v", err)
				continue
			}

			newAllClusters := make([]ClusterData, len(clustersInfo))
			var clusterWg sync.WaitGroup
			var clusterDataMutex sync.Mutex

			for i, clusterInfo := range clustersInfo {
				clusterWg.Add(1)
				go func(i int, ci handlers.ManagedClusterInfo) {
					defer clusterWg.Done()

					// Try to get cached cluster data first
					var clusterData ClusterData
					clusterCacheKey := getCacheKey("cluster", ci.Name)

					cacheHit, err := redis.GetJSONValue(clusterCacheKey, &clusterData)
					if err != nil {
						log.Printf("Error retrieving cluster %s data from cache: %v", ci.Name, err)
					}

					// Check if we need to refresh this cluster's data
					needsRefresh := !cacheHit
					if !needsRefresh && len(clusterData.Namespaces) > 0 {
						if time.Since(clusterData.LastUpdated) > ClusterDataCacheDuration {
							needsRefresh = true
						}
					}

					if needsRefresh {
						log.Printf("Refreshing data for cluster %s", ci.Name)
						clusterData = ClusterData{
							Name:        ci.Name,
							LastUpdated: time.Now(),
						}

						clientset, _, err := k8s.GetClientSetWithContext(ci.Name)
						if err != nil {
							log.Printf("Error getting clientset for context %s: %v", ci.Name, err)
							return
						}

						namespaceList, err := clientset.CoreV1().Namespaces().List(context.TODO(), metav1.ListOptions{})
						if err != nil {
							log.Printf("Error listing namespaces in cluster %s: %v", ci.Name, err)
							return
						}

						namespaces := make([]NamespaceData, 0, len(namespaceList.Items))
						var nsWg sync.WaitGroup
						nsChan := make(chan NamespaceData, len(namespaceList.Items))

						for _, ns := range namespaceList.Items {
							if excludedNamespaces[ns.Name] {
								continue
							}
							nsWg.Add(1)
							go func(nsName string) {
								defer nsWg.Done()

								// Try to get cached namespace data first
								var nsData NamespaceData
								nsCacheKey := getCacheKey("namespace", ci.Name, nsName)

								cacheHit, err := redis.GetJSONValue(nsCacheKey, &nsData)
								if err != nil {
									log.Printf("Error retrieving namespace %s data from cache: %v", nsName, err)
								}

								// Check if we need to refresh this namespace data
								nsNeedsRefresh := !cacheHit
								if !nsNeedsRefresh && len(nsData.ResourceTypes) > 0 {
									// We'll force refresh even if cached to ensure consistency
									// Could optimize by checking timestamps on deployments
									nsNeedsRefresh = true
								}

								if nsNeedsRefresh {
									nsData = NamespaceData{Name: nsName}

									// Get deployments
									deployments, err := clientset.AppsV1().Deployments(nsName).List(context.TODO(), metav1.ListOptions{})
									if err != nil {
										log.Printf("Error listing deployments in namespace %s: %v", nsName, err)
									} else {
										deploymentResources := make([]ResourceData, 0, len(deployments.Items))
										for _, deployment := range deployments.Items {
											replicaSets, err := getReplicaSetsForDeployment(clientset, deployment, nsName)
											if err != nil {
												log.Printf("Error getting replica sets for deployment %s: %v", deployment.Name, err)
											}

											rawDeployment, _ := json.Marshal(deployment)
											deploymentResources = append(deploymentResources, ResourceData{
												Name:              deployment.Name,
												Kind:              "Deployment",
												Raw:               rawDeployment,
												ReplicaSets:       replicaSets,
												CreationTimestamp: deployment.CreationTimestamp.Time,
											})
										}

										// Sort deployments by creation timestamp
										sort.Slice(deploymentResources, func(i, j int) bool {
											return deploymentResources[i].CreationTimestamp.Before(deploymentResources[j].CreationTimestamp)
										})

										nsData.ResourceTypes = append(nsData.ResourceTypes, ResourceTypeData{
											Kind:      "Deployment",
											Group:     "apps",
											Version:   "v1",
											Resources: deploymentResources,
										})
									}

									// Cache this namespace data
									err = redis.SetJSONValue(nsCacheKey, nsData, NamespaceCacheDuration)
									if err != nil {
										log.Printf("Error caching namespace %s data: %v", nsName, err)
									}
								}

								nsChan <- nsData
							}(ns.Name)
						}

						go func() {
							nsWg.Wait()
							close(nsChan)
						}()

						for nsData := range nsChan {
							namespaces = append(namespaces, nsData)
						}
						clusterData.Namespaces = namespaces

						// Cache the cluster data
						err = redis.SetJSONValue(clusterCacheKey, clusterData, ClusterDataCacheDuration)
						if err != nil {
							log.Printf("Error caching cluster %s data: %v", ci.Name, err)
						}
					}

					clusterDataMutex.Lock()
					newAllClusters[i] = clusterData
					clusterDataMutex.Unlock()
				}(i, clusterInfo)
			}
			clusterWg.Wait()

			// Update our cached data
			allClusters = newAllClusters

			// Cache all clusters data
			err = redis.SetJSONValue(allClustersCacheKey, allClusters, ClusterDataCacheDuration)
			if err != nil {
				log.Printf("Error caching all clusters data: %v", err)
			}
		}

		// Send the data over websocket
		message, err := json.Marshal(allClusters)
		if err != nil {
			log.Printf("Error marshalling JSON: %v", err)
			continue
		}

		if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Printf("WebSocket write error: %v", err)
			return
		}
	}
}

// getReplicaSetsForDeployment returns replica sets owned by a deployment with their pods
func getReplicaSetsForDeployment(clientset *kubernetes.Clientset, deployment appsv1.Deployment, namespace string) ([]ResourceData, error) {
	// Try to get from cache first
	var result []ResourceData
	cacheKey := getCacheKey("replicasets", namespace, deployment.Name)

	found, err := redis.GetJSONValue(cacheKey, &result)
	if err != nil {
		log.Printf("Error retrieving replica sets from cache: %v", err)
	} else if found && len(result) > 0 {
		return result, nil
	}

	// List all replica sets in the namespace
	replicaSets, err := clientset.AppsV1().ReplicaSets(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	result = []ResourceData{}

	// Filter replica sets that belong to this deployment
	for _, rs := range replicaSets.Items {
		isOwnedByDeployment := false
		for _, owner := range rs.OwnerReferences {
			if owner.Kind == "Deployment" && owner.Name == deployment.Name {
				isOwnedByDeployment = true
				break
			}
		}

		if isOwnedByDeployment {
			// Get pods for this replica set
			pods, err := getPodsForReplicaSet(clientset, rs, namespace)
			if err != nil {
				log.Printf("Error getting pods for replica set %s: %v", rs.Name, err)
			}

			rawRS, _ := json.Marshal(rs)
			result = append(result, ResourceData{
				Name:              rs.Name,
				Kind:              "ReplicaSet",
				Raw:               rawRS,
				Pods:              pods,
				CreationTimestamp: rs.CreationTimestamp.Time,
			})
		}
	}

	// Sort replica sets by creation timestamp (newest first, as that's typically the active one)
	sort.Slice(result, func(i, j int) bool {
		return result[i].CreationTimestamp.After(result[j].CreationTimestamp)
	})

	// Cache the result
	if len(result) > 0 {
		err := redis.SetJSONValue(cacheKey, result, NamespaceCacheDuration)
		if err != nil {
			log.Printf("Error caching replica sets: %v", err)
		}
	}

	return result, nil
}

// getPodsForReplicaSet returns pods owned by a replica set
func getPodsForReplicaSet(clientset *kubernetes.Clientset, rs appsv1.ReplicaSet, namespace string) ([]ResourceData, error) {
	// Try to get from cache first
	var result []ResourceData
	cacheKey := getCacheKey("pods", namespace, rs.Name)

	found, err := redis.GetJSONValue(cacheKey, &result)
	if err != nil {
		log.Printf("Error retrieving pods from cache: %v", err)
	} else if found && len(result) > 0 {
		return result, nil
	}

	// List all pods in the namespace
	pods, err := clientset.CoreV1().Pods(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	result = []ResourceData{}

	// Filter pods that belong to this replica set
	for _, pod := range pods.Items {
		isOwnedByReplicaSet := false
		for _, owner := range pod.OwnerReferences {
			if owner.Kind == "ReplicaSet" && owner.Name == rs.Name {
				isOwnedByReplicaSet = true
				break
			}
		}

		if isOwnedByReplicaSet {
			rawPod, _ := json.Marshal(pod)
			result = append(result, ResourceData{
				Name:              pod.Name,
				Kind:              "Pod",
				Raw:               rawPod,
				CreationTimestamp: pod.CreationTimestamp.Time,
			})
		}
	}

	// Sort pods by creation timestamp
	sort.Slice(result, func(i, j int) bool {
		return result[i].CreationTimestamp.Before(result[j].CreationTimestamp)
	})

	// Cache the result
	if len(result) > 0 {
		err := redis.SetJSONValue(cacheKey, result, NamespaceCacheDuration)
		if err != nil {
			log.Printf("Error caching pods: %v", err)
		}
	}

	return result, nil
}

// StreamPodLogs streams full logs for a specific pod via a dedicated WebSocket,
// with Redis caching to prevent disconnections and improve performance.
func StreamPodLogs(c *gin.Context) {
	// Validate query parameters.
	cluster := c.Query("cluster")
	namespace := c.Query("namespace")
	podName := c.Query("pod")
	if cluster == "" || namespace == "" || podName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing query parameters: cluster, namespace, and pod are required"})
		return
	}

	// Upgrade the HTTP connection to a WebSocket.
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	// Setup a ping/pong mechanism to keep the connection alive
	conn.SetPingHandler(func(pingMsg string) error {
		return conn.WriteControl(websocket.PongMessage, []byte(pingMsg), time.Now().Add(5*time.Second))
	})

	// Start a ticker to send ping messages
	pingTicker := time.NewTicker(30 * time.Second)
	defer pingTicker.Stop()

	// Run ping handler in separate goroutine
	go func() {
		for range pingTicker.C {
			if err := conn.WriteControl(websocket.PingMessage, []byte{}, time.Now().Add(5*time.Second)); err != nil {
				log.Printf("Ping error: %v", err)
				return
			}
		}
	}()

	// Retrieve the clientset using the specified cluster context.
	clientset, _, err := k8s.GetClientSetWithContext(cluster)
	if err != nil {
		log.Printf("Error getting clientset for cluster/context %s: %v", cluster, err)
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("error: %v", err)))
		return
	}

	cacheKey := getCacheKey("podlogs", cluster, namespace, podName)
	var lastSentLogs string

	// Continuously stream logs.
	for {
		// Check cache first
		var podLogs string
		found, _ := redis.GetJSONValue(cacheKey, &podLogs)

		// Only fetch new logs if cache miss or last sent logs differ
		if !found || podLogs != lastSentLogs {
			if found {
				// If we have cached logs that are newer than what we sent, use those
				if podLogs != lastSentLogs {
					if err := conn.WriteMessage(websocket.TextMessage, []byte(podLogs)); err != nil {
						log.Printf("WebSocket write error: %v", err)
						break
					}
					lastSentLogs = podLogs
				}
			} else {
				// Fetch fresh logs
				podLogOpts := &corev1.PodLogOptions{
					Timestamps: true,
				}

				// Build and execute the log request.
				req := clientset.CoreV1().Pods(namespace).GetLogs(podName, podLogOpts)
				podLogsStream, err := req.Stream(context.TODO())
				if err != nil {
					errMsg := fmt.Sprintf("Error streaming logs for pod %s in namespace %s: %v", podName, namespace, err)
					log.Print(errMsg)
					conn.WriteMessage(websocket.TextMessage, []byte(errMsg))
					time.Sleep(5 * time.Second) // Wait longer before retrying on error
					continue
				}

				// Read the logs from the stream.
				logsBytes, err := io.ReadAll(podLogsStream)
				podLogsStream.Close()
				if err != nil {
					errMsg := fmt.Sprintf("Error reading logs for pod %s in namespace %s: %v", podName, namespace, err)
					log.Print(errMsg)
					conn.WriteMessage(websocket.TextMessage, []byte(errMsg))
					time.Sleep(5 * time.Second) // Wait longer before retrying on error
					continue
				}

				// Cache the logs
				podLogs = string(logsBytes)
				err = redis.SetJSONValue(cacheKey, podLogs, PodLogsCacheDuration)
				if err != nil {
					log.Printf("Error caching pod logs: %v", err)
				}

				// Send the logs if they're different from what we last sent
				if podLogs != lastSentLogs {
					if err := conn.WriteMessage(websocket.TextMessage, logsBytes); err != nil {
						log.Printf("WebSocket write error: %v", err)
						break
					}
					lastSentLogs = podLogs
				}
			}
		}

		// Wait briefly before fetching the logs again.
		time.Sleep(2 * time.Second)
	}
}
