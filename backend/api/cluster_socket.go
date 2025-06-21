package api

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/kubestellar/ui/log"
	"go.uber.org/zap"
)

// WebSocket upgrader with improved configuration
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for testing
	},
	HandshakeTimeout: 10 * time.Second,
}

// OnboardingEvent represents a single event in the onboarding process
type OnboardingEvent struct {
	ClusterName string    `json:"clusterName"`
	Status      string    `json:"status"`
	Message     string    `json:"message"`
	Timestamp   time.Time `json:"timestamp"`
}

// Client represents a WebSocket client with context for cancellation
type Client struct {
	conn   *websocket.Conn
	ctx    context.Context
	cancel context.CancelFunc
	send   chan OnboardingEvent
}

// Global event storage and client management
var (
	onboardingEvents     = make(map[string][]OnboardingEvent)
	eventsMutex          sync.RWMutex
	onboardingClients    = make(map[string][]*Client)
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
	log.LogInfo(
		"Incoming WebSocket onboarding connection request",
		zap.String("cluster", clusterName),
		zap.String("remote_addr", c.ClientIP()),
	)

	// Upgrade the HTTP connection to a WebSocket connection
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.LogError("Failed to upgrade connection", zap.String("error", err.Error()))
		return
	}

	// Create client with context for cancellation
	ctx, cancel := context.WithCancel(context.Background())
	client := &Client{
		conn:   ws,
		ctx:    ctx,
		cancel: cancel,
		send:   make(chan OnboardingEvent, 256), // Buffer for events
	}

	// Register the WebSocket client for the specific cluster
	registerClient(clusterName, client)
	defer unregisterClient(clusterName, client)

	// Start goroutines for handling read/write
	go client.writePump()
	go client.readPump()

	// Send existing events for this cluster (if any)
	eventsMutex.RLock()
	events, exists := onboardingEvents[clusterName]
	eventsMutex.RUnlock()

	if exists {
		for _, event := range events {
			select {
			case client.send <- event:
			case <-ctx.Done():
				return
			default:
				log.LogInfo(
					"Client buffer full, dropping event for cluster",
					zap.String("cluster", clusterName),
				)
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

	select {
	case client.send <- currentStatusEvent:
	case <-ctx.Done():
		return
	}

	// Wait for context cancellation (connection close)
	<-ctx.Done()
}

// writePump handles writing messages to the WebSocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
		c.cancel()
	}()

	for {
		select {
		case event, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteJSON(event); err != nil {
				log.LogError("Failed to write JSON message", zap.String("error", err.Error()))
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.LogError("Failed to send ping", zap.String("error", err.Error()))
				return
			}

		case <-c.ctx.Done():
			log.LogInfo("Write pump context cancelled")
			return
		}
	}
}

// readPump handles reading messages from the WebSocket connection
func (c *Client) readPump() {
	defer func() {
		c.conn.Close()
		c.cancel()
	}()

	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		select {
		case <-c.ctx.Done():
			log.LogInfo("Read pump context cancelled")
			return
		default:
			_, _, err := c.conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.LogError("WebSocket read error", zap.String("error", err.Error()))
				}
				return
			}
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
	log.LogInfo(
		"Onboarding event logged",
		zap.String("cluster", clusterName),
		zap.String("status", status),
		zap.String("message", message),
	)

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
func registerClient(clusterName string, client *Client) {
	log.LogInfo("Registering Websocket client", zap.String("cluster", clusterName))
	clientsMutex.Lock()
	defer clientsMutex.Unlock()

	if _, exists := onboardingClients[clusterName]; !exists {
		onboardingClients[clusterName] = make([]*Client, 0)
	}
	onboardingClients[clusterName] = append(onboardingClients[clusterName], client)

	log.LogInfo("New WebSocket client registered for cluster", zap.String("cluster", clusterName))
}

func unregisterClient(clusterName string, client *Client) {
	log.LogInfo("Unregistering Websocket client", zap.String("cluster", clusterName))
	clientsMutex.Lock()
	defer clientsMutex.Unlock()

	if clients, exists := onboardingClients[clusterName]; exists {
		for i, c := range clients {
			if c == client {
				// Close the send channel
				close(c.send)
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

	log.LogInfo("WebSocket client unregistered for cluster", zap.String("cluster", clusterName))
	client.conn.Close()
}

func broadcastEvent(clusterName string, event OnboardingEvent) {
	log.LogInfo(
		"Broadcasting event",
		zap.String("cluster", clusterName),
		zap.Any("event", event),
	)
	clientsMutex.RLock()
	clients, exists := onboardingClients[clusterName]
	clientsMutex.RUnlock()

	if !exists || len(clients) == 0 {
		return
	}

	// Send to each client's channel (non-blocking)
	for _, client := range clients {
		select {
		case client.send <- event:
			// Event sent successfully
		case <-client.ctx.Done():
			// Client is disconnected, skip
		default:
			// Channel buffer is full, log and skip
			log.LogInfo("Client buffer full for cluster, dropping event", zap.String("cluster", clusterName))
		}
	}
}

// ClearOnboardingEvents clears all events for a specific cluster
func ClearOnboardingEvents(clusterName string) {
	log.LogInfo("Clearing all events for cluster", zap.String("cluster", clusterName))

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

// Health check endpoint for WebSocket connections
func WSHealthHandler(c *gin.Context) {
	log.LogInfo("Health checking for WebSocket connections")

	clientsMutex.RLock()
	totalClients := 0
	clusterCounts := make(map[string]int)

	for cluster, clients := range onboardingClients {
		activeClients := 0
		for _, client := range clients {
			select {
			case <-client.ctx.Done():
				// Client is disconnected
			default:
				activeClients++
			}
		}
		clusterCounts[cluster] = activeClients
		totalClients += activeClients
	}
	clientsMutex.RUnlock()

	c.JSON(http.StatusOK, gin.H{
		"totalClients":  totalClients,
		"clusterCounts": clusterCounts,
		"timestamp":     time.Now(),
	})
}
