package service

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	_resources "github.com/kubestellar/ui/backend/namespace/resources"
	"github.com/stretchr/testify/assert"
)

func setupRouter() *gin.Engine {
	router := gin.Default()
	api := router.Group("/api")
	{
		api.POST("/namespaces", _resources.CreateNamespace)
		api.GET("/namespaces", _resources.GetAllNamespaces)
		api.GET("/namespaces/:name", _resources.GetNamespaceDetails)
		api.PUT("/namespaces/:name", _resources.UpdateNamespace)
		api.DELETE("/namespaces/:name", _resources.DeleteNamespace)
	}
	return router
}

func TestCreateNamespace_BadRequest(t *testing.T) {
	router := setupRouter()

	body := `{"invalid":`
	req, _ := http.NewRequest("POST", "/api/namespaces", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusBadRequest, resp.Code)
	assert.Contains(t, resp.Body.String(), "Invalid request body")
}

func TestUpdateNamespace_BadRequest(t *testing.T) {
	router := setupRouter()

	// Malformed JSON
	body := `{"labels": "not a map"}`
	req, _ := http.NewRequest("PUT", "/api/namespaces/test-ns", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusBadRequest, resp.Code)
	assert.Contains(t, resp.Body.String(), "Invalid request body")
}

func TestGetNamespaceDetails_NotFound(t *testing.T) {
	router := setupRouter()

	req, _ := http.NewRequest("GET", "/api/namespaces/nonexistent", nil)
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusNotFound, resp.Code)
	assert.Contains(t, resp.Body.String(), "Namespace not found")
}
