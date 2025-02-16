package api

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/katamyra/kubestellarUI/models"
	"github.com/katamyra/kubestellarUI/services"
	"github.com/katamyra/kubestellarUI/utils"
)

var (
	clusterStatuses = make(map[string]string)
	statusMutex     sync.RWMutex
)

func OnboardClusterHandler(c *gin.Context) {
	// Get uploaded file
	file, err := c.FormFile("kubeconfig")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing kubeconfig file"})
		return
	}

	// Get cluster name
	clusterName := strings.TrimSpace(c.PostForm("name"))
	if clusterName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cluster name required"})
		return
	}

	// Read file content
	content, err := utils.ReadKubeconfigFile(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "File processing failed"})
		return
	}

	// Check existing status
	statusMutex.Lock()
	if status, exists := clusterStatuses[clusterName]; exists {
		statusMutex.Unlock()
		c.JSON(http.StatusConflict, gin.H{
			"error": fmt.Sprintf("Cluster '%s' already exists - %s", clusterName, status),
		})
		return
	}
	clusterStatuses[clusterName] = "validating"
	statusMutex.Unlock()

	// Start async processing
	go processClusterOnboarding(content, clusterName)

	c.JSON(http.StatusAccepted, gin.H{
		"message":    "Onboarding initiated",
		"cluster":    clusterName,
		"status_url": fmt.Sprintf("/api/clusters/status?cluster=%s", clusterName),
	})
}

func GetClusterStatusHandler(c *gin.Context) {
	statusMutex.RLock()
	defer statusMutex.RUnlock()

	clusterFilter := c.Query("cluster")
	var response []models.ClusterStatus

	if clusterFilter != "" {
		if status, exists := clusterStatuses[clusterFilter]; exists {
			response = append(response, models.ClusterStatus{
				ClusterName: clusterFilter,
				Status:      status,
			})
		}
	} else {
		for name, status := range clusterStatuses {
			response = append(response, models.ClusterStatus{
				ClusterName: name,
				Status:      status,
			})
		}
	}

	c.JSON(http.StatusOK, response)
}

func processClusterOnboarding(content []byte, clusterName string) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic during onboarding %s: %v", clusterName, r)
			updateStatus(clusterName, "failed: internal error")
		}
	}()

	log.Printf("Starting onboarding for cluster: %s", clusterName)

	// Parse and validate kubeconfig
	config, err := clientcmd.Load(content)
	if err != nil {
		log.Printf("Failed to parse kubeconfig for cluster %s: %v", clusterName, err)
		updateStatus(clusterName, "invalid kubeconfig")
		return
	}

	log.Printf("Successfully parsed kubeconfig for cluster: %s", clusterName)

	// Merge into main kubeconfig
	if err := services.MergeClusterConfig(config, clusterName); err != nil {
		log.Printf("Merge failed for cluster %s: %v", clusterName, err)
		updateStatus(clusterName, "merge failed")
		return
	}

	log.Printf("Successfully merged kubeconfig for cluster: %s", clusterName)

	// Validate cluster connectivity
	if err := services.ValidateClusterAccess(content); err != nil {
		log.Printf("Validation failed for cluster %s: %v", clusterName, err)
		updateStatus(clusterName, "connection failed")
		return
	}

	log.Printf("Cluster %s validation successful, onboarding complete", clusterName)
	updateStatus(clusterName, "active")
}

func updateStatus(clusterName, status string) {
	statusMutex.Lock()
	defer statusMutex.Unlock()
	clusterStatuses[clusterName] = status
}
