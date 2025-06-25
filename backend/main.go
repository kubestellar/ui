package main

import (
	"bytes"
	"io"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/models"
	"github.com/kubestellar/ui/postgresql"
	"github.com/kubestellar/ui/routes"
	"github.com/kubestellar/ui/api"
	"go.uber.org/zap"
)

func main() {
	initLogger()
	
	// Initialize PostgreSQL connection
	if err := postgresql.Initialize(); err != nil {
		log.Fatalf("Failed to initialize PostgreSQL: %v", err)
	}
	
	// Create users table
	if err := models.CreateUsersTable(); err != nil {
		log.Fatalf("Failed to create users table: %v", err)
	}
	
	// Initialize default admin user
	if err := models.InitializeDefaultAdmin(); err != nil {
		log.Fatalf("Failed to initialize default admin user: %v", err)
	}
	
	router := gin.Default()

	router.Use(ZapMiddleware())
	log.Println("Debug: KubestellarUI application started")

	// CORS Middleware
	router.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		corsOrigin := os.Getenv("CORS_ALLOWED_ORIGIN")
		if corsOrigin == "" {
			corsOrigin = "http://localhost:5173" // default
		}

		// Fixed: Use the corsOrigin variable instead of hardcoded value
		if origin == corsOrigin {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true") // for cookies/auth
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	routes.SetupRoutes(router)
	router.POST("api/webhook", api.GitHubWebhookHandler)

	if err := router.Run(":4000"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

var logger *zap.Logger

// Initialize Zap Logger
func initLogger() {
	config := zap.NewProductionConfig()
	config.Encoding = "json"                // Ensure JSON format
	config.OutputPaths = []string{"stdout"} // Console output (can also log to a file)
	log, _ := config.Build()
	logger = log
}

// Helper function to detect WebSocket upgrade requests
func isWebSocketUpgrade(c *gin.Context) bool {
	return strings.ToLower(c.GetHeader("Connection")) == "upgrade" &&
		strings.ToLower(c.GetHeader("Upgrade")) == "websocket"
}

// Fixed Middleware to handle WebSocket connections properly
func ZapMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Check if this is a WebSocket upgrade request
		if isWebSocketUpgrade(c) {
			logger.Info("WebSocket Upgrade Request",
				zap.String("method", c.Request.Method),
				zap.String("path", c.Request.URL.Path),
				zap.String("ip", c.ClientIP()),
				zap.String("user-agent", c.Request.UserAgent()),
				zap.Any("query-params", c.Request.URL.Query()),
			)

			// Process the WebSocket upgrade
			c.Next()

			// Don't try to log response details for hijacked connections
			return
		}

		// Regular HTTP request handling
		var requestBody string
		if c.Request.Body != nil {
			bodyBytes, _ := io.ReadAll(c.Request.Body)
			requestBody = string(bodyBytes)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		// Process the request
		c.Next()

		// Only try to get response details if connection wasn't hijacked
		responseSize := c.Writer.Size()
		headers := c.Request.Header

		// Log in structured JSON format
		logger.Info("HTTP Request",
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.Int("status", c.Writer.Status()),
			zap.Duration("latency", time.Since(start)),
			zap.String("ip", c.ClientIP()),
			zap.String("user-agent", c.Request.UserAgent()),
			zap.Any("query-params", c.Request.URL.Query()),
			zap.String("request-body", requestBody),
			zap.Any("headers", headers),
			zap.Int("response-size", responseSize),
		)

		// Log errors separately for non-WebSocket requests
		if len(c.Errors) > 0 {
			for _, err := range c.Errors {
				logger.Error("Request Error",
					zap.String("method", c.Request.Method),
					zap.String("path", c.Request.URL.Path),
					zap.Int("status", c.Writer.Status()),
					zap.String("error", err.Error()),
				)
			}
		}
	}
}

func homeDir() string {
	if h := os.Getenv("HOME"); h != "" {
		return h
	}
	return os.Getenv("USERPROFILE") // windows
}
