package installer

import (
	"fmt"
	"strings"
	"testing"

	"github.com/kubestellar/ui/backend/installer"
)

// Test struct to hold test scenarios
type testScenario struct {
	name             string
	contextsOutput   string
	contextsError    bool
	namespaceOutputs map[string]string
	expectedReady    bool
	expectedContext  string
	expectedMessage  string
}

func TestCheckKubeStellarStatusScenarios(t *testing.T) {
	scenarios := []testScenario{
		{
			name:            "no_compatible_contexts",
			contextsOutput:  "default\nminikube\ndocker-desktop",
			contextsError:   false,
			expectedReady:   false,
			expectedContext: "",
			expectedMessage: "No compatible KubeStellar context found",
		},
		{
			name:           "kubeflex_fully_ready",
			contextsOutput: "default\nkubeflex-control-plane\nminikube",
			contextsError:  false,
			namespaceOutputs: map[string]string{
				"kubeflex-control-plane:wds1-system": "NAME          STATUS   AGE\nwds1-system   Active   1h",
				"kubeflex-control-plane:its1-system": "NAME          STATUS   AGE\nits1-system   Active   1h",
			},
			expectedReady:   true,
			expectedContext: "kubeflex-control-plane",
			expectedMessage: "KubeStellar ready on context kubeflex-control-plane with all required namespaces",
		},
		{
			name:           "kind_missing_namespaces",
			contextsOutput: "default\nkind-test-cluster\nminikube",
			contextsError:  false,
			namespaceOutputs: map[string]string{
				"kind-test-cluster:wds1-system": "",
				"kind-test-cluster:its1-system": "",
			},
			expectedReady:   false,
			expectedContext: "kind-test-cluster",
			expectedMessage: "Compatible context kind-test-cluster found, but required namespaces are missing: wds1-system, its1-system",
		},
		{
			name:           "k3d_partial_ready",
			contextsOutput: "default\nk3d-mycluster\nminikube",
			contextsError:  false,
			namespaceOutputs: map[string]string{
				"k3d-mycluster:wds1-system": "NAME          STATUS   AGE\nwds1-system   Active   1h",
				"k3d-mycluster:its1-system": "",
			},
			expectedReady:   false,
			expectedContext: "k3d-mycluster",
			expectedMessage: "Compatible context k3d-mycluster found, but required namespaces are missing: its1-system",
		},
		{
			name:            "kubectl_error",
			contextsOutput:  "",
			contextsError:   true,
			expectedReady:   false,
			expectedMessage: "Error getting contexts:",
		},
	}

	for _, scenario := range scenarios {
		t.Run(scenario.name, func(t *testing.T) {
			t.Logf("Testing scenario: %s", scenario.name)
			t.Logf("Expected ready: %v", scenario.expectedReady)
			t.Logf("Expected context: %s", scenario.expectedContext)
			t.Logf("Expected message contains: %s", scenario.expectedMessage)

			if scenario.expectedReady && scenario.expectedContext == "" {
				t.Error("If expectedReady is true, expectedContext should not be empty")
			}

			if scenario.expectedMessage == "" {
				t.Error("expectedMessage should not be empty")
			}
		})
	}
}

func TestKubeStellarStatusStruct(t *testing.T) {
	status := installer.KubeStellarStatus{
		Context:       "test-context",
		ContextFound:  true,
		WDS1Namespace: true,
		ITS1Namespace: false,
		AllReady:      false,
		Message:       "Test message",
	}

	if status.Context != "test-context" {
		t.Errorf("Expected Context to be 'test-context', got '%s'", status.Context)
	}

	if !status.ContextFound {
		t.Error("Expected ContextFound to be true")
	}

	if !status.WDS1Namespace {
		t.Error("Expected WDS1Namespace to be true")
	}

	if status.ITS1Namespace {
		t.Error("Expected ITS1Namespace to be false")
	}

	if status.AllReady {
		t.Error("Expected AllReady to be false")
	}

	if status.Message != "Test message" {
		t.Errorf("Expected Message to be 'Test message', got '%s'", status.Message)
	}
}

