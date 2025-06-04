package routes

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/wds"
)

func SetupBackupRoutes(router *gin.Engine) {
	// Backup plugin routes
	backupGroup := router.Group("/backup-plugin")
	{
		// List available backup files
		backupGroup.GET("/list", func(c *gin.Context) {
			files, err := wds.ListBackupFiles()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "Failed to list backup files",
					"details": err.Error(),
				})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"backup_files": files,
				"count":        len(files),
				"timestamp":    time.Now().Format(time.RFC3339),
			})
		})

		// Restore database from backup
		backupGroup.POST("/restore", func(c *gin.Context) {
			var restoreRequest struct {
				BackupFileName string `json:"backup_file_name" binding:"required"`
			}

			if err := c.ShouldBindJSON(&restoreRequest); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":   "Invalid request format",
					"details": err.Error(),
				})
				return
			}

			// Validate backup file name
			if restoreRequest.BackupFileName == "" {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "backup_file_name is required",
				})
				return
			}

			// Start restore job and get the actual job name
			jobName, err := wds.RestoreDatabase(restoreRequest.BackupFileName)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "Failed to start restore job",
					"details": err.Error(),
				})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"message":     "Database restore job started successfully",
				"job_name":    jobName,
				"backup_file": restoreRequest.BackupFileName,
				"status":      "started",
				"timestamp":   time.Now().Format(time.RFC3339),
			})
		})

		// Get restore job status
		backupGroup.GET("/restore/status/:jobName", func(c *gin.Context) {
			jobName := c.Param("jobName")

			if jobName == "" {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "job name is required",
				})
				return
			}

			status, err := wds.GetRestoreJobStatus(jobName)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "Failed to get restore job status",
					"details": err.Error(),
				})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"job_name":  jobName,
				"status":    status,
				"timestamp": time.Now().Format(time.RFC3339),
			})
		})

		// Emergency restore (with additional safety checks)
		backupGroup.POST("/emergency-restore", func(c *gin.Context) {
			var emergencyRequest struct {
				BackupFileName string `json:"backup_file_name" binding:"required"`
				ConfirmRestore bool   `json:"confirm_restore" binding:"required"`
				AdminToken     string `json:"admin_token" binding:"required"`
			}

			if err := c.ShouldBindJSON(&emergencyRequest); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":   "Invalid request format",
					"details": err.Error(),
				})
				return
			}

			// Additional safety checks for emergency restore
			if !emergencyRequest.ConfirmRestore {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "Emergency restore requires explicit confirmation",
				})
				return
			}

			// Note: In production, you should validate the admin token
			if emergencyRequest.AdminToken == "" {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Admin token required for emergency restore",
				})
				return
			}

			// Start emergency restore job and get the actual job name
			jobName, err := wds.RestoreDatabase(emergencyRequest.BackupFileName)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "Failed to start emergency restore job",
					"details": err.Error(),
				})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"message":     "Emergency database restore job started successfully",
				"job_name":    jobName,
				"backup_file": emergencyRequest.BackupFileName,
				"status":      "started",
				"warning":     "This will overwrite all existing data",
				"timestamp":   time.Now().Format(time.RFC3339),
			})
		})

		// Health check for backup system
		backupGroup.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status":    "healthy",
				"service":   "backup-plugin",
				"timestamp": time.Now().Format(time.RFC3339),
			})
		})
	}
}
