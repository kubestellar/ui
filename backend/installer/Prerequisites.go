package installer

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"

	"github.com/blang/semver/v4"
)

// PrerequisiteStatus represents the status of a prerequisite
type PrerequisiteStatus struct {
	Name         string `json:"name"`
	Installed    bool   `json:"installed"`
	Version      string `json:"version"`
	Required     string `json:"required"`
	InstallGuide string `json:"installGuide,omitempty"`
}

// ArchitectureStatus represents CPU architecture compatibility status
type ArchitectureStatus struct {
	Current     string   `json:"current"`
	Supported   []string `json:"supported"`
	Compatible  bool     `json:"compatible"`
	Description string   `json:"description,omitempty"`
}

// PrerequisitesResponse represents the response for prerequisites check
type PrerequisitesResponse struct {
	Prerequisites []PrerequisiteStatus `json:"prerequisites"`
	AllInstalled  bool                 `json:"allInstalled"`
	OS            string               `json:"os"`
	Architecture  ArchitectureStatus   `json:"architecture"`
	SysctlChecks  []SysctlStatus       `json:"sysctlChecks,omitempty"`
}

// SysctlStatus represents the status of a sysctl check
type SysctlStatus struct {
	Name     string `json:"name"`
	Current  int    `json:"current"`
	Required int    `json:"required"`
	Valid    bool   `json:"valid"`
}

// CheckAllPrerequisites checks all required prerequisites
func CheckAllPrerequisites() PrerequisitesResponse {
	prereqs := []struct {
		name         string
		command      string
		args         []string
		versionArgs  []string
		required     string
		installGuide string
		extractor    func(string) string
	}{
		{
			name:         "Docker",
			command:      "docker",
			args:         []string{"--version"},
			versionArgs:  []string{"--version"},
			required:     "20.0.0",
			installGuide: "https://docs.docker.com/engine/install/",
			extractor:    extractDockerVersion,
		},
		{
			name:         "kubectl",
			command:      "kubectl",
			args:         []string{"version", "--client"},
			versionArgs:  []string{"version", "--client", "-o=json"},
			required:     "1.27.0",
			installGuide: "https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/",
			extractor:    extractKubectlVersion,
		},
		{
			name:         "Kubeflex",
			command:      "kflex",
			args:         []string{"version"},
			versionArgs:  []string{"version"},
			required:     "0.8.0",
			installGuide: "https://github.com/kubestellar/kubeflex",
			extractor:    extractKflexVersion,
		},
		{
			name:         "OCM CLI",
			command:      "clusteradm",
			args:         []string{"version"},
			versionArgs:  []string{"version"},
			required:     "0.7.0",
			installGuide: "https://raw.githubusercontent.com/open-cluster-management-io/clusteradm/main/install.sh",
			extractor:    extractClusteradmVersion,
		},
		{
			name:         "Helm",
			command:      "helm",
			args:         []string{"version"},
			versionArgs:  []string{"version", "--template={{.Version}}"},
			required:     "3.0.0",
			installGuide: "https://helm.sh/docs/intro/install/",
			extractor:    extractHelmVersion,
		},
		{
			name:         "Kind",
			command:      "kind",
			args:         []string{"version"},
			versionArgs:  []string{"version"},
			required:     "0.20.0",
			installGuide: "https://kind.sigs.k8s.io/docs/user/quick-start/#installation",
			extractor:    extractKindVersion,
		},
		{
			name:         "k3d",
			command:      "k3d",
			args:         []string{"--version"},
			versionArgs:  []string{"--version"},
			required:     "5.0.0",
			installGuide: "https://k3d.io/#installation",
			extractor:    extractK3dVersion,
		},
		{
			name:         "ArgoCD CLI",
			command:      "argocd",
			args:         []string{"version", "--client"},
			versionArgs:  []string{"version", "--short", "--client"},
			required:     "2.0.0",
			installGuide: "https://argo-cd.readthedocs.io/en/stable/cli_installation/",
			extractor:    extractArgoCDVersion,
		},
		{
			name:         "Go",
			command:      "go",
			args:         []string{"version"},
			versionArgs:  []string{"version"},
			required:     "1.21.0",
			installGuide: "https://go.dev/doc/install",
			extractor:    extractGoVersion,
		},
		{
			name:         "KO",
			command:      "ko",
			args:         []string{"version"},
			versionArgs:  []string{"version"},
			required:     "0.15.0",
			installGuide: "https://ko.build/install/",
			extractor:    extractKoVersion,
		},
		{
			name:         "Make",
			command:      "make",
			args:         []string{"--version"},
			versionArgs:  []string{"--version"},
			required:     "3.5.0",
			installGuide: "Use package manager: apt-get install make / brew install make",
			extractor:    extractMakeVersion,
		},
		{
			name:         "jq",
			command:      "jq",
			args:         []string{"--version"},
			versionArgs:  []string{"--version"},
			required:     "1.5",
			installGuide: "https://jqlang.github.io/jq/download/",
			extractor:    extractJqVersion,
		},
		{
			name:         "yq",
			command:      "yq",
			args:         []string{"--version"},
			versionArgs:  []string{"--version"},
			required:     "4.0.0",
			installGuide: "brew install yq or snap install yq",
			extractor:    extractYqVersion,
		},
	}

	// Check architecture compatibility
	archStatus := checkArchitecture()

	response := PrerequisitesResponse{
		Prerequisites: make([]PrerequisiteStatus, 0, len(prereqs)),
		AllInstalled:  true,
		OS:            runtime.GOOS,
		Architecture:  archStatus,
	}

	// If architecture is not compatible, mark all installed as false
	if !archStatus.Compatible {
		response.AllInstalled = false
	}

	for _, prereq := range prereqs {
		status := checkPrerequisite(prereq.name, prereq.command, prereq.args, prereq.versionArgs, prereq.required, prereq.installGuide, prereq.extractor)
		response.Prerequisites = append(response.Prerequisites, status)
		if !status.Installed {
			response.AllInstalled = false
		}
	}

	// Check sysctl values if docker is available
	if CheckCommand("docker", "run", "--rm", "busybox", "echo", "test") {
		response.SysctlChecks = checkSysctlValues()
		for _, sysctl := range response.SysctlChecks {
			if !sysctl.Valid {
				response.AllInstalled = false
			}
		}
	}

	return response
}

