package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/installer"
)

// CheckKubeStellarStatusHandler checks if KubeStellar is installed and returns status
func CheckKubeStellarStatusHandler(c *gin.Context) {
	status := installer.CheckKubeStellarStatus()
	c.JSON(http.StatusOK, status)
}
