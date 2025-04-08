package installer

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Global variables for tracking installations and logs
var (
	installLogs     = make(map[string][]string)
	installLogsMux  sync.Mutex
	installationIDs = make(map[string]bool)
)

// InitializeLogStorage initializes log storage for a new installation
func InitializeLogStorage(installID string) {
	installLogsMux.Lock()
	defer installLogsMux.Unlock()

	installLogs[installID] = []string{}
	installationIDs[installID] = true
}

// AppendLog appends a line to the installation log
func AppendLog(installID, msg string) {
	installLogsMux.Lock()
	defer installLogsMux.Unlock()

	if logs, ok := installLogs[installID]; ok {
		timestamp := time.Now().Format("15:04:05")
		logLine := fmt.Sprintf("[%s] %s", timestamp, msg)
		installLogs[installID] = append(logs, logLine)
	}
}

// GetLogs returns the logs for a specific installation
func GetLogs(installID string) ([]string, bool) {
	installLogsMux.Lock()
	defer installLogsMux.Unlock()

	logs, ok := installLogs[installID]
	if !ok {
		return nil, false
	}

	// Return a copy to avoid concurrent modification issues
	logsCopy := make([]string, len(logs))
	copy(logsCopy, logs)
	return logsCopy, true
}

// InstallationExists checks if an installation ID exists
func InstallationExists(installID string) bool {
	installLogsMux.Lock()
	defer installLogsMux.Unlock()

	_, ok := installationIDs[installID]
	return ok
}

// InstallKubeStellar performs the KubeStellar installation
func InstallKubeStellar(installID, platform string) {
	AppendLog(installID, "Starting KubeStellar installation...")
	AppendLog(installID, fmt.Sprintf("Platform: %s", platform))

	// Check prerequisites first
	AppendLog(installID, "Checking prerequisites...")
	prereqsCheck := CheckAllPrerequisites()

	if !prereqsCheck.AllInstalled {
		missingTools := []string{}
		for _, prereq := range prereqsCheck.Prerequisites {
			if !prereq.Installed {
				missingTools = append(missingTools, prereq.Name)
			}
		}

		AppendLog(installID, fmt.Sprintf("Prerequisites check failed. Missing: %s", strings.Join(missingTools, ", ")))

	}

	// Run the installation script
	scriptURL := "https://raw.githubusercontent.com/kubestellar/kubestellar/refs/tags/v0.26.0/scripts/create-kubestellar-demo-env.sh"
	AppendLog(installID, fmt.Sprintf("Downloading installation script from %s", scriptURL))

	tempDir, err := os.MkdirTemp("", "kubestellar-install")
	if err != nil {
		AppendLog(installID, fmt.Sprintf("Failed to create temp directory: %v", err))
		return
	}
	defer os.RemoveAll(tempDir)

	scriptPath := filepath.Join(tempDir, "install.sh")
	if err := downloadFile(scriptURL, scriptPath); err != nil {
		AppendLog(installID, fmt.Sprintf("Failed to download script: %v", err))
		return
	}

	// Make script executable
	if err := os.Chmod(scriptPath, 0755); err != nil {
		AppendLog(installID, fmt.Sprintf("Failed to make script executable: %v", err))
		return
	}

	// Execute the script
	AppendLog(installID, "Executing installation script...")
	cmd := exec.Command("bash", scriptPath, "--platform", platform)

	// Capture output
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		AppendLog(installID, fmt.Sprintf("Failed to capture stdout: %v", err))
		return
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		AppendLog(installID, fmt.Sprintf("Failed to capture stderr: %v", err))
		return
	}

	if err := cmd.Start(); err != nil {
		AppendLog(installID, fmt.Sprintf("Failed to start script: %v", err))
		return
	}

	// Process output in real-time
	go processOutput(stdout, installID, false)
	go processOutput(stderr, installID, true)

	// Wait for completion
	if err := cmd.Wait(); err != nil {
		AppendLog(installID, fmt.Sprintf("Installation failed: %v", err))
		return
	}

	// Extract environment variables
	envVars := extractEnvironmentVariables(installID)
	AppendLog(installID, "Installation completed successfully")

	// Log environment variables
	AppendLog(installID, "Environment variables:")
	for k, v := range envVars {
		AppendLog(installID, fmt.Sprintf("%s=%s", k, v))
	}
}

// processOutput processes the command output stream
func processOutput(r io.Reader, installID string, isError bool) {
	scanner := bufio.NewScanner(r)
	prefix := ""
	if isError {
		prefix = "ERROR: "
	}

	for scanner.Scan() {
		line := scanner.Text()
		AppendLog(installID, prefix+line)
	}
}

// extractEnvironmentVariables extracts environment variables from the installation logs
func extractEnvironmentVariables(installID string) map[string]string {
	logs, _ := GetLogs(installID)

	envVars := make(map[string]string)
	//inEnvSection := false

	for _, line := range logs {
		if strings.Contains(line, "export ") {
			parts := strings.SplitN(line, "export ", 2)
			if len(parts) == 2 {
				envParts := strings.SplitN(parts[1], "=", 2)
				if len(envParts) == 2 {
					key := strings.TrimSpace(envParts[0])
					value := strings.Trim(strings.TrimSpace(envParts[1]), "\"'")
					envVars[key] = value
				}
			}
		}
	}

	return envVars
}

// downloadFile downloads a file from a URL
func downloadFile(url, filepath string) error {
	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Make the request
	resp, err := client.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	// Create the file
	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	// Write the body to file
	_, err = io.Copy(out, resp.Body)
	return err
}
