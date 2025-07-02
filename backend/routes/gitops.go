package routes

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/api"
	"github.com/kubestellar/ui/k8s"
	"github.com/kubestellar/ui/telemetry"
	"github.com/kubestellar/ui/redis"
)

// SetupAllRoutes initializes all API routes
func SetupAllRoutes(router *gin.Engine) {
	// Setup all route groups
	setupHealthRoutes(router)
	setupGitopsRoutes(router)
	setupHelmRoutes(router)
	setupGitHubRoutes(router)
	setupDeploymentHistoryRoutes(router)
	setupWebhookRoutes(router)
	setupValidationRoutes(router)
	setupResourceRoutes(router)
	setupClusterRoutes(router)
	setupBindingPolicyRoutes(router)
}

// setupHealthRoutes registers health check and monitoring routes
func setupHealthRoutes(router *gin.Engine) {
	health := router.Group("/api/health")
	{
		// General health check
		health.GET("/", api.HealthCheckHandler)
		health.GET("/status", api.HealthCheckHandler)
	}
}

// setupGitopsRoutes registers general GitOps deployment routes
func setupGitopsRoutes(router *gin.Engine) {
	gitops := router.Group("/api")
	{
		// Main deployment endpoint
		gitops.POST("/deploy", api.DeployHandler)

		// Enhanced deployment endpoints
		gitops.GET("/deployments/status/:id", api.DeploymentStatusHandler)
		gitops.GET("/deployments/list", api.ListDeploymentsHandler)
		gitops.DELETE("/deployments/:id", api.DeleteDeploymentHandler)
	}
}

// setupHelmRoutes registers all Helm chart related routes
func setupHelmRoutes(router *gin.Engine) {
	helm := router.Group("/api/deployments/helm")
	{
		// Deployment routes
		helm.POST("/deploy", k8s.HelmDeployHandler)

		// Retrieval routes
		helm.GET("/list", k8s.ListHelmDeploymentsHandler)
		helm.GET("/:id", k8s.GetHelmDeploymentHandler)
		helm.GET("/namespace/:namespace", k8s.ListHelmDeploymentsByNamespaceHandler)
		helm.GET("/release/:release", k8s.ListHelmDeploymentsByReleaseHandler)

		// Management routes
		helm.DELETE("/:id", k8s.DeleteHelmDeploymentHandler)
	}

	// Legacy route for backward compatibility
	router.POST("/deploy/helm", k8s.HelmDeployHandler)
}

// setupGitHubRoutes registers all GitHub related routes
func setupGitHubRoutes(router *gin.Engine) {
	github := router.Group("/api/deployments/github")
	{
		// List deployments
		github.GET("/list", k8s.ListGithubDeployments)

		// Get specific deployment
		github.GET("/:id", func(c *gin.Context) {
			deploymentID := c.Param("id")
			deployments, err := k8s.GetGithubDeployments("its1")
			if err != nil {
				telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments/github/:id", "500").Inc()	
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "Failed to retrieve deployments",
					"details": err.Error(),
				})
				return
			}

			// Find specific deployment
			for _, deployment := range deployments {
				if deploymentMap, ok := deployment.(map[string]interface{}); ok {
					if id, exists := deploymentMap["id"]; exists && id == deploymentID {
						c.JSON(http.StatusOK, gin.H{
							"deployment": deploymentMap,
							"found":      true,
						})
						return
					}
				}
			}
			telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments/github/:id", "404").Inc()
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Deployment not found",
				"id":    deploymentID,
				"found": false,
			})
		})

		// Delete deployment
		github.DELETE("/:id", k8s.DeleteGitHubDeploymentHandler)

		// Filter routes
		github.GET("/webhook", func(c *gin.Context) {
			deployments, err := k8s.GetGithubDeployments("its1")
			if err != nil {
				telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments/github/webhook", "500").Inc()
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			var webhookDeployments []interface{}
			for _, deployment := range deployments {
				if deploymentMap, ok := deployment.(map[string]interface{}); ok {
					if webhook, exists := deploymentMap["webhook"]; exists && webhook == true {
						webhookDeployments = append(webhookDeployments, deployment)
					}
				}
			}
			telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments/github/webhook", "200").Inc()
			c.JSON(http.StatusOK, gin.H{
				"deployments": webhookDeployments,
				"count":       len(webhookDeployments),
				"type":        "webhook",
			})
		})

		github.GET("/manual", func(c *gin.Context) {
			deployments, err := k8s.GetGithubDeployments("its1")
			if err != nil {
				telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments/github/manual", "500").Inc()
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			var manualDeployments []interface{}
			for _, deployment := range deployments {
				if deploymentMap, ok := deployment.(map[string]interface{}); ok {
					if webhook, exists := deploymentMap["webhook"]; !exists || webhook != true {
						manualDeployments = append(manualDeployments, deployment)
					}
				}
			}
			telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments/github/manual", "200").Inc()
			c.JSON(http.StatusOK, gin.H{
				"deployments": manualDeployments,
				"count":       len(manualDeployments),
				"type":        "manual",
			})
		})
	}
}

