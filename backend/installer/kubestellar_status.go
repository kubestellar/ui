package installer

import (
	"fmt"
	"os/exec"
	"strings"
)

// KubeStellarStatus holds the check results
type KubeStellarStatus struct {
	Context       string `json:"context"`
	ContextFound  bool   `json:"contextFound"`
	WDS1Namespace bool   `json:"wds1Namespace"`
	ITS1Namespace bool   `json:"its1Namespace"`
	AllReady      bool   `json:"allReady"`
	Message       string `json:"message"`
}

// CheckKubeStellarStatus checks for a context containing "kubestellar" and required namespaces
func CheckKubeStellarStatus() KubeStellarStatus {
	status := KubeStellarStatus{
		Context:       "",
		ContextFound:  false,
		WDS1Namespace: false,
		ITS1Namespace: false,
		AllReady:      false,
		Message:       "KubeStellar context not found",
	}

	// Get all kubectl contexts
	contextsCmd := exec.Command("kubectl", "config", "get-contexts", "-o=name")
	contextsOutput, err := contextsCmd.CombinedOutput()
	if err != nil {
		status.Message = fmt.Sprintf("Error getting contexts: %v", err)
		return status
	}

	contexts := strings.Split(strings.TrimSpace(string(contextsOutput)), "\n")

	for _, ctx := range contexts {
		if strings.Contains(ctx, "kubeflex") {
			status.Context = ctx
			status.ContextFound = true

			// Check wds1-system namespace
			wds1Cmd := exec.Command("kubectl", "get", "ns", "wds1-system", "--context", ctx, "--ignore-not-found")
			wds1Output, _ := wds1Cmd.CombinedOutput()
			if strings.Contains(string(wds1Output), "wds1-system") {
				status.WDS1Namespace = true
			}

			// Check its1-system namespace
			its1Cmd := exec.Command("kubectl", "get", "ns", "its1-system", "--context", ctx, "--ignore-not-found")
			its1Output, _ := its1Cmd.CombinedOutput()
			if strings.Contains(string(its1Output), "its1-system") {
				status.ITS1Namespace = true
			}

			status.AllReady = status.WDS1Namespace && status.ITS1Namespace

			// Set the appropriate message based on namespace status
			if status.AllReady {
				status.Message = "KubeStellar context and required namespaces verified"
			} else {
				missingNamespaces := []string{}
				if !status.WDS1Namespace {
					missingNamespaces = append(missingNamespaces, "wds1-system")
				}
				if !status.ITS1Namespace {
					missingNamespaces = append(missingNamespaces, "its1-system")
				}
				status.Message = fmt.Sprintf("KubeStellar context found, but required namespaces are missing: %s", strings.Join(missingNamespaces, ", "))
			}
			break
		}
	}

	return status
}