// checkArchitecture verifies if the current CPU architecture is supported
func checkArchitecture() ArchitectureStatus {
	currentArch := runtime.GOARCH

	// Define supported architectures for KubeStellar
	supportedArchs := []string{"amd64", "x86_64", "arm64"}

	// Check if current architecture is supported
	isCompatible := false
	for _, arch := range supportedArchs {
		if currentArch == arch ||
			(currentArch == "amd64" && arch == "x86_64") ||
			(currentArch == "x86_64" && arch == "amd64") {
			isCompatible = true
			break
		}
	}

	description := ""
	if !isCompatible {
		description = fmt.Sprintf("KubeStellar requires one of these CPU architectures: %s. Your current architecture (%s) is not supported.",
			strings.Join(supportedArchs, ", "), currentArch)
	}

	return ArchitectureStatus{
		Current:     currentArch,
		Supported:   supportedArchs,
		Compatible:  isCompatible,
		Description: description,
	}
}

// checkPrerequisite checks if a specific prerequisite is installed and valid
func checkPrerequisite(name, command string, args []string, versionArgs []string, required string, installGuide string, extractor func(string) string) PrerequisiteStatus {
	// Check if command exists
	if !CheckCommand(command, args...) {
		return PrerequisiteStatus{
			Name:         name,
			Installed:    false,
			Version:      "",
			Required:     required,
			InstallGuide: installGuide,
		}
	}

	// Get version information
	cmd := exec.Command(command, versionArgs...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return PrerequisiteStatus{
			Name:         name,
			Installed:    true, // Command exists but version check failed
			Version:      "unknown",
			Required:     required,
			InstallGuide: installGuide,
		}
	}

	rawOutput := string(output)
	version := extractor(rawOutput)

	// Compare with required version
	isValid := compareVersions(version, required)

	return PrerequisiteStatus{
		Name:         name,
		Installed:    isValid,
		Version:      version,
		Required:     required,
		InstallGuide: installGuide,
	}
}

// CheckCommand checks if a command is available
func CheckCommand(name string, args ...string) bool {
	cmd := exec.Command(name, args...)
	return cmd.Run() == nil
}

