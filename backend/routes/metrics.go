package routes

import (
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/api"
	"github.com/kubestellar/ui/backend/k8s"
	"github.com/kubestellar/ui/backend/redis"
)

// Application start time for uptime calculation
var startTime = time.Now()

// ComponentStatus represents the status of a system component
type ComponentStatus struct {
	Status      string    `json:"status"`
	LastChecked time.Time `json:"last_checked"`
	Error       string    `json:"error,omitempty"`
	Details     string    `json:"details,omitempty"`
}

// DeploymentStats represents deployment statistics
type DeploymentStats struct {
	GitHub GitHubStats `json:"github"`
	Helm   HelmStats   `json:"helm"`
	Total  int         `json:"total"`
}

// GitHubStats represents GitHub deployment statistics
type GitHubStats struct {
	Count   int `json:"count"`
	Webhook int `json:"webhook"`
	Manual  int `json:"manual"`
	Failed  int `json:"failed"`
}

// HelmStats represents Helm deployment statistics
type HelmStats struct {
	Count     int `json:"count"`
	Active    int `json:"active"`
	Failed    int `json:"failed"`
	Succeeded int `json:"succeeded"`
}

// SystemMetrics represents system-level metrics
type SystemMetrics struct {
	Timestamp  string                     `json:"timestamp"`
	Uptime     string                     `json:"uptime"`
	Version    string                     `json:"version"`
	Components map[string]ComponentStatus `json:"components"`
	Runtime    RuntimeMetrics             `json:"runtime"`
}

// RuntimeMetrics represents Go runtime metrics
type RuntimeMetrics struct {
	GoVersion   string `json:"go_version"`
	Goroutines  int    `json:"goroutines"`
	MemoryUsage string `json:"memory_usage"`
	CPUCount    int    `json:"cpu_count"`
	GCCycles    uint32 `json:"gc_cycles"`
	HeapObjects uint64 `json:"heap_objects"`
}

// setupMetricsRoutes registers metrics and monitoring routes
func setupMetricsRoutes(router *gin.Engine, apiGroup *gin.RouterGroup) {
	metrics := apiGroup.Group("/metrics")
	{
		// Deployment statistics
		metrics.GET("/deployments", getDeploymentMetrics)

		// System metrics
		metrics.GET("/system", getSystemMetrics)

		// Component health check
		metrics.GET("/health", getComponentHealth)

		// Detailed GitHub metrics
		metrics.GET("/github", getGitHubMetrics)

		// Detailed Helm metrics
		metrics.GET("/helm", getHelmMetrics)

		// Redis metrics
		metrics.GET("/redis", getRedisMetrics)

		// Kubernetes metrics
		metrics.GET("/kubernetes", getKubernetesMetrics)

		// Pod health metrics
		metrics.GET("/pod-health", api.GetPodHealthMetrics)

		// Cluster resource metrics (CPU/Memory usage)
		metrics.GET("/cluster-resources", k8s.GetClusterMetrics)
		metrics.GET("/cluster-resources/:context", k8s.GetClusterMetricsForContext)
	}
}

