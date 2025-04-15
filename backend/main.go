package main

import (
	"bytes"
	"io"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/routes"

	"github.com/kubestellar/ui/api"
	"go.uber.org/zap"
)

func main() {
	initLogger()
	router := gin.Default()

	router.Use(ZapMiddleware())
	log.Println("Debug: KubestellarUI application started")

	// CORS Middleware
	router.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		if origin == "http://localhost:5173" {
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

// Middleware to log additional request/response details in structured format
func ZapMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Capture Request Body
		var requestBody string
		if c.Request.Body != nil {
			bodyBytes, _ := io.ReadAll(c.Request.Body)
			requestBody = string(bodyBytes)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		// Process the request
		c.Next()

		// Capture Response Size
		responseSize := c.Writer.Size()

		// Capture Request Headers
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

		// Log errors separately in structured format
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
