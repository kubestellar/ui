package handlers

import (
	"encoding/json"
	"net/http"
	"os/exec"
	"time"

	"github.com/kubestellar/ui/telemetry"

	"github.com/gin-gonic/gin"
)

// CSR represents the structure of a single CertificateSigningRequest (simplified).
type CSR struct {
	Metadata struct {
		Name string `json:"name"`
	} `json:"metadata"`
	Status struct {
		Conditions []struct {
			Type   string `json:"type"`
			Status string `json:"status"`
		} `json:"conditions"`
	} `json:"status"`
}

// CSRList represents the overall structure returned by "kubectl get csr -o json".
type CSRList struct {
	Items []CSR `json:"items"`
}

func GetCSRsExecHandler(c *gin.Context) {
	cmd := exec.Command("kubectl", "get", "csr", "-o", "json")
	startTime := time.Now()
	output, err := cmd.Output()
	if err != nil {
		telemetry.InstrumentKubectlCommand(cmd, "get-csr", "none",)
		telemetry.HTTPErrorCounter.WithLabelValues("GET", "/clusters/watch-csr", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to run kubectl command: " + err.Error()})
		return
	}

	// Unmarshal the JSON output.
	var csrList CSRList
	if err := json.Unmarshal(output, &csrList); err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("GET", "/clusters/watch-csr", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse JSON output: " + err.Error()})
		return
	}
	telemetry.TotalHTTPRequests.WithLabelValues("GET", "/clusters/watch-csr", "200").Inc()
	telemetry.HTTPRequestDuration.WithLabelValues("GET", "/clusters/watch-csr").Observe(time.Since(startTime).Seconds())
	// Return the parsed list as JSON.
	c.JSON(http.StatusOK, csrList)
}
