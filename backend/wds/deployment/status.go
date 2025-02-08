package deployment

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Get deployment status by name
func GetDeploymentStatus(c *gin.Context) {
	clientset, err := getClientSetKubeConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Kubernetes client"})
		return
	}

	deploymentName := c.Query("name")
	if deploymentName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Deployment name is required"})
		return
	}

	deployment, err := clientset.AppsV1().Deployments("default").Get(context.Background(), deploymentName, metav1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to get deployment: %s", err)})
		return
	}

	status := deployment.Status
	c.JSON(http.StatusOK, gin.H{
		"deployment":          deployment.Name,
		"readyReplicas":       status.ReadyReplicas,
		"availableReplicas":   status.AvailableReplicas,
		"unavailableReplicas": status.UnavailableReplicas,
		"updatedReplicas":     status.UpdatedReplicas,
	})
}