// setupWebhookRoutes registers webhook related routes
func setupWebhookRoutes(router *gin.Engine) {
	webhook := router.Group("/api/webhooks")
	{
		// GitHub webhook endpoint
		webhook.POST("/github", api.GitHubWebhookHandler)

		// Webhook configuration endpoints
		webhook.GET("/config", func(c *gin.Context) {
			// Get current webhook configuration from Redis
			config := gin.H{}

			if repoURL, err := redis.GetRepoURL(); err == nil {
				config["repo_url"] = repoURL
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
			telemetry.TotalHTTPRequests.WithLabelValues("GET", "/api/webhooks/config", "200").Inc()
			c.JSON(http.StatusOK, gin.H{
				"webhook_config": config,
				"configured":     len(config) > 0,
			})
		})

		webhook.POST("/config", func(c *gin.Context) {
			var config struct {
				RepoURL       string `json:"repo_url" binding:"required"`
				FolderPath    string `json:"folder_path"`
				Branch        string `json:"branch"`
				WorkloadLabel string `json:"workload_label"`
				GitToken      string `json:"git_token"`
			}

			if err := c.ShouldBindJSON(&config); err != nil {
				telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/webhooks/config", "400").Inc()
				c.JSON(http.StatusBadRequest, gin.H{
					"error":   "Invalid configuration",
					"details": err.Error(),
				})
				return
			}

			// Set defaults
			if config.Branch == "" {
				config.Branch = "main"
			}

			// Save configuration to Redis
			errors := []string{}
			if err := redis.SetRepoURL(config.RepoURL); err != nil {
				errors = append(errors, fmt.Sprintf("repo_url: %v", err))
			}
			if err := redis.SetFilePath(config.FolderPath); err != nil {
				errors = append(errors, fmt.Sprintf("folder_path: %v", err))
			}
			if err := redis.SetBranch(config.Branch); err != nil {
				errors = append(errors, fmt.Sprintf("branch: %v", err))
			}
			if err := redis.SetWorkloadLabel(config.WorkloadLabel); err != nil {
				errors = append(errors, fmt.Sprintf("workload_label: %v", err))
			}
			if config.GitToken != "" {
				if err := redis.SetGitToken(config.GitToken); err != nil {
					errors = append(errors, fmt.Sprintf("git_token: %v", err))
				}
			}

			if len(errors) > 0 {
				telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/webhooks/config", "500").Inc()
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "Failed to save configuration",
					"details": errors,
				})
				return
			}
			telemetry.TotalHTTPRequests.WithLabelValues("POST", "/api/webhooks/config", "200").Inc()
			c.JSON(http.StatusOK, gin.H{
				"message": "Webhook configuration saved successfully",
				"config":  config,
			})
		})
	}
}

// setupValidationRoutes registers validation related routes
func setupValidationRoutes(router *gin.Engine) {
	validation := router.Group("/api/validate")
	{
		// Validate deployment configuration
		validation.POST("/config", api.ValidateConfigHandler)

		// Test repository access
		validation.POST("/repository", func(c *gin.Context) {
			var req struct {
				RepoURL    string `json:"repo_url" binding:"required"`
				FolderPath string `json:"folder_path"`
				Branch     string `json:"branch"`
				GitToken   string `json:"git_token"`
			}

			if err := c.ShouldBindJSON(&req); err != nil {
				telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/validate/repository", "400").Inc()
				c.JSON(http.StatusBadRequest, gin.H{
					"error":   "Invalid request",
					"details": err.Error(),
				})
				return
			}

			if req.Branch == "" {
				req.Branch = "main"
			}

			// Test repository access without deploying
			files, err := api.FetchGitHubYAMLs(req.RepoURL, req.FolderPath, req.Branch, "", req.GitToken)
			if err != nil {
				telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/validate/repository", "400").Inc()
				c.JSON(http.StatusBadRequest, gin.H{
					"valid":   false,
					"error":   "Repository access failed",
					"details": err.Error(),
				})
				return
			}
			telemetry.TotalHTTPRequests.WithLabelValues("POST", "/api/validate/repository", "200").Inc()
			c.JSON(http.StatusOK, gin.H{
				"valid":      true,
				"message":    "Repository access successful",
				"yaml_files": len(files),
				"files": func() []string {
					var fileList []string
					for path := range files {
						fileList = append(fileList, path)
					}
					return fileList
				}(),
			})
		})

		// Test Kubernetes connectivity
		validation.GET("/kubernetes", func(c *gin.Context) {
			_, err := k8s.GetGithubDeployments("its1")
			if err != nil {
				telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/validate/kubernetes", "503").Inc()
				c.JSON(http.StatusServiceUnavailable, gin.H{
					"valid":   false,
					"error":   "Kubernetes connectivity failed",
					"details": err.Error(),
				})
				return
			}
			telemetry.TotalHTTPRequests.WithLabelValues("GET", "/api/validate/kubernetes", "200").Inc()
			c.JSON(http.StatusOK, gin.H{
				"valid":   true,
				"message": "Kubernetes connectivity successful",
			})
		})

		// Test Redis connectivity
		validation.GET("/redis", func(c *gin.Context) {
			if err := redis.SetRepoURL("test-connection"); err != nil {
				telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/validate/redis", "503").Inc()
				c.JSON(http.StatusServiceUnavailable, gin.H{
					"valid":   false,
					"error":   "Redis connectivity failed",
					"details": err.Error(),
				})
				return
			}
			telemetry.TotalHTTPRequests.WithLabelValues("GET", "/api/validate/redis", "200").Inc()
			c.JSON(http.StatusOK, gin.H{
				"valid":   true,
				"message": "Redis connectivity successful",
			})
		})
	}
}