// getDeploymentMetrics returns comprehensive deployment statistics
func getDeploymentMetrics(c *gin.Context) {
	stats := DeploymentStats{
		GitHub: GitHubStats{},
		Helm:   HelmStats{},
		Total:  0,
	}

	// Get GitHub deployment statistics
	githubStats, err := getGitHubDeploymentStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get GitHub deployment stats",
			"details": err.Error(),
		})
		return
	}
	stats.GitHub = githubStats
	stats.Total += githubStats.Count

	// Get Helm deployment statistics
	helmStats, err := getHelmDeploymentStats()
	if err != nil {
		// Don't fail if Helm stats are unavailable, just log the error
		stats.Helm = HelmStats{Count: 0}
	} else {
		stats.Helm = helmStats
		stats.Total += helmStats.Count
	}

	c.JSON(http.StatusOK, gin.H{
		"stats":     stats,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// getGitHubDeploymentStats calculates GitHub deployment statistics
func getGitHubDeploymentStats() (GitHubStats, error) {
	stats := GitHubStats{}

	// Get GitHub deployments from ConfigMap
	deployments, err := k8s.GetGithubDeployments("its1")
	if err != nil {
		return stats, fmt.Errorf("failed to get GitHub deployments: %v", err)
	}

	stats.Count = len(deployments)

	// Analyze deployment types and status
	for _, deployment := range deployments {
		if deploymentMap, ok := deployment.(map[string]interface{}); ok {
			// Check if it's a webhook deployment
			if webhook, exists := deploymentMap["webhook"]; exists && webhook == true {
				stats.Webhook++
			} else {
				stats.Manual++
			}

			// Check deployment status (if available)
			if status, exists := deploymentMap["status"]; exists {
				if statusStr, ok := status.(string); ok && statusStr == "failed" {
					stats.Failed++
				}
			}
		}
	}

	return stats, nil
}

// getHelmDeploymentStats calculates Helm deployment statistics
func getHelmDeploymentStats() (HelmStats, error) {
	stats := HelmStats{}

	// Try to get Helm deployments from ConfigMap
	helmConfigMapName := "kubestellar-helm-deployments" // Adjust based on your actual ConfigMap name

	helmData, err := k8s.GetConfigMapData("its1", helmConfigMapName)
	if err != nil {
		return stats, fmt.Errorf("failed to get Helm deployment data: %v", err)
	}

	// Parse Helm deployments JSON
	if deploymentsJSON, exists := helmData["deployments"]; exists {
		var deployments []map[string]interface{}
		if err := json.Unmarshal([]byte(deploymentsJSON), &deployments); err != nil {
			return stats, fmt.Errorf("failed to parse Helm deployments: %v", err)
		}

		stats.Count = len(deployments)

		// Analyze Helm deployment status
		for _, deployment := range deployments {
			if status, exists := deployment["status"]; exists {
				switch status {
				case "deployed", "active":
					stats.Active++
				case "failed":
					stats.Failed++
				case "succeeded":
					stats.Succeeded++
				}
			}
		}
	}

	return stats, nil
}

// getSystemMetrics returns comprehensive system metrics
func getSystemMetrics(c *gin.Context) {
	// Get component statuses
	components := make(map[string]ComponentStatus)

	// Check Redis
	components["redis"] = checkRedisStatus()

	// Check Kubernetes
	components["kubernetes"] = checkKubernetesStatus()

	// Check GitHub API access (if configured)
	components["github_api"] = checkGitHubAPIStatus()

	// Get runtime metrics
	runtimeMetrics := getRuntimeMetrics()

	metrics := SystemMetrics{
		Timestamp:  time.Now().Format(time.RFC3339),
		Uptime:     time.Since(startTime).String(),
		Version:    "1.0.0", // You can make this configurable
		Components: components,
		Runtime:    runtimeMetrics,
	}

	c.JSON(http.StatusOK, metrics)
}

// checkRedisStatus checks Redis connectivity and returns status
func checkRedisStatus() ComponentStatus {
	status := ComponentStatus{
		LastChecked: time.Now(),
	}

	// Test Redis connection by trying to set and get a test value
	testKey := "health-check-" + fmt.Sprintf("%d", time.Now().Unix())

	if err := redis.SetRepoURL(testKey); err != nil {
		status.Status = "unhealthy"
		status.Error = err.Error()
		return status
	}

	if _, err := redis.GetRepoURL(); err != nil {
		status.Status = "unhealthy"
		status.Error = err.Error()
		return status
	}

	status.Status = "healthy"
	status.Details = "Redis connection successful"
	return status
}

// checkKubernetesStatus checks Kubernetes connectivity
func checkKubernetesStatus() ComponentStatus {
	status := ComponentStatus{
		LastChecked: time.Now(),
	}

	// Test Kubernetes connection by trying to get deployments
	if _, err := k8s.GetGithubDeployments("its1"); err != nil {
		status.Status = "unhealthy"
		status.Error = err.Error()
		return status
	}

	status.Status = "healthy"
	status.Details = "Kubernetes API accessible"
	return status
}

// checkGitHubAPIStatus checks GitHub API accessibility
func checkGitHubAPIStatus() ComponentStatus {
	status := ComponentStatus{
		LastChecked: time.Now(),
	}

	// Get GitHub token from Redis if available
	token, err := redis.GetGitToken()
	if err != nil || token == "" {
		status.Status = "not_configured"
		status.Details = "No GitHub token configured"
		return status
	}

	// Test GitHub API with a simple request
	// You could use a public repository or the configured repository
	testRepo := "https://github.com/octocat/Hello-World.git"
	_, err = api.FetchGitHubYAMLs(testRepo, "", "master", "", token)
	if err != nil {
		status.Status = "unhealthy"
		status.Error = err.Error()
		return status
	}

	status.Status = "healthy"
	status.Details = "GitHub API accessible"
	return status
}

// getRuntimeMetrics collects Go runtime metrics
func getRuntimeMetrics() RuntimeMetrics {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	return RuntimeMetrics{
		GoVersion:   runtime.Version(),
		Goroutines:  runtime.NumGoroutine(),
		MemoryUsage: fmt.Sprintf("%.2f MB", float64(m.Alloc)/1024/1024),
		CPUCount:    runtime.NumCPU(),
		GCCycles:    m.NumGC,
		HeapObjects: m.HeapObjects,
	}
}

// getComponentHealth returns detailed component health information
func getComponentHealth(c *gin.Context) {
	health := gin.H{
		"overall_status": "healthy",
		"timestamp":      time.Now().Format(time.RFC3339),
		"components":     gin.H{},
		"summary":        gin.H{},
	}

	// Check each component
	redisStatus := checkRedisStatus()
	k8sStatus := checkKubernetesStatus()
	githubStatus := checkGitHubAPIStatus()

	health["components"] = gin.H{
		"redis":      redisStatus,
		"kubernetes": k8sStatus,
		"github_api": githubStatus,
	}

	// Calculate overall health
	healthyComponents := 0
	totalComponents := 3

	if redisStatus.Status == "healthy" {
		healthyComponents++
	}
	if k8sStatus.Status == "healthy" {
		healthyComponents++
	}
	if githubStatus.Status == "healthy" || githubStatus.Status == "not_configured" {
		healthyComponents++ // not_configured is acceptable for GitHub
	}

	if healthyComponents < totalComponents {
		health["overall_status"] = "degraded"
	}
	if healthyComponents == 0 {
		health["overall_status"] = "unhealthy"
	}

	health["summary"] = gin.H{
		"healthy_components": healthyComponents,
		"total_components":   totalComponents,
		"health_percentage":  float64(healthyComponents) / float64(totalComponents) * 100,
	}

	statusCode := http.StatusOK
	if health["overall_status"] == "unhealthy" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, health)
}

// getGitHubMetrics returns detailed GitHub deployment metrics
func getGitHubMetrics(c *gin.Context) {
	stats, err := getGitHubDeploymentStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get GitHub metrics",
			"details": err.Error(),
		})
		return
	}

	// Get additional GitHub-specific information
	repoURL, _ := redis.GetRepoURL()
	branch, _ := redis.GetBranch()
	folderPath, _ := redis.GetFilePath()

	response := gin.H{
		"statistics": stats,
		"configuration": gin.H{
			"repo_url":    repoURL,
			"branch":      branch,
			"folder_path": folderPath,
		},
		"timestamp": time.Now().Format(time.RFC3339),
	}

	// Get recent deployments (last 10)
	if deployments, err := k8s.GetGithubDeployments("its1"); err == nil && len(deployments) > 0 {
		recentCount := 10
		if len(deployments) < recentCount {
			recentCount = len(deployments)
		}

		// Get the most recent deployments (assuming they're ordered by timestamp)
		response["recent_deployments"] = deployments[len(deployments)-recentCount:]
	}

	c.JSON(http.StatusOK, response)
}

