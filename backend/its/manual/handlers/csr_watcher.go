package handlers

import (
	"encoding/json"
	"net/http"
	"os/exec"

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
	output, err := cmd.Output()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to run kubectl command: " + err.Error()})
		return
	}

	// Unmarshal the JSON output.
	var csrList CSRList
	if err := json.Unmarshal(output, &csrList); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse JSON output: " + err.Error()})
		return
	}

	// Return the parsed list as JSON.
	c.JSON(http.StatusOK, csrList)
}
