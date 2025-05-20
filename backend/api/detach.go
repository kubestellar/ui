package api

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/kubestellar/ui/k8s"
	"k8s.io/client-go/kubernetes"
)

type WebSocketClient struct {
	Conn      *websocket.Conn
	ClusterID string
}

// WebSocketEvent represents an event to be sent over the websocket
type WebSocketEvent struct {
	Type        string    `json:"type"`
	ClusterName string    `json:"clusterName"`
	Status      string    `json:"status"`
	Message     string    `json:"message"`
	Timestamp   time.Time `json:"timestamp"`
}

var (
	// Create a map of cluster -> list of websocket connections
	wsClients     = make(map[string][]*WebSocketClient)
	wsClientMutex = sync.RWMutex{}
)

// DetachClusterHandler handles HTTP requests to detach a cluster
func DetachClusterHandler(c *gin.Context) {
	var req struct {
		ClusterName string `json:"clusterName" binding:"required"`
	}

	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload, clusterName is required"})
		return
	}

	clusterName := req.ClusterName
	if clusterName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cluster name is required"})
		return
	}

	// Check if the cluster exists in the OCM hub
	mutex.RLock()
	status, exists := clusterStatuses[clusterName]
	mutex.RUnlock()

	if !exists {
		// Check directly with the OCM hub
		itsContext := "its1" // Could be parameterized
		hubClientset, _, err := k8s.GetClientSetWithConfigContext(itsContext)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": fmt.Sprintf("Failed to connect to OCM hub: %v", err),
			})
			return
		}

		// Try to get the managed cluster resource
		result := hubClientset.RESTClient().Get().
			AbsPath("/apis/cluster.open-cluster-management.io/v1").
			Resource("managedclusters").
			Name(clusterName).
			Do(context.TODO())

		err = result.Error()
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error": fmt.Sprintf("Cluster '%s' not found in OCM hub", clusterName),
			})
			return
		}

		// Cluster exists in OCM but not in our status map
		log.Printf("Cluster '%s' found in OCM but not in status map, proceeding with detachment", clusterName)
	} else {
		log.Printf("Cluster '%s' status is %s, proceeding with detachment", clusterName, status)
	}

	// Start detaching the cluster
	mutex.Lock()
	clusterStatuses[clusterName] = "Detaching"
	mutex.Unlock()

	go func() {
		err := DetachCluster(clusterName)
		mutex.Lock()
		if err != nil {
			log.Printf("Cluster '%s' detachment failed: %v", clusterName, err)
			clusterStatuses[clusterName] = "DetachmentFailed"
		} else {
			log.Printf("Cluster '%s' detached successfully", clusterName)
			delete(clusterStatuses, clusterName) // Remove from map once detached
		}
		mutex.Unlock()
	}()

	c.JSON(http.StatusOK, gin.H{
		"message":           fmt.Sprintf("Cluster '%s' is being detached", clusterName),
		"status":            "Detaching",
		"logsEndpoint":      fmt.Sprintf("/clusters/detach/logs/%s", clusterName),
		"websocketEndpoint": fmt.Sprintf("/ws/detachment?cluster=%s", clusterName),
	})
}