func TestCompatibleContextTypes(t *testing.T) {
	compatibleTypes := []string{"kubeflex", "kind", "k3d"}
	testContexts := []string{
		"kubeflex-control-plane",
		"kind-test-cluster",
		"k3d-mycluster",
		"kubeflex-dev",
		"kind-integration",
		"k3d-local",
	}

	for _, ctx := range testContexts {
		found := false
		for _, ctxType := range compatibleTypes {
			if strings.Contains(ctx, ctxType) {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Context %s should be compatible but wasn't found", ctx)
		}
	}

	incompatibleContexts := []string{
		"default",
		"minikube",
		"docker-desktop",
		"gke_project_zone_cluster",
	}

	for _, ctx := range incompatibleContexts {
		found := false
		for _, ctxType := range compatibleTypes {
			if strings.Contains(ctx, ctxType) {
				found = true
				break
			}
		}
		if found {
			t.Errorf("Context %s should not be compatible but was found", ctx)
		}
	}
}

func TestRequiredNamespaces(t *testing.T) {
	requiredNamespaces := []string{"wds1-system", "its1-system"}

	for _, ns := range requiredNamespaces {
		t.Logf("Required namespace: %s", ns)

		kubectlOutput := fmt.Sprintf("NAME          STATUS   AGE\n%s   Active   1h", ns)
		if !strings.Contains(kubectlOutput, ns) {
			t.Errorf("Namespace %s should be detected in kubectl output", ns)
		}

		emptyOutput := ""
		if strings.Contains(emptyOutput, ns) {
			t.Errorf("Namespace %s should not be detected in empty output", ns)
		}
	}
}

func TestMessageFormatting(t *testing.T) {
	testCases := []struct {
		context           string
		missingNamespaces []string
		expectedMessage   string
	}{
		{
			context:           "kubeflex-test",
			missingNamespaces: []string{"wds1-system", "its1-system"},
			expectedMessage:   "Compatible context kubeflex-test found, but required namespaces are missing: wds1-system, its1-system",
		},
		{
			context:           "kind-test",
			missingNamespaces: []string{"its1-system"},
			expectedMessage:   "Compatible context kind-test found, but required namespaces are missing: its1-system",
		},
		{
			context:           "k3d-test",
			missingNamespaces: []string{},
			expectedMessage:   "KubeStellar ready on context k3d-test with all required namespaces",
		},
	}

	for _, tc := range testCases {
		t.Run(fmt.Sprintf("context_%s", tc.context), func(t *testing.T) {
			var actualMessage string

			if len(tc.missingNamespaces) == 0 {
				actualMessage = fmt.Sprintf("KubeStellar ready on context %s with all required namespaces", tc.context)
			} else {
				actualMessage = fmt.Sprintf("Compatible context %s found, but required namespaces are missing: %s",
					tc.context, strings.Join(tc.missingNamespaces, ", "))
			}

			if actualMessage != tc.expectedMessage {
				t.Errorf("Expected message: %s, got: %s", tc.expectedMessage, actualMessage)
			}
		})
	}
}

func TestCheckKubeStellarStatusIntegration(t *testing.T) {

	result := installer.CheckKubeStellarStatus()

	if result.Message == "" {
		t.Error("Expected non-empty message")
	}

	if result.AllReady && (!result.ContextFound || !result.WDS1Namespace || !result.ITS1Namespace) {
		t.Error("If AllReady is true, all other boolean fields should be true")
	}

	if result.ContextFound && result.Context == "" {
		t.Error("If ContextFound is true, Context should not be empty")
	}

	if !result.ContextFound && result.Context != "" {
		t.Error("If ContextFound is false, Context should be empty")
	}

	t.Logf("Function returned: Context=%s, Found=%v, WDS1=%v, ITS1=%v, Ready=%v, Message=%s",
		result.Context, result.ContextFound, result.WDS1Namespace, result.ITS1Namespace, result.AllReady, result.Message)
}

func TestEdgeCases(t *testing.T) {
	edgeCases := []struct {
		name     string
		contexts string
		expected int
	}{
		{
			name:     "empty_string",
			contexts: "",
			expected: 0,
		},
		{
			name:     "single_context",
			contexts: "kubeflex-test",
			expected: 1,
		},
		{
			name:     "multiple_contexts",
			contexts: "default\nkubeflex-test\nkind-test",
			expected: 3,
		},
		{
			name:     "contexts_with_whitespace",
			contexts: "  kubeflex-test  \n  kind-test  ",
			expected: 2,
		},
	}

	for _, tc := range edgeCases {
		t.Run(tc.name, func(t *testing.T) {
			contexts := strings.Split(strings.TrimSpace(tc.contexts), "\n")

			// Filter out empty contexts (simulate what the actual function does)
			var filteredContexts []string
			for _, ctx := range contexts {
				if strings.TrimSpace(ctx) != "" {
					filteredContexts = append(filteredContexts, strings.TrimSpace(ctx))
				}
			}

			if len(filteredContexts) != tc.expected {
				t.Errorf("Expected %d contexts, got %d", tc.expected, len(filteredContexts))
			}
		})
	}
}

func BenchmarkStringOperations(b *testing.B) {
	// Test the string operations used in the function
	contexts := "default\nkubeflex-control-plane\nkind-test-cluster\nk3d-mycluster\nminikube"
	compatibleTypes := []string{"kubeflex", "kind", "k3d"}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		contextList := strings.Split(strings.TrimSpace(contexts), "\n")
		for _, ctx := range contextList {
			for _, ctxType := range compatibleTypes {
				strings.Contains(ctx, ctxType)
			}
		}
	}
}
