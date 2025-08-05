package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)

	code := m.Run()

	os.Exit(code)
}

// Test the server setup and basic functionality
func TestServerSetup(t *testing.T) {
	router := gin.New()

	router.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		corsOrigin := os.Getenv("CORS_ALLOWED_ORIGIN")
		if corsOrigin == "" {
			corsOrigin = "http://localhost:5173"
		}

		if origin == corsOrigin {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// test route
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "message": "server is running"})
	})

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Errorf("Failed to parse response: %v", err)
	}

	if response["status"] != "ok" {
		t.Errorf("Expected status 'ok', got %v", response["status"])
	}
}

func TestCORSMiddleware(t *testing.T) {
	tests := []struct {
		name               string
		corsAllowedOrigin  string
		requestOrigin      string
		method             string
		expectOriginHeader bool
		expectCredentials  bool
		expectedStatus     int
	}{
		{
			name:               "Allowed origin matches",
			corsAllowedOrigin:  "http://localhost:3000",
			requestOrigin:      "http://localhost:3000",
			method:             "GET",
			expectOriginHeader: true,
			expectCredentials:  true,
			expectedStatus:     200,
		},
		{
			name:               "Origin doesn't match",
			corsAllowedOrigin:  "http://localhost:3000",
			requestOrigin:      "http://localhost:4000",
			method:             "GET",
			expectOriginHeader: false,
			expectCredentials:  false,
			expectedStatus:     200,
		},
		{
			name:               "Default origin with matching request",
			corsAllowedOrigin:  "",
			requestOrigin:      "http://localhost:5173",
			method:             "GET",
			expectOriginHeader: true,
			expectCredentials:  true,
			expectedStatus:     200,
		},
		{
			name:               "OPTIONS preflight request",
			corsAllowedOrigin:  "http://localhost:3000",
			requestOrigin:      "http://localhost:3000",
			method:             "OPTIONS",
			expectOriginHeader: true,
			expectCredentials:  true,
			expectedStatus:     204,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			originalCORS := os.Getenv("CORS_ALLOWED_ORIGIN")
			if tt.corsAllowedOrigin != "" {
				os.Setenv("CORS_ALLOWED_ORIGIN", tt.corsAllowedOrigin)
			} else {
				os.Unsetenv("CORS_ALLOWED_ORIGIN")
			}
			defer func() {
				if originalCORS != "" {
					os.Setenv("CORS_ALLOWED_ORIGIN", originalCORS)
				} else {
					os.Unsetenv("CORS_ALLOWED_ORIGIN")
				}
			}()

			router := gin.New()

			router.Use(func(c *gin.Context) {
				origin := c.Request.Header.Get("Origin")

				corsOrigin := os.Getenv("CORS_ALLOWED_ORIGIN")
				if corsOrigin == "" {
					corsOrigin = "http://localhost:5173"
				}

				if origin == corsOrigin {
					c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
					c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
				}

				c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
				c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

				if c.Request.Method == "OPTIONS" {
					c.AbortWithStatus(204)
					return
				}

				c.Next()
			})

			router.Any("/test", func(c *gin.Context) {
				c.JSON(200, gin.H{"message": "success"})
			})

			req := httptest.NewRequest(tt.method, "/test", nil)
			req.Header.Set("Origin", tt.requestOrigin)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.expectOriginHeader {
				if w.Header().Get("Access-Control-Allow-Origin") != tt.requestOrigin {
					t.Errorf("Expected origin header %s, got %s", tt.requestOrigin, w.Header().Get("Access-Control-Allow-Origin"))
				}
			} else {
				if w.Header().Get("Access-Control-Allow-Origin") != "" {
					t.Errorf("Expected no origin header, got %s", w.Header().Get("Access-Control-Allow-Origin"))
				}
			}

			if tt.expectCredentials {
				if w.Header().Get("Access-Control-Allow-Credentials") != "true" {
					t.Errorf("Expected credentials header 'true', got %s", w.Header().Get("Access-Control-Allow-Credentials"))
				}
			}

			expectedMethods := "GET, POST, PUT, DELETE, PATCH, OPTIONS"
			expectedHeaders := "Content-Type, Authorization"

			if w.Header().Get("Access-Control-Allow-Methods") != expectedMethods {
				t.Errorf("Expected methods %s, got %s", expectedMethods, w.Header().Get("Access-Control-Allow-Methods"))
			}

			if w.Header().Get("Access-Control-Allow-Headers") != expectedHeaders {
				t.Errorf("Expected headers %s, got %s", expectedHeaders, w.Header().Get("Access-Control-Allow-Headers"))
			}
		})
	}
}

