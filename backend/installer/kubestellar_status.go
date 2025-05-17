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

// CheckKubeStellarStatus checks for contexts containing "kubeflex", "kind", or "k3d" and required namespaces
func CheckKubeStellarStatus() KubeStellarStatus {
	status := KubeStellarStatus{
		Context:       "",
		ContextFound:  false,
		WDS1Namespace: false,
		ITS1Namespace: false,
		AllReady:      false,
		Message:       "No compatible KubeStellar context found",
	}

	// Get all kubectl contexts
	contextsCmd := exec.Command("kubectl", "config", "get-contexts", "-o=name")
	contextsOutput, err := contextsCmd.CombinedOutput()
	if err != nil {
		status.Message = fmt.Sprintf("Error getting contexts: %v", err)
		return status
	}

	contexts := strings.Split(strings.TrimSpace(string(contextsOutput)), "\n")

	// Define the compatible context types to check
	compatibleTypes := []string{"kubeflex", "kind", "k3d"}

	// Check all contexts to find any compatible one
	for _, ctx := range contexts {
		isCompatible := false
		for _, ctxType := range compatibleTypes {
			if strings.Contains(ctx, ctxType) {
				isCompatible = true
				break
			}
		}

		if isCompatible {
			// Found a compatible context
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

			// If this context has all required namespaces, it's ready
			if status.WDS1Namespace && status.ITS1Namespace {
				status.AllReady = true
				status.Message = fmt.Sprintf("KubeStellar ready on context %s with all required namespaces", ctx)
				return status // Found a fully working context, return immediately
			}

			// If not ready, update the message and continue checking other contexts
			missingNamespaces := []string{}
			if !status.WDS1Namespace {
				missingNamespaces = append(missingNamespaces, "wds1-system")
			}
			if !status.ITS1Namespace {
				missingNamespaces = append(missingNamespaces, "its1-system")
			}
			status.Message = fmt.Sprintf("Compatible context %s found, but required namespaces are missing: %s",
				ctx, strings.Join(missingNamespaces, ", "))
		}
	}

	// If we get here, we didn't find any fully working context
	return status
}
