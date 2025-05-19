package api

import (
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// WebSocket upgrader
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for testing
	},
}

// OnboardingEvent represents a single event in the onboarding process
type OnboardingEvent struct {
	ClusterName string    `json:"clusterName"`
	Status      string    `json:"status"`
	Message     string    `json:"message"`
	Timestamp   time.Time `json:"timestamp"`
}

// Global event storage and client management
var (
	onboardingEvents     = make(map[string][]OnboardingEvent)
	eventsMutex          sync.RWMutex
	onboardingClients    = make(map[string][]*websocket.Conn)
	clientsMutex         sync.RWMutex
	onboardingInProgress = make(map[string]bool)
	onboardingMutex      sync.RWMutex
)

// WSOnboardingHandler handles WebSocket connections for streaming onboarding logs
func WSOnboardingHandler(c *gin.Context) {
	clusterName := c.Query("cluster")
	if clusterName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cluster name is required"})
		return
	}

	// Upgrade the HTTP connection to a WebSocket connection
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}

	// Register the WebSocket client for the specific cluster
	registerClient(clusterName, ws)
	defer unregisterClient(clusterName, ws)

	// Send existing events for this cluster (if any)
	eventsMutex.RLock()
	events, exists := onboardingEvents[clusterName]
	eventsMutex.RUnlock()

	if exists {
		for _, event := range events {
			if err := ws.WriteJSON(event); err != nil {
				log.Printf("Failed to send event: %v", err)
				break
			}
		}
	}

	// Send current status if available
	onboardingMutex.RLock()
	inProgress := onboardingInProgress[clusterName]
	onboardingMutex.RUnlock()

	currentStatus := "Unknown"
	if inProgress {
		currentStatus = "InProgress"
	} else if exists && len(events) > 0 {
		// Get status from the last event
		lastEvent := events[len(events)-1]
		currentStatus = lastEvent.Status
	}

	currentStatusEvent := OnboardingEvent{
		ClusterName: clusterName,
		Status:      currentStatus,
		Message:     "Current status",
		Timestamp:   time.Now(),
	}

	if err := ws.WriteJSON(currentStatusEvent); err != nil {
		log.Printf("Failed to send current status: %v", err)
	}

	// Keep the connection alive with periodic pings
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if err := ws.WriteControl(websocket.PingMessage, []byte{}, time.Now().Add(10*time.Second)); err != nil {
					log.Printf("WebSocket ping failed: %v", err)
					return
				}
			}
		}
	}()

	// Read loop to handle client messages (primarily for pings/pongs and detecting disconnects)
	for {
		_, _, err := ws.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket read error: %v", err)
			}
			break
		}
	}
}

// LogOnboardingEvent adds an event to the log and broadcasts it to all connected clients
func LogOnboardingEvent(clusterName, status, message string) {
	event := OnboardingEvent{
		ClusterName: clusterName,
		Status:      status,
		Message:     message,
		Timestamp:   time.Now(),
	}

	// Store the event
	eventsMutex.Lock()
	if _, exists := onboardingEvents[clusterName]; !exists {
		onboardingEvents[clusterName] = make([]OnboardingEvent, 0)
	}
	onboardingEvents[clusterName] = append(onboardingEvents[clusterName], event)
	eventsMutex.Unlock()

	// Also log to standard logger
	log.Printf("[%s] %s: %s", clusterName, status, message)

	// Broadcast to all connected clients for this cluster
	broadcastEvent(clusterName, event)
}

// RegisterOnboardingStart marks a cluster as being onboarded and logs the initial event
func RegisterOnboardingStart(clusterName string) {
	onboardingMutex.Lock()
	onboardingInProgress[clusterName] = true
	onboardingMutex.Unlock()

	LogOnboardingEvent(clusterName, "Started", "Onboarding process initiated")
}

// RegisterOnboardingComplete marks a cluster as finished onboarding and logs the completion event
func RegisterOnboardingComplete(clusterName string, err error) {
	onboardingMutex.Lock()
	delete(onboardingInProgress, clusterName)
	onboardingMutex.Unlock()

	if err != nil {
		LogOnboardingEvent(clusterName, "Failed", "Onboarding failed: "+err.Error())
	} else {
		LogOnboardingEvent(clusterName, "Completed", "Onboarding completed successfully")
	}
}

// Helper functions for client management
func registerClient(clusterName string, ws *websocket.Conn) {
	clientsMutex.Lock()
	defer clientsMutex.Unlock()

	if _, exists := onboardingClients[clusterName]; !exists {
		onboardingClients[clusterName] = make([]*websocket.Conn, 0)
	}
	onboardingClients[clusterName] = append(onboardingClients[clusterName], ws)

	log.Printf("New WebSocket client registered for cluster '%s'", clusterName)
}

func unregisterClient(clusterName string, ws *websocket.Conn) {
	clientsMutex.Lock()
	defer clientsMutex.Unlock()

	if clients, exists := onboardingClients[clusterName]; exists {
		for i, client := range clients {
			if client == ws {
				// Remove this client from the slice
				onboardingClients[clusterName] = append(clients[:i], clients[i+1:]...)
				break
			}
		}

		// If no more clients, clean up
		if len(onboardingClients[clusterName]) == 0 {
			delete(onboardingClients, clusterName)
		}
	}

	log.Printf("WebSocket client unregistered for cluster '%s'", clusterName)
	ws.Close()
}

func broadcastEvent(clusterName string, event OnboardingEvent) {
	clientsMutex.RLock()
	clients, exists := onboardingClients[clusterName]
	clientsMutex.RUnlock()

	if !exists || len(clients) == 0 {
		return
	}

	for _, client := range clients {
		if err := client.WriteJSON(event); err != nil {
			log.Printf("Failed to broadcast to client: %v", err)
			// Don't remove here to avoid concurrent map access
			// The client will be removed when the ping fails or connection closes
		}
	}
}

// ClearOnboardingEvents clears all events for a specific cluster
func ClearOnboardingEvents(clusterName string) {
	eventsMutex.Lock()
	defer eventsMutex.Unlock()

	delete(onboardingEvents, clusterName)
}

// GetOnboardingEvents returns all events for a specific cluster
func GetOnboardingEvents(clusterName string) []OnboardingEvent {
	eventsMutex.RLock()
	defer eventsMutex.RUnlock()

	if events, exists := onboardingEvents[clusterName]; exists {
		// Return a copy to avoid race conditions
		result := make([]OnboardingEvent, len(events))
		copy(result, events)
		return result
	}

	return []OnboardingEvent{}
}
