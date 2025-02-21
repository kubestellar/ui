package api

import (
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/katamyra/kubestellarUI/models"
	"github.com/katamyra/kubestellarUI/services"
	"github.com/katamyra/kubestellarUI/utils"
)

var (
	clusterStatuses = make(map[string]string)
	mutex           sync.Mutex
)

func OnboardClusterHandler(c *gin.Context) {
	file, err := c.FormFile("kubeconfig")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to retrieve kubeconfig file"})
		return
	}

	clusterName := c.PostForm("name")
	if clusterName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cluster name is required"})
		return
	}

	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open kubeconfig file"})
		return
	}
	defer f.Close()

	content, err := utils.ReadFileContent(f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read kubeconfig file"})
		return
	}

	clusterConfig, err := services.GetClusterConfigByName(content, clusterName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	mutex.Lock()
	if status, exists := clusterStatuses[clusterName]; exists {
		mutex.Unlock()
		c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Cluster '%s' is already onboarded (status: %s)", clusterName, status)})
		return
	}
	clusterStatuses[clusterName] = "Pending"
	mutex.Unlock()

	go func() {
		if err := services.ValidateClusterConnectivity(clusterConfig); err != nil {
			log.Printf("Cluster '%s' validation failed: %v", clusterName, err)
			mutex.Lock()
			clusterStatuses[clusterName] = "Failed"
			mutex.Unlock()
			return
		}

		mutex.Lock()
		clusterStatuses[clusterName] = "Onboarded"
		mutex.Unlock()

		log.Printf("Cluster '%s' onboarded successfully", clusterName)
	}()

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Cluster '%s' is being onboarded", clusterName)})
}

func GetClusterStatusHandler(c *gin.Context) {
	mutex.Lock()
	defer mutex.Unlock()

	var statuses []models.ClusterStatus
	for cluster, status := range clusterStatuses {
		statuses = append(statuses, models.ClusterStatus{
			ClusterName: cluster,
			Status:      status,
		})
	}

	c.JSON(http.StatusOK, statuses)
}

func ImportClusterHandler(c *gin.Context) {
	var cluster models.Cluster

	if err := c.ShouldBindJSON(&cluster); err != nil {
		log.Printf("Binding error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	if cluster.Name == "" || cluster.Region == "" || cluster.Node == "" {
		log.Printf("Validation error: missing required fields, cluster: %+v", cluster)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required cluster details"})
		return
	}

	services.ImportCluster(cluster)
	c.JSON(http.StatusAccepted, gin.H{"message": "Cluster import initiated"})
}