// getHelmMetrics returns detailed Helm deployment metrics
func getHelmMetrics(c *gin.Context) {
	stats, err := getHelmDeploymentStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get Helm metrics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"statistics": stats,
		"timestamp":  time.Now().Format(time.RFC3339),
	})
}

// getRedisMetrics returns Redis-specific metrics
func getRedisMetrics(c *gin.Context) {
	status := checkRedisStatus()

	// Get Redis configuration information
	config := gin.H{}

	if repoURL, err := redis.GetRepoURL(); err == nil {
		config["repo_url"] = repoURL != ""
	}
	if folderPath, err := redis.GetFilePath(); err == nil {
		config["folder_path"] = folderPath
	}
	if branch, err := redis.GetBranch(); err == nil {
		config["branch"] = branch
	}
	if workloadLabel, err := redis.GetWorkloadLabel(); err == nil {
		config["workload_label"] = workloadLabel
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        status,
		"configuration": config,
		"timestamp":     time.Now().Format(time.RFC3339),
	})
}

// getKubernetesMetrics returns Kubernetes-specific metrics
func getKubernetesMetrics(c *gin.Context) {
	status := checkKubernetesStatus()

	// Try to get additional Kubernetes information
	metrics := gin.H{
		"status":    status,
		"timestamp": time.Now().Format(time.RFC3339),
	}

	// Get ConfigMap information
	configMaps := gin.H{}

	// Check GitHub ConfigMap
	if _, err := k8s.GetConfigMapData("its1", k8s.GitHubConfigMapName); err == nil {
		configMaps["github"] = "accessible"
	} else {
		configMaps["github"] = "not_found"
	}

	// Check Helm ConfigMap
	if _, err := k8s.GetConfigMapData("its1", k8s.HelmConfigMapName); err == nil {
		configMaps["helm"] = "accessible"
	} else {
		configMaps["helm"] = "not_found"
	}

	metrics["config_maps"] = configMaps

	c.JSON(http.StatusOK, metrics)
}