// DetachCluster handles the process of detaching a cluster from the OCM hub
func DetachCluster(clusterName string) error {
	// Log the start of detachment
	LogOnboardingEvent(clusterName, "Detaching", "Starting cluster detachment process")

	// 1. Get the ITS hub context
	itsContext := "its1" // Could be parameterized
	LogOnboardingEvent(clusterName, "Connecting", "Connecting to ITS hub context: "+itsContext)

	// 2. Get clients for the hub
	hubClientset, _, err := k8s.GetClientSetWithConfigContext(itsContext)
	if err != nil {
		LogOnboardingEvent(clusterName, "Error", "Failed to get hub clientset: "+err.Error())
		return fmt.Errorf("failed to get hub clientset: %w", err)
	}
	LogOnboardingEvent(clusterName, "Connected", "Successfully connected to ITS hub")

	// 3. Check if the cluster exists
	LogOnboardingEvent(clusterName, "Checking", "Verifying cluster exists in OCM hub")
	exists, err := checkManagedClusterExists(hubClientset, clusterName)
	if err != nil {
		LogOnboardingEvent(clusterName, "Error", "Error checking if cluster exists: "+err.Error())
		return fmt.Errorf("error checking if cluster exists: %w", err)
	}
	if !exists {
		LogOnboardingEvent(clusterName, "NotFound", "Cluster not found in OCM hub")
		return fmt.Errorf("cluster '%s' not found in OCM hub", clusterName)
	}
	LogOnboardingEvent(clusterName, "Found", "Cluster found in OCM hub")

	// 4. Delete the managed cluster
	LogOnboardingEvent(clusterName, "Executing", "Executing detachment operation via Kubernetes API")
	if err := executeDetachCommand(itsContext, clusterName); err != nil {
		LogOnboardingEvent(clusterName, "Error", "Failed to execute detach operation: "+err.Error())
		return fmt.Errorf("failed to execute detach operation: %w", err)
	}
	LogOnboardingEvent(clusterName, "CommandExecuted", "Detach operation executed successfully")

	// 5. Wait for the cluster to be removed
	LogOnboardingEvent(clusterName, "Waiting", "Waiting for cluster to be removed from OCM hub")
	if err := waitForClusterRemoval(hubClientset, clusterName); err != nil {
		LogOnboardingEvent(clusterName, "Error", "Failed to confirm cluster removal: "+err.Error())
		return fmt.Errorf("failed to confirm cluster removal: %w", err)
	}
	LogOnboardingEvent(clusterName, "Removed", "Cluster removed from OCM hub")

	// 6. Log completion
	LogOnboardingEvent(clusterName, "Success", "Cluster detached successfully")
	return nil
}

// checkManagedClusterExists checks if a managed cluster exists in the OCM hub
func checkManagedClusterExists(clientset *kubernetes.Clientset, clusterName string) (bool, error) {
	result := clientset.RESTClient().Get().
		AbsPath("/apis/cluster.open-cluster-management.io/v1").
		Resource("managedclusters").
		Name(clusterName).
		Do(context.TODO())

	err := result.Error()
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

// executeDetachCommand executes the detachment operation using the Kubernetes SDK
func executeDetachCommand(itsContext, clusterName string) error {
	// Get the hub client
	hubClientset, _, err := k8s.GetClientSetWithConfigContext(itsContext)
	if err != nil {
		return fmt.Errorf("failed to get hub clientset: %w", err)
	}

	// Delete the managed cluster resource directly using the Kubernetes API
	result := hubClientset.RESTClient().Delete().
		AbsPath("/apis/cluster.open-cluster-management.io/v1").
		Resource("managedclusters").
		Name(clusterName).
		Do(context.TODO())

	if err := result.Error(); err != nil {
		return fmt.Errorf("failed to delete managed cluster: %w", err)
	}

	log.Printf("Successfully initiated deletion of managedcluster %s", clusterName)
	return nil
}

// waitForClusterRemoval waits for the cluster to be removed from the OCM hub
func waitForClusterRemoval(clientset *kubernetes.Clientset, clusterName string) error {
	timeout := time.After(5 * time.Minute)
	tick := time.Tick(10 * time.Second)

	for {
		select {
		case <-timeout:
			return fmt.Errorf("timeout waiting for cluster removal")
		case <-tick:
			exists, err := checkManagedClusterExists(clientset, clusterName)
			if err != nil {
				log.Printf("Error checking if cluster exists: %v", err)
				continue
			}
			if !exists {
				log.Printf("Cluster '%s' successfully removed from OCM hub", clusterName)
				return nil
			}
			log.Printf("Waiting for cluster '%s' to be removed...", clusterName)
		}
	}
}

// GetDetachmentLogsHandler returns all logs for a specific cluster's detachment process
func GetDetachmentLogsHandler(c *gin.Context) {
	clusterName := c.Param("cluster")
	if clusterName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cluster name is required"})
		return
	}

	// Get all events for this cluster
	events := GetOnboardingEvents(clusterName)

	// Get current status
	mutex.RLock()
	status, exists := clusterStatuses[clusterName]
	mutex.RUnlock()

	if !exists {
		// Check if we have logs even though the cluster is no longer in our status map
		if len(events) > 0 {
			c.JSON(http.StatusOK, gin.H{
				"clusterName": clusterName,
				"status":      "Detached", // Assume it was successfully detached if not in our map
				"logs":        events,
				"count":       len(events),
			})
			return
		}

		c.JSON(http.StatusNotFound, gin.H{"error": "No detachment data found for cluster"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"clusterName": clusterName,
		"status":      status,
		"logs":        events,
		"count":       len(events),
	})
}

// WebSocketClient represents a connected websocket client

// HandleDetachmentWebSocket handles websocket connections for detachment logs
func HandleDetachmentWebSocket(c *gin.Context) {
	clusterName := c.Query("cluster")
	if clusterName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cluster name is required"})
		return
	}

	// Upgrade the HTTP connection to a WebSocket connection
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection to WebSocket: %v", err)
		return
	}

	// Create a new client
	client := &WebSocketClient{
		Conn:      conn,
		ClusterID: clusterName,
	}

	// Register the client
	wsClientMutex.Lock()
	wsClients[clusterName] = append(wsClients[clusterName], client)
	wsClientMutex.Unlock()

	// Send all existing events immediately
	events := GetOnboardingEvents(clusterName)
	for _, event := range events {
		wsEvent := WebSocketEvent{
			Type:        "LOG",
			ClusterName: clusterName,
			Status:      event.Status,
			Message:     event.Message,
			Timestamp:   event.Timestamp,
		}
		err := client.Conn.WriteJSON(wsEvent)
		if err != nil {
			log.Printf("Error sending event over websocket: %v", err)
		}
	}

	// Get current status
	mutex.RLock()
	status, exists := clusterStatuses[clusterName]
	mutex.RUnlock()

	// Send status update
	statusEvent := WebSocketEvent{
		Type:        "STATUS",
		ClusterName: clusterName,
		Status:      status,
		Message:     fmt.Sprintf("Current status: %s", status),
		Timestamp:   time.Now(),
	}

	if !exists {
		// If we have logs but no status, the cluster might have been detached already
		if len(events) > 0 {
			statusEvent.Status = "Detached"
			statusEvent.Message = "Cluster has been detached"
		} else {
			statusEvent.Status = "Unknown"
			statusEvent.Message = "No detachment data found for cluster"
		}
	}

	err = client.Conn.WriteJSON(statusEvent)
	if err != nil {
		log.Printf("Error sending status event over websocket: %v", err)
	}

	// Start a goroutine to listen for close events
	go handleWebSocketClose(client)
}