// compareVersions checks if the actual version satisfies the required constraint
func compareVersions(actual string, required string) bool {
	if actual == "" {
		return false
	}

	// Try to parse as semver
	actualVer, err1 := semver.Parse(strings.TrimPrefix(actual, "v"))
	requiredVer, err2 := semver.Parse(required)

	if err1 != nil || err2 != nil {
		// For non-semver versions, do a string comparison
		return actual >= required
	}

	return actualVer.GTE(requiredVer)
}

// checkSysctlValues checks sysctl values important for running containers
func checkSysctlValues() []SysctlStatus {
	sysctls := []struct {
		name     string
		minValue int
	}{
		{"fs.inotify.max_user_watches", 524288},
		{"fs.inotify.max_user_instances", 512},
	}

	results := make([]SysctlStatus, 0, len(sysctls))

	for _, sysctl := range sysctls {
		cmd := exec.Command("docker", "run", "--rm", "busybox", "sysctl", sysctl.name)
		output, err := cmd.CombinedOutput()
		if err != nil {
			results = append(results, SysctlStatus{
				Name:     sysctl.name,
				Current:  0,
				Required: sysctl.minValue,
				Valid:    false,
			})
			continue
		}

		parts := strings.Split(strings.TrimSpace(string(output)), "=")
		if len(parts) < 2 {
			results = append(results, SysctlStatus{
				Name:     sysctl.name,
				Current:  0,
				Required: sysctl.minValue,
				Valid:    false,
			})
			continue
		}

		currentVal, err := strconv.Atoi(strings.TrimSpace(parts[1]))
		if err != nil {
			results = append(results, SysctlStatus{
				Name:     sysctl.name,
				Current:  0,
				Required: sysctl.minValue,
				Valid:    false,
			})
			continue
		}

		results = append(results, SysctlStatus{
			Name:     sysctl.name,
			Current:  currentVal,
			Required: sysctl.minValue,
			Valid:    currentVal >= sysctl.minValue,
		})
	}

	return results
}

// Version extractors for different tools

func extractDockerVersion(output string) string {
	re := regexp.MustCompile(`Docker version (\d+\.\d+\.\d+)`)
	match := re.FindStringSubmatch(output)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}

func extractKubectlVersion(output string) string {
	var result map[string]interface{}
	err := json.Unmarshal([]byte(output), &result)
	if err != nil {
		// Try regex fallback
		re := regexp.MustCompile(`GitVersion:"v(\d+\.\d+\.\d+)"`)
		match := re.FindStringSubmatch(output)
		if len(match) > 1 {
			return match[1]
		}
		return ""
	}

	clientInfo, ok := result["clientVersion"].(map[string]interface{})
	if !ok {
		return ""
	}

	version, ok := clientInfo["gitVersion"].(string)
	if !ok {
		return ""
	}

	// Remove 'v' prefix if present
	return strings.TrimPrefix(version, "v")
}

func extractKflexVersion(output string) string {
	re := regexp.MustCompile(`Kubeflex version: v?(\d+\.\d+\.\d+)`)
	match := re.FindStringSubmatch(output)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}

func extractClusteradmVersion(output string) string {
	re := regexp.MustCompile(`client version: (\d+\.\d+\.\d+)`)
	match := re.FindStringSubmatch(output)
	if len(match) > 1 {
		return match[1]
	}
	// The bash script uses :v0.7-:v0.10 which is unusual
	re = regexp.MustCompile(`:v(\d+\.\d+)`)
	match = re.FindStringSubmatch(output)
	if len(match) > 1 {
		return match[1] + ".0"
	}
	return ""
}

func extractHelmVersion(output string) string {
	return strings.TrimPrefix(strings.TrimSpace(output), "v")
}

func extractKindVersion(output string) string {
	re := regexp.MustCompile(`kind v(\d+\.\d+\.\d+)`)
	match := re.FindStringSubmatch(output)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}

func extractK3dVersion(output string) string {
	re := regexp.MustCompile(`k3d version v(\d+\.\d+\.\d+)`)
	match := re.FindStringSubmatch(output)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}

func extractArgoCDVersion(output string) string {
	re := regexp.MustCompile(`(\d+\.\d+\.\d+)`)
	match := re.FindStringSubmatch(output)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}

func extractGoVersion(output string) string {
	re := regexp.MustCompile(`go version go(\d+\.\d+\.\d+)`)
	match := re.FindStringSubmatch(output)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}