// setupDeploymentHistoryRoutes registers routes for deployment history
func setupDeploymentHistoryRoutes(router *gin.Engine) {
	history := router.Group("/api/deployments")
	{
		// GitHub config routes - for viewing stored deployment data
		history.GET("/github", func(c *gin.Context) {
			config, err := k8s.GetConfigMapData("its1", k8s.GitHubConfigMapName)
			if err != nil {
				telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments/github", "500").Inc()
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "Failed to get GitHub deployment data",
					"details": err.Error(),
				})
				return
			}
			telemetry.TotalHTTPRequests.WithLabelValues("GET", "/api/deployments/github", "200").Inc()
			c.JSON(http.StatusOK, gin.H{
				"config": config,
				"type":   "github",
			})
		})

		// Helm config routes - for viewing stored deployment data
		history.GET("/helm", func(c *gin.Context) {
			config, err := k8s.GetConfigMapData("its1", k8s.HelmConfigMapName)
			if err != nil {
				telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments/helm", "500").Inc()
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "Failed to get Helm deployment data",
					"details": err.Error(),
				})
				return
			}
			telemetry.TotalHTTPRequests.WithLabelValues("GET", "/api/deployments/helm", "200").Inc()
			c.JSON(http.StatusOK, gin.H{
				"config": config,
				"type":   "helm",
			})
		})

		// Manifests config routes - for viewing stored deployment data
		history.GET("/manifests", func(c *gin.Context) {
			config, err := k8s.GetConfigMapData("its1", "kubestellar-manifests")
			if err != nil {
				telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments/manifests", "500").Inc()
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "Failed to get manifests deployment data",
					"details": err.Error(),
				})
				return
			}
			telemetry.TotalHTTPRequests.WithLabelValues("GET", "/api/deployments/manifests", "200").Inc()
			c.JSON(http.StatusOK, gin.H{
				"config": config,
				"type":   "manifests",
			})
		})

		// Combined deployment history
		history.GET("/all", func(c *gin.Context) {
			result := gin.H{
				"github":    nil,
				"helm":      nil,
				"manifests": nil,
				"errors":    []string{},
			}

			// Get GitHub deployments
			if githubConfig, err := k8s.GetConfigMapData("its1", k8s.GitHubConfigMapName); err == nil {
				result["github"] = githubConfig
			} else {
				telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments/all", "500").Inc()
				result["errors"] = append(result["errors"].([]string), fmt.Sprintf("GitHub: %v", err))
			}

			// Get Helm deployments
			if helmConfig, err := k8s.GetConfigMapData("its1", k8s.HelmConfigMapName); err == nil {
				result["helm"] = helmConfig
			} else {
				telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments/all", "500").Inc()
				result["errors"] = append(result["errors"].([]string), fmt.Sprintf("Helm: %v", err))
			}

			// Get Manifests deployments
			if manifestsConfig, err := k8s.GetConfigMapData("its1", "kubestellar-manifests"); err == nil {
				result["manifests"] = manifestsConfig
			} else {
				telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments/all", "500").Inc()
				result["errors"] = append(result["errors"].([]string), fmt.Sprintf("Manifests: %v", err))
			}
			telemetry.TotalHTTPRequests.WithLabelValues("GET", "/api/deployments/all", "200").Inc()
			c.JSON(http.StatusOK, result)
		})
	}
}
