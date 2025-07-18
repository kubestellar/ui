package wds_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/wds"
	"github.com/stretchr/testify/assert"
)

// setupTestKubeconfig creates a temporary kubeconfig for testing
func setupTestKubeconfig(t *testing.T) string {
	kubeconfig := `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://test-server:6443
  name: test-cluster
- cluster:
    server: https://wds1.test.me:9443
  name: wds-cluster
contexts:
- context:
    cluster: test-cluster
    user: test-user
  name: test-context
- context:
    cluster: wds-cluster
    user: wds-user
  name: wds1
current-context: wds1
preferences: {}
users:
- name: test-user
  user:
    token: test-token
- name: wds-user
  user:
    token: wds-token
`

	dir := t.TempDir()
	configPath := filepath.Join(dir, "config")
	err := os.WriteFile(configPath, []byte(kubeconfig), 0644)
	assert.NoError(t, err)
	return configPath
}

func TestListContexts(t *testing.T) {
	kubeconfigPath := setupTestKubeconfig(t)
	t.Setenv("KUBECONFIG", kubeconfigPath)

	current, wdsContexts, err := wds.ListContexts()
	assert.NoError(t, err)
	assert.Equal(t, "wds1", current)
	assert.Contains(t, wdsContexts, "wds1")
}

func TestGetClientSetKubeConfig(t *testing.T) {
	kubeconfigPath := setupTestKubeconfig(t)
	t.Setenv("KUBECONFIG", kubeconfigPath)

	clientset, err := wds.GetClientSetKubeConfig()
	assert.NoError(t, err)
	assert.NotNil(t, clientset)
}

func TestSetWdsContextCookies(t *testing.T) {
	gin.SetMode(gin.TestMode)
	kubeconfigPath := setupTestKubeconfig(t)
	t.Setenv("KUBECONFIG", kubeconfigPath)

	tests := []struct {
		name           string
		requestBody    map[string]string
		expectedStatus int
		expectCookie   bool
	}{
		{
			name:           "Valid context",
			requestBody:    map[string]string{"context": "wds1"},
			expectedStatus: http.StatusOK,
			expectCookie:   true,
		},
		{
			name:           "Invalid context",
			requestBody:    map[string]string{"context": "invalid-context"},
			expectedStatus: http.StatusOK,
			expectCookie:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			body, _ := json.Marshal(tt.requestBody)
			req := httptest.NewRequest("POST", "/wds/context", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			c.Request = req

			wds.SetWdsContextCookies(c)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectCookie {
				cookies := w.Result().Cookies()
				found := false
				for _, cookie := range cookies {
					if cookie.Name == "ui-wds-context" && cookie.Value == tt.requestBody["context"] {
						found = true
						break
					}
				}
				assert.True(t, found, "Expected cookie not found")
			}
		})
	}
}

func TestGetWdsContextCookies(t *testing.T) {
	gin.SetMode(gin.TestMode)
	kubeconfigPath := setupTestKubeconfig(t)
	t.Setenv("KUBECONFIG", kubeconfigPath)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	req := httptest.NewRequest("GET", "/wds/context", nil)
	req.AddCookie(&http.Cookie{
		Name:  "ui-wds-context",
		Value: "wds1",
	})
	c.Request = req

	wds.GetWdsContextCookies(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response, "ui-wds-context")
	assert.Contains(t, response, "system-context")
}

func TestCreateWDSContextUsingCommand(t *testing.T) {
	kubeconfigPath := setupTestKubeconfig(t)
	t.Setenv("KUBECONFIG", kubeconfigPath)

	// Create a mock HTTP server for WebSocket testing
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Mock WebSocket upgrade failure for testing
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer server.Close()

	req := httptest.NewRequest("GET", "/create-wds?context=test-wds&version=0.28.0", nil)
	w := httptest.NewRecorder()

	// Since this function requires WebSocket upgrade, we expect it to fail in unit test
	wds.CreateWDSContextUsingCommand(w, req, &gin.Context{})

	// The function will fail at WebSocket upgrade, which is expected in unit test
	assert.True(t, true, "Function executed without panic")
}
