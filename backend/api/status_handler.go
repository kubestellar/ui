package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/installer"
	"github.com/kubestellar/ui/telemetry"
)

// CheckKubeStellarStatusHandler checks if KubeStellar is installed and returns status
func CheckKubeStellarStatusHandler(c *gin.Context) {
	status := installer.CheckKubeStellarStatus()
	telemetry.TotalHTTPRequests.WithLabelValues("GET", "/api/kubestellar/status", "200").Inc()
	c.JSON(http.StatusOK, status)
}