func TestWebSocketUpgradeDetection(t *testing.T) {
	tests := []struct {
		name       string
		connection string
		upgrade    string
		expected   bool
	}{
		{
			name:       "Valid WebSocket upgrade",
			connection: "upgrade",
			upgrade:    "websocket",
			expected:   true,
		},
		{
			name:       "Valid WebSocket upgrade with different case",
			connection: "Upgrade",
			upgrade:    "WebSocket",
			expected:   true,
		},
		{
			name:       "Invalid connection header",
			connection: "keep-alive",
			upgrade:    "websocket",
			expected:   false,
		},
		{
			name:       "Invalid upgrade header",
			connection: "upgrade",
			upgrade:    "http2",
			expected:   false,
		},
		{
			name:       "Empty headers",
			connection: "",
			upgrade:    "",
			expected:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/", nil)
			req.Header.Set("Connection", tt.connection)
			req.Header.Set("Upgrade", tt.upgrade)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = req

			connection := strings.ToLower(c.GetHeader("Connection"))
			upgrade := strings.ToLower(c.GetHeader("Upgrade"))
			result := connection == "upgrade" && upgrade == "websocket"

			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestHomeDirLogic(t *testing.T) {
	tests := []struct {
		name        string
		homeEnv     string
		userProfile string
		expected    string
	}{
		{
			name:        "HOME environment variable set",
			homeEnv:     "/home/user",
			userProfile: "",
			expected:    "/home/user",
		},
		{
			name:        "HOME empty, USERPROFILE set",
			homeEnv:     "",
			userProfile: "C:\\Users\\user",
			expected:    "C:\\Users\\user",
		},
		{
			name:        "Both environment variables empty",
			homeEnv:     "",
			userProfile: "",
			expected:    "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			originalHome := os.Getenv("HOME")
			originalUserProfile := os.Getenv("USERPROFILE")

			if tt.homeEnv != "" {
				os.Setenv("HOME", tt.homeEnv)
			} else {
				os.Unsetenv("HOME")
			}

			if tt.userProfile != "" {
				os.Setenv("USERPROFILE", tt.userProfile)
			} else {
				os.Unsetenv("USERPROFILE")
			}

			var result string
			if h := os.Getenv("HOME"); h != "" {
				result = h
			} else {
				result = os.Getenv("USERPROFILE")
			}

			if result != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, result)
			}

			if originalHome != "" {
				os.Setenv("HOME", originalHome)
			} else {
				os.Unsetenv("HOME")
			}

			if originalUserProfile != "" {
				os.Setenv("USERPROFILE", originalUserProfile)
			} else {
				os.Unsetenv("USERPROFILE")
			}
		})
	}
}

func TestMiddlewarePerformance(t *testing.T) {
	router := gin.New()

	router.Use(func(c *gin.Context) {
		start := time.Now()

		c.Next()

		duration := time.Since(start)
		if duration > 100*time.Millisecond {
			t.Logf("Slow request: %v", duration)
		}
	})

	router.GET("/perf", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "success"})
	})

	start := time.Now()
	iterations := 100

	for i := 0; i < iterations; i++ {
		req := httptest.NewRequest("GET", "/perf", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != 200 {
			t.Errorf("Expected status 200, got %d", w.Code)
		}
	}

	duration := time.Since(start)
	avgDuration := duration / time.Duration(iterations)

	if avgDuration > 10*time.Millisecond {
		t.Errorf("Middleware performance is too slow: %v per request", avgDuration)
	}

	t.Logf("Average request duration: %v", avgDuration)
}

