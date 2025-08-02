package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/log"
	"github.com/kubestellar/ui/backend/marketplace"
	"go.uber.org/zap"
)

func UploadPluginHandler(c *gin.Context) {
	// get form file
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
		log.LogError("error getting file from request", zap.String("error", err.Error()))
		return
	}

	defer file.Close()

	// get plugin key - e.g. monitor-plugin
	key := header.Filename

	// check the global manager
	manager := marketplace.GetGlobalMarketplaceManager()
	if manager == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Marketplace manager not initialized"})
		log.LogError("marketplace manager not initialized", zap.String("manager", "nil"))
		return
	}

	// upload to storage
	err = manager.Store.UploadFile(c.Request.Context(), key, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "unable to upload plugin file"})
		log.LogError("error uploading plugin file", zap.String("error", err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin uploaded successfully",
		"key":     key,
	})
}
