package api

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/kubestellar/ui/installer"
)

var upgrade = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// LogsWebSocketHandler handles WebSocket connections for real-time logs
func LogsWebSocketHandler(c *gin.Context) {
	installID := c.Param("id")

	// Check if installation ID exists
	if !installer.InstallationExists(installID) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Installation ID not found"})
		return
	}

	// Upgrade to WebSocket
	conn, err := upgrade.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Error upgrading to WebSocket: %v", err)
		return
	}
	defer conn.Close()

	// Send initial logs
	initialLogs, _ := installer.GetLogs(installID)
	lastLogIndex := len(initialLogs)

	if err := conn.WriteJSON(map[string]interface{}{
		"logs": initialLogs,
	}); err != nil {
		log.Printf("Error sending initial logs: %v", err)
		return
	}

	// Poll for new logs
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for range ticker.C {
		currentLogs, ok := installer.GetLogs(installID)
		if !ok {
			// Installation record no longer exists
			break
		}

		currentLen := len(currentLogs)
		if currentLen > lastLogIndex {
			newLogs := currentLogs[lastLogIndex:currentLen]
			lastLogIndex = currentLen

			if err := conn.WriteJSON(map[string]interface{}{
				"logs": newLogs,
			}); err != nil {
				log.Printf("Error sending log update: %v", err)
				return
			}
		}
	}
}
