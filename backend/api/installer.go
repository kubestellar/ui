package api

import (
	"net/http"
	"runtime"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/installer"
	"github.com/kubestellar/ui/utils"
)

// InstallationRequest represents the installation request parameters
type InstallationRequest struct {
	Platform string `json:"platform"` // kind or k3d
}

// InstallationResponse represents the response after installation request
type InstallationResponse struct {
	Success      bool                 `json:"success"`
	InstallID    string               `json:"installId,omitempty"`
	Environment  map[string]string    `json:"environment,omitempty"`
	ErrorMessage string               `json:"errorMessage,omitempty"`
	Windows      *WindowsInstructions `json:"windows,omitempty"`
}

// WindowsInstructions represents instructions for Windows users
type WindowsInstructions struct {
	Steps       []string          `json:"steps"`
	Commands    []string          `json:"commands"`
	Links       map[string]string `json:"links"`
	Environment map[string]string `json:"environment"`
}

// CheckPrerequisitesHandler checks if all prerequisites are installed
func CheckPrerequisitesHandler(c *gin.Context) {
	response := installer.CheckAllPrerequisites()
	c.JSON(http.StatusOK, response)
}

// InstallHandler handles the KubeStellar installation request
func InstallHandler(c *gin.Context) {
	var req InstallationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Validate platform
	if req.Platform != "kind" && req.Platform != "k3d" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Platform must be 'kind' or 'k3d'"})
		return
	}

	// Handle Windows differently
	if runtime.GOOS == "windows" {
		handleWindowsInstall(c, req)
		return
	}

	// Generate an installation ID and start the installation
	installID := utils.GenerateInstallID()
	installer.InitializeLogStorage(installID)

	// Start installation in background
	go installer.InstallKubeStellar(installID, req.Platform)

	// Return response with install ID
	c.JSON(http.StatusOK, InstallationResponse{
		Success:   true,
		InstallID: installID,
	})
}

// GetLogsHandler returns the logs for a specific installation
func GetLogsHandler(c *gin.Context) {
	installID := c.Param("id")

	logs, ok := installer.GetLogs(installID)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "Installation ID not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":   installID,
		"logs": logs,
	})
}

// handleWindowsInstall provides instructions for Windows users
func handleWindowsInstall(c *gin.Context, req InstallationRequest) {
	windows := WindowsInstructions{
		Steps: []string{
			"1. Install WSL2 (Windows Subsystem for Linux)",
			"2. Install Ubuntu or another Linux distribution from the Microsoft Store",
			"3. Open your WSL terminal",
			"4. Install the required prerequisites",
			"5. Run the KubeStellar installation script",
		},
		Commands: []string{
			"sudo apt update && sudo apt upgrade -y",
			"curl -LO https://dl.k8s.io/release/v1.28.0/bin/linux/amd64/kubectl && sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl",
			"curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash",
			"curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh ./get-docker.sh",
			"[ -d ${HOME}/.kube ] || mkdir -p ${HOME}/.kube",
			"curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64 && chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind",
			"mkdir -p $HOME/ocm && curl -L https://raw.githubusercontent.com/open-cluster-management-io/clusteradm/main/install.sh | INSTALL_DIR=$HOME/ocm bash -s 0.10.1 && export PATH=$HOME/ocm:$PATH",
			"sudo bash <(curl -s https://raw.githubusercontent.com/kubestellar/kubeflex/main/scripts/install-kubeflex.sh) --ensure-folder /usr/local/bin --strip-bin",
			"bash <(curl -s https://raw.githubusercontent.com/kubestellar/kubestellar/refs/tags/v0.26.0/scripts/create-kubestellar-demo-env.sh) --platform " + req.Platform,
		},
		Links: map[string]string{
			"WSL Installation Guide":    "https://docs.microsoft.com/en-us/windows/wsl/install",
			"KubeStellar Documentation": "https://kubestellar.io/kubestellar/main/",
			"KubeFlex Documentation":    "https://github.com/kubestellar/kubeflex/blob/main/docs/users.md",
			"OCM Documentation":         "https://open-cluster-management.io/",
		},
		Environment: map[string]string{
			"PATH": "$HOME/ocm:$HOME/.kubeflex/bin:$PATH",
		},
	}

	// Send response
	c.JSON(http.StatusOK, InstallationResponse{
		Success: true,
		Windows: &windows,
	})
}

// getWindowsKubeflexInstructions provides kubeflex installation instructions for Windows
func getWindowsKubeflexInstructions() *WindowsInstructions {
	return &WindowsInstructions{
		Steps: []string{
			"1. Install WSL2 (Windows Subsystem for Linux)",
			"2. Install Ubuntu or another Linux distribution from the Microsoft Store",
			"3. Open your WSL terminal",
			"4. Install Kubeflex using one of the commands below",
		},
		Commands: []string{
			"# Option 1: Automatic installation script",
			"sudo bash <(curl -s https://raw.githubusercontent.com/kubestellar/kubeflex/main/scripts/install-kubeflex.sh) --ensure-folder /usr/local/bin --strip-bin",
			"",
			"# Option 2: Manual installation",
			"OS_ARCH=linux_amd64",
			"LATEST_RELEASE_URL=$(curl -H \"Accept: application/vnd.github.v3+json\" https://api.github.com/repos/kubestellar/kubeflex/releases/latest | jq -r '.assets[] | select(.name | test(\"'${OS_ARCH}'\")) | .browser_download_url')",
			"curl -LO $LATEST_RELEASE_URL",
			"tar xzvf $(basename $LATEST_RELEASE_URL)",
			"sudo install -o root -g root -m 0755 bin/kflex /usr/local/bin/kflex",
		},
		Links: map[string]string{
			"WSL Installation Guide": "https://docs.microsoft.com/en-us/windows/wsl/install",
			"KubeFlex Documentation": "https://github.com/kubestellar/kubeflex/blob/main/docs/users.md",
		},
		Environment: map[string]string{
			"PATH": "$HOME/.kubeflex/bin:$PATH",
		},
	}
}
