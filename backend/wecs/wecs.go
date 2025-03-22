package wecs

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/kubestellar/ui/its/manual/handlers"
	"github.com/kubestellar/ui/k8s"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

// PodData contains the raw pod JSON and logs.
type PodData struct {
	Name string          `json:"name"`
	Raw  json.RawMessage `json:"raw"`
	Logs string          `json:"logs,omitempty"`
}

// NamespaceData groups pods by namespace.
type NamespaceData struct {
	Name string    `json:"namespace"`
	Pods []PodData `json:"pods"`
}

// ClusterData groups namespaces by cluster.
type ClusterData struct {
	Name       string          `json:"cluster"`
	Namespaces []NamespaceData `json:"namespaces"`
}

var upgrader = websocket.Upgrader{
	// Allow any origin; adjust if needed for production.
	CheckOrigin: func(r *http.Request) bool { return true },
}

// getITSData loads kubeconfig and returns managed clusters matching a prefix.
func getITSData() ([]handlers.ManagedClusterInfo, error) {
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

	// Process ITS contexts (e.g., contexts starting with "its")
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

	return managedClusters, nil
}

// StreamK8sDatastreams hierarchical raw pod data via WebSocket, optimized
// for speed by using concurrency. (Pod logs are omitted here for performance.)
func StreamK8sData(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	// Main loop to continuously send updates.
	for {
		clustersInfo, err := getITSData()
		if err != nil {
			log.Printf("Error fetching ITS data: %v", err)
			return
		}

		var allClusters []ClusterData
		var clusterWg sync.WaitGroup
		var mu sync.Mutex

		// Process each managed cluster concurrently.
		for _, clusterInfo := range clustersInfo {
			clusterWg.Add(1)
			go func(ci handlers.ManagedClusterInfo) {
				defer clusterWg.Done()

				// Obtain a clientset using the cluster's context.
				clientset, _, err := k8s.GetClientSetWithContext(ci.Context)
				if err != nil {
					log.Printf("Error getting clientset for context %s: %v", ci.Context, err)
					return
				}

				// List namespaces.
				namespaceList, err := clientset.CoreV1().Namespaces().List(context.TODO(), metav1.ListOptions{})
				if err != nil {
					log.Printf("Error listing namespaces in cluster %s: %v", ci.Name, err)
					return
				}

				clusterData := ClusterData{
					Name:       ci.Name,
					Namespaces: []NamespaceData{},
				}

				var nsWg sync.WaitGroup
				var nsMu sync.Mutex

				// Process each namespace concurrently.
				for _, ns := range namespaceList.Items {
					nsWg.Add(1)
					go func(nsName string) {
						defer nsWg.Done()

						podList, err := clientset.CoreV1().Pods(nsName).List(context.TODO(), metav1.ListOptions{})
						if err != nil {
							log.Printf("Error listing pods in namespace %s: %v", nsName, err)
							return
						}

						nsData := NamespaceData{
							Name: nsName,
							Pods: []PodData{},
						}

						var podWg sync.WaitGroup
						var podMu sync.Mutex

						// Process each pod concurrently.
						for _, pod := range podList.Items {
							podWg.Add(1)
							go func(podName string) {
								defer podWg.Done()

								// Fetch raw pod JSON.
								rawPod, err := clientset.CoreV1().RESTClient().Get().
									Namespace(nsName).
									Resource("pods").
									Name(podName).
									DoRaw(context.TODO())
								if err != nil {
									log.Printf("Error fetching raw pod data for %s in %s: %v", podName, nsName, err)
									return
								}

								pd := PodData{
									Name: podName,
									Raw:  json.RawMessage(rawPod),
									Logs: "", // logs omitted for faster response
								}
								podMu.Lock()
								nsData.Pods = append(nsData.Pods, pd)
								podMu.Unlock()
							}(pod.Name)
						}
						podWg.Wait()

						// Add namespace only if it has pods.
						if len(nsData.Pods) > 0 {
							nsMu.Lock()
							clusterData.Namespaces = append(clusterData.Namespaces, nsData)
							nsMu.Unlock()
						}
					}(ns.Name)
				}
				nsWg.Wait()

				mu.Lock()
				allClusters = append(allClusters, clusterData)
				mu.Unlock()
			}(clusterInfo)
		}
		clusterWg.Wait()

		// Marshal and send the JSON.
		message, err := json.Marshal(allClusters)
		if err != nil {
			log.Printf("Error marshalling JSON: %v", err)
			continue
		}
		if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Printf("WebSocket write error: %v", err)
			break
		}

		// Sleep briefly before the next update.
		time.Sleep(2 * time.Second)
	}
}

// StreamPodLogs streams full logs for a specific pod via a dedicated WebSocket.
// It expects the following query parameters:
// - cluster: the cluster context name (or identifier)
// - namespace: the namespace of the pod
// - pod: the pod name
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

	// Retrieve the clientset using the specified cluster context.
	clientset, _, err := k8s.GetClientSetWithContext(cluster)
	if err != nil {
		log.Printf("Error getting clientset for cluster/context %s: %v", cluster, err)
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("error: %v", err)))
		return
	}

	// Continuously stream logs.
	for {
		podLogOpts := &v1.PodLogOptions{
			Timestamps: true,
		}

		// Build and execute the log request.
		req := clientset.CoreV1().Pods(namespace).GetLogs(podName, podLogOpts)
		podLogsStream, err := req.Stream(context.TODO())
		if err != nil {
			errMsg := fmt.Sprintf("Error streaming logs for pod %s in namespace %s: %v", podName, namespace, err)
			log.Print(errMsg)
			conn.WriteMessage(websocket.TextMessage, []byte(errMsg))
			break
		}

		// Read the logs from the stream.
		logsBytes, err := io.ReadAll(podLogsStream)
		podLogsStream.Close()
		if err != nil {
			errMsg := fmt.Sprintf("Error reading logs for pod %s in namespace %s: %v", podName, namespace, err)
			log.Print(errMsg)
			conn.WriteMessage(websocket.TextMessage, []byte(errMsg))
			break
		}

		// Send the logs over the WebSocket.
		if err := conn.WriteMessage(websocket.TextMessage, logsBytes); err != nil {
			log.Printf("WebSocket write error: %v", err)
			break
		}

		// Wait briefly before fetching the logs again.
		time.Sleep(2 * time.Second)
	}
}