// handleWebSocketClose handles the closing of a websocket connection
func handleWebSocketClose(client *WebSocketClient) {
	// Listen for close message
	for {
		_, _, err := client.Conn.ReadMessage()
		if err != nil {
			wsClientMutex.Lock()
			// Remove the client from the list
			clients := wsClients[client.ClusterID]
			for i, c := range clients {
				if c == client {
					wsClients[client.ClusterID] = append(clients[:i], clients[i+1:]...)
					break
				}
			}
			// If no more clients for this cluster, remove the entry
			if len(wsClients[client.ClusterID]) == 0 {
				delete(wsClients, client.ClusterID)
			}
			wsClientMutex.Unlock()

			// Close the connection
			client.Conn.Close()
			break
		}
	}
}

// BroadcastDetachmentEvent sends an event to all websocket clients for a specific cluster
func BroadcastDetachmentEvent(clusterName, status, message string) {
	event := WebSocketEvent{
		Type:        "LOG",
		ClusterName: clusterName,
		Status:      status,
		Message:     message,
		Timestamp:   time.Now(),
	}

	wsClientMutex.RLock()
	clients, exists := wsClients[clusterName]
	wsClientMutex.RUnlock()

	if !exists {
		return
	}

	// Send to all clients for this cluster
	for _, client := range clients {
		err := client.Conn.WriteJSON(event)
		if err != nil {
			log.Printf("Error sending event to client: %v", err)
			// Handle disconnects in a separate goroutine to avoid blocking
			go func(c *WebSocketClient) {
				c.Conn.Close()
			}(client)
		}
	}
}

// BroadcastStatusChange sends a status change event to all websocket clients for a specific cluster
func BroadcastStatusChange(clusterName, status string) {
	event := WebSocketEvent{
		Type:        "STATUS",
		ClusterName: clusterName,
		Status:      status,
		Message:     fmt.Sprintf("Status changed to: %s", status),
		Timestamp:   time.Now(),
	}

	wsClientMutex.RLock()
	clients, exists := wsClients[clusterName]
	wsClientMutex.RUnlock()

	if !exists {
		return
	}

	// Send to all clients for this cluster
	for _, client := range clients {
		err := client.Conn.WriteJSON(event)
		if err != nil {
			log.Printf("Error sending status change to client: %v", err)
		}
	}
}