func extractKoVersion(output string) string {
	re := regexp.MustCompile(`(\d+\.\d+\.\d+)`)
	match := re.FindStringSubmatch(output)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}

func extractMakeVersion(output string) string {
	re := regexp.MustCompile(`GNU Make (\d+\.\d+)`)
	match := re.FindStringSubmatch(output)
	if len(match) > 1 {
		return match[1] + ".0" // Add minor version for semver compatibility
	}
	return ""
}

func extractJqVersion(output string) string {
	re := regexp.MustCompile(`jq-(\d+\.\d+)`)
	match := re.FindStringSubmatch(output)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}

func extractYqVersion(output string) string {
	re := regexp.MustCompile(`version v?(\d+\.\d+\.\d+)`)
	match := re.FindStringSubmatch(output)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}

// DisplayPrerequisitesStatus formats and displays the prerequisites status
func DisplayPrerequisitesStatus(response PrerequisitesResponse) string {
	var sb strings.Builder

	sb.WriteString("Checking pre-requisites for using KubeStellar:\n\n")

	// Display system architecture
	sb.WriteString(fmt.Sprintf("System Information:\n"))
	sb.WriteString(fmt.Sprintf("- Operating System: %s\n", response.OS))
	archStatus := "✓"
	archDetails := response.Architecture.Current
	if !response.Architecture.Compatible {
		archStatus = "✗"
		archDetails = fmt.Sprintf("%s (supported: %s)",
			response.Architecture.Current,
			strings.Join(response.Architecture.Supported, ", "))
	}
	sb.WriteString(fmt.Sprintf("%s CPU Architecture: %s\n", archStatus, archDetails))
	if !response.Architecture.Compatible && response.Architecture.Description != "" {
		sb.WriteString(fmt.Sprintf("  Note: %s\n", response.Architecture.Description))
	}
	sb.WriteString("\n")

	// Group prerequisites by category
	coreTools := []string{"Docker", "kubectl", "Kubeflex", "OCM CLI", "Helm"}
	exampleTools := []string{"Kind", "k3d", "ArgoCD CLI"}
	buildTools := []string{"Make", "Go", "KO"}
	otherTools := []string{"jq", "yq"}

	// Display core tools
	sb.WriteString("Core Prerequisites:\n")
	for _, name := range coreTools {
		writePrereqStatus(&sb, response, name)
	}

	// Display example tools
	sb.WriteString("\nPrerequisites for running examples:\n")
	for _, name := range exampleTools {
		writePrereqStatus(&sb, response, name)
	}

	// Display build tools
	sb.WriteString("\nPrerequisites for building KubeStellar:\n")
	for _, name := range buildTools {
		writePrereqStatus(&sb, response, name)
	}

	// Display other tools
	sb.WriteString("\nAdditional tools:\n")
	for _, name := range otherTools {
		writePrereqStatus(&sb, response, name)
	}

	// Display sysctl checks if available
	if len(response.SysctlChecks) > 0 {
		sb.WriteString("\nLinux kernel parameters:\n")
		for _, sysctl := range response.SysctlChecks {
			status := "✓"
			if !sysctl.Valid {
				status = "✗"
			}
			sb.WriteString(fmt.Sprintf("%s %s = %d (required: ≥ %d)\n",
				status, sysctl.Name, sysctl.Current, sysctl.Required))
		}
	}

	// Overall status
	sb.WriteString("\nOverall status: ")
	if response.AllInstalled {
		sb.WriteString("✅ All prerequisites are installed and properly configured.\n")
	} else {
		sb.WriteString("❌ Some prerequisites are missing or need to be updated. Please check the details above.\n")
	}

	return sb.String()
}

func writePrereqStatus(sb *strings.Builder, response PrerequisitesResponse, name string) {
	for _, prereq := range response.Prerequisites {
		if prereq.Name == name {
			status := "✓"
			details := fmt.Sprintf("v%s", prereq.Version)
			if !prereq.Installed {
				status = "✗"
				if prereq.Version == "" {
					details = "not installed"
				} else {
					details = fmt.Sprintf("%s (required: ≥ %s)", prereq.Version, prereq.Required)
				}
			}
			sb.WriteString(fmt.Sprintf("%s %s: %s\n", status, prereq.Name, details))
			return
		}
	}
	sb.WriteString(fmt.Sprintf("? %s: not checked\n", name))
}
