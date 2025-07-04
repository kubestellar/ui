package nsresources

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/models"
	ns "github.com/kubestellar/ui/namespace"
	"github.com/kubestellar/ui/telemetry"
)

// createNamespace handles creating a new namespace
func CreateNamespace(c *gin.Context) {
	var namespace models.Namespace
	if err := c.ShouldBindJSON(&namespace); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	err := ns.CreateNamespace(namespace)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create namespace", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":   "Namespace created successfully",
		"namespace": namespace.Name,
	})
}

// getAllNamespaces retrieves all namespaces with their pods
func GetAllNamespaces(c *gin.Context) {
	namespaces, err := ns.GetAllNamespaces()
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/namespaces", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve namespaces", "details": err.Error()})
		return
	}
	telemetry.TotalHTTPRequests.WithLabelValues("GET", "/api/namespaces", "200").Inc()
	c.JSON(http.StatusOK, gin.H{"namespaces": namespaces})
}

// getNamespaceDetails retrieves detailed information about a specific namespace
func GetNamespaceDetails(c *gin.Context) {
	namespaceName := c.Param("name")

	details, err := ns.GetNamespaceResources(namespaceName)
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/namespaces/:name", "404").Inc()
		c.JSON(http.StatusNotFound, gin.H{"error": "Namespace not found", "details": err.Error()})
		return
	}
	telemetry.TotalHTTPRequests.WithLabelValues("GET", "/api/namespaces/:name", "200").Inc()
	c.JSON(http.StatusOK, details)
}

// updateNamespace handles updating labels of an existing namespace
func UpdateNamespace(c *gin.Context) {
	namespaceName := c.Param("name")

	var labelUpdate struct {
		Labels map[string]string `json:"labels"`
	}

	if err := c.ShouldBindJSON(&labelUpdate); err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("PUT", "/api/namespaces/:name", "400").Inc()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	err := ns.UpdateNamespace(namespaceName, labelUpdate.Labels)
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("PUT", "/api/namespaces/:name", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update namespace", "details": err.Error()})
		return
	}
	telemetry.TotalHTTPRequests.WithLabelValues("PUT", "/api/namespaces/:name", "200").Inc()
	c.JSON(http.StatusOK, gin.H{
		"message":   "Namespace updated successfully",
		"namespace": namespaceName,
		"labels":    labelUpdate.Labels,
	})
}

// deleteNamespace handles deleting a namespace
func DeleteNamespace(c *gin.Context) {
	namespaceName := c.Param("name")

	err := ns.DeleteNamespace(namespaceName)
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("DELETE", "/api/namespaces/:name", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete namespace", "details": err.Error()})
		return
	}
	telemetry.TotalHTTPRequests.WithLabelValues("DELETE", "/api/namespaces/:name", "200").Inc()
	c.JSON(http.StatusOK, gin.H{
		"message":   "Namespace deleted successfully",
		"namespace": namespaceName,
	})
}

// WebSocketHandler sends real-time updates on namespaces
func NamespaceWebSocketHandler(c *gin.Context) {
	ns.NamespaceWebSocketHandler(c.Writer, c.Request)
}
