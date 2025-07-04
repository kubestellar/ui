package deployment

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/telemetry"
	"github.com/kubestellar/ui/backend/wds"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Get deployment status by name
func GetDeploymentStatus(c *gin.Context) {
	clientset, err := wds.GetClientSetKubeConfig()
	startTime := time.Now()
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/wds/status", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Kubernetes client"})
		return
	}

	deploymentName := c.Query("name")
	if deploymentName == "" {
		telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/wds/status", "400").Inc()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Deployment name is required"})
		return
	}

	deployment, err := clientset.AppsV1().Deployments("default").Get(context.Background(), deploymentName, metav1.GetOptions{})
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/wds/status", "404").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to get deployment: %s", err)})
		return
	}

	status := deployment.Status
	telemetry.TotalHTTPRequests.WithLabelValues("GET", "/api/wds/status", "200").Inc()
	telemetry.HTTPRequestDuration.WithLabelValues("GET", "/api/wds/status").Observe(time.Since(startTime).Seconds())
	c.JSON(http.StatusOK, gin.H{
		"deployment":          deployment.Name,
		"readyReplicas":       status.ReadyReplicas,
		"availableReplicas":   status.AvailableReplicas,
		"unavailableReplicas": status.UnavailableReplicas,
		"updatedReplicas":     status.UpdatedReplicas,
	})
}