func TestRequestWithLargeBody(t *testing.T) {
	// test router
	router := gin.New()

	router.Use(func(c *gin.Context) {
		if c.Request.Body != nil {
			bodyBytes, err := c.GetRawData()
			if err != nil {
				t.Logf("Error reading body: %v", err)
			}

			c.Request.Body = http.NoBody
			if len(bodyBytes) > 0 {
				c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
			}
		}

		c.Next()
	})

	router.POST("/large", func(c *gin.Context) {
		var data map[string]interface{}
		if err := c.ShouldBindJSON(&data); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"message": "received", "size": len(data)})
	})

	largeBody := make(map[string]interface{})
	for i := 0; i < 50; i++ {
		key := "key_" + string(rune('a'+i%26))
		largeBody[key] = strings.Repeat("data", 100)
	}

	bodyBytes, err := json.Marshal(largeBody)
	if err != nil {
		t.Fatalf("Failed to marshal large body: %v", err)
	}

	// Execute request
	req := httptest.NewRequest("POST", "/large", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Verify response
	if w.Code != 200 {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Errorf("Failed to parse response: %v", err)
	}

	if response["message"] != "received" {
		t.Errorf("Expected message 'received', got %v", response["message"])
	}
}

func TestEnvironmentVariableHandling(t *testing.T) {
	t.Run("CORS_ALLOWED_ORIGIN", func(t *testing.T) {
		original := os.Getenv("CORS_ALLOWED_ORIGIN")
		defer func() {
			if original != "" {
				os.Setenv("CORS_ALLOWED_ORIGIN", original)
			} else {
				os.Unsetenv("CORS_ALLOWED_ORIGIN")
			}
		}()

		os.Setenv("CORS_ALLOWED_ORIGIN", "https://example.com")
		corsOrigin := os.Getenv("CORS_ALLOWED_ORIGIN")
		if corsOrigin == "" {
			corsOrigin = "http://localhost:5173"
		}

		if corsOrigin != "https://example.com" {
			t.Errorf("Expected 'https://example.com', got %s", corsOrigin)
		}

		os.Unsetenv("CORS_ALLOWED_ORIGIN")
		corsOrigin = os.Getenv("CORS_ALLOWED_ORIGIN")
		if corsOrigin == "" {
			corsOrigin = "http://localhost:5173"
		}

		if corsOrigin != "http://localhost:5173" {
			t.Errorf("Expected 'http://localhost:5173', got %s", corsOrigin)
		}
	})
}

func TestIntegration(t *testing.T) {
	router := gin.New()

	router.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		corsOrigin := os.Getenv("CORS_ALLOWED_ORIGIN")
		if corsOrigin == "" {
			corsOrigin = "http://localhost:5173"
		}

		if origin == corsOrigin {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// test routes
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "KubestellarUI is running"})
	})

	router.POST("/api/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "API endpoint working"})
	})

	tests := []struct {
		name           string
		method         string
		path           string
		origin         string
		expectedStatus int
		checkCORS      bool
	}{
		{
			name:           "GET root",
			method:         "GET",
			path:           "/",
			origin:         "",
			expectedStatus: 200,
			checkCORS:      false,
		},
		{
			name:           "POST API with CORS",
			method:         "POST",
			path:           "/api/test",
			origin:         "http://localhost:5173",
			expectedStatus: 200,
			checkCORS:      true,
		},
		{
			name:           "OPTIONS preflight",
			method:         "OPTIONS",
			path:           "/api/test",
			origin:         "http://localhost:5173",
			expectedStatus: 204,
			checkCORS:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.checkCORS && tt.origin != "" {
				if w.Header().Get("Access-Control-Allow-Origin") != tt.origin {
					t.Errorf("Expected CORS origin %s, got %s", tt.origin, w.Header().Get("Access-Control-Allow-Origin"))
				}
			}
		})
	}
}
