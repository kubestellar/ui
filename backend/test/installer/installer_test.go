package installer

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/kubestellar/ui/backend/installer"
)

func TestInitializeLogStorage(t *testing.T) {
	installID := "test-install-123"
	installer.InitializeLogStorage(installID)
	if !installer.InstallationExists(installID) {
		t.Errorf("Installation ID %s should exist after initialization", installID)
	}
	logs, exists := installer.GetLogs(installID)
	if !exists {
		t.Errorf("Logs should exist for installation ID %s", installID)
	}
	if len(logs) != 0 {
		t.Errorf("Expected empty logs slice, got %d entries", len(logs))
	}
}

func TestAppendLog(t *testing.T) {
	installID := "test-install-456"
	installer.InitializeLogStorage(installID)
	testMessage := "Test log message"
	installer.AppendLog(installID, testMessage)
	logs, exists := installer.GetLogs(installID)
	if !exists {
		t.Errorf("Logs should exist for installation ID %s", installID)
	}
	if len(logs) != 1 {
		t.Errorf("Expected 1 log entry, got %d", len(logs))
	}
	logEntry := logs[0]
	if !strings.Contains(logEntry, testMessage) {
		t.Errorf("Log entry should contain message '%s', got: %s", testMessage, logEntry)
	}
	if !strings.Contains(logEntry, "[") || !strings.Contains(logEntry, "]") {
		t.Errorf("Log entry should contain timestamp in brackets, got: %s", logEntry)
	}
	nonExistentID := "non-existent-456"
	installer.AppendLog(nonExistentID, "should not be added")
	_, exists = installer.GetLogs(nonExistentID)
	if exists {
		t.Errorf("Logs should not exist for non-existent installation ID")
	}
}

func TestGetLogs(t *testing.T) {
	installID := "test-install-789"
	installer.InitializeLogStorage(installID)
	testMessages := []string{"Message 1", "Message 2", "Message 3"}
	for _, msg := range testMessages {
		installer.AppendLog(installID, msg)
	}
	logs, exists := installer.GetLogs(installID)
	if !exists {
		t.Errorf("Logs should exist for installation ID %s", installID)
	}
	if len(logs) != len(testMessages) {
		t.Errorf("Expected %d log entries, got %d", len(testMessages), len(logs))
	}
	for i, expectedMsg := range testMessages {
		if !strings.Contains(logs[i], expectedMsg) {
			t.Errorf("Log entry %d should contain '%s', got: %s", i, expectedMsg, logs[i])
		}
	}
	_, exists = installer.GetLogs("non-existent-789")
	if exists {
		t.Errorf("GetLogs should return false for non-existent installation ID")
	}
}

func TestInstallationExists(t *testing.T) {
	installID := "test-install-exists"
	if installer.InstallationExists(installID) {
		t.Errorf("Installation ID %s should not exist initially", installID)
	}
	installer.InitializeLogStorage(installID)
	if !installer.InstallationExists(installID) {
		t.Errorf("Installation ID %s should exist after initialization", installID)
	}
}

func TestConcurrentLogOperations(t *testing.T) {
	installID := "concurrent-test"
	installer.InitializeLogStorage(installID)
	const numGoroutines = 100
	const messagesPerGoroutine = 10
	var wg sync.WaitGroup
	wg.Add(numGoroutines)
	for i := 0; i < numGoroutines; i++ {
		go func(goroutineID int) {
			defer wg.Done()
			for j := 0; j < messagesPerGoroutine; j++ {
				installer.AppendLog(installID, fmt.Sprintf("Goroutine %d, Message %d", goroutineID, j))
			}
		}(i)
	}
	wg.Wait()
	logs, exists := installer.GetLogs(installID)
	if !exists {
		t.Errorf("Logs should exist after concurrent operations")
	}
	expectedCount := numGoroutines * messagesPerGoroutine
	if len(logs) != expectedCount {
		t.Errorf("Expected %d log entries, got %d", expectedCount, len(logs))
	}
}

func TestDownloadFile(t *testing.T) {
	testContent := "#!/bin/bash\necho 'Test script content'"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(testContent))
	}))
	defer server.Close()
	t.Skip("downloadFile function is not exported and cannot be tested directly")
}

func TestDownloadFileHTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("Not Found"))
	}))
	defer server.Close()
	t.Skip("downloadFile function is not exported and cannot be tested directly")
}

func TestProcessOutput(t *testing.T) {
	installID := "process-output-test"
	installer.InitializeLogStorage(installID)
	t.Skip("processOutput function is not exported and cannot be tested directly")
}

func TestProcessOutputWithError(t *testing.T) {
	installID := "process-error-test"
	installer.InitializeLogStorage(installID)
	t.Skip("processOutput function is not exported and cannot be tested directly")
}

func TestInstallKubeStellar(t *testing.T) {
	installID := "install-test"
	platform := "kind"
	installer.InitializeLogStorage(installID)
	go installer.InstallKubeStellar(installID, platform)
	time.Sleep(1 * time.Second)
	logs, exists := installer.GetLogs(installID)
	if !exists {
		t.Errorf("Logs should exist after installation attempt")
		return
	}
	if len(logs) == 0 {
		t.Errorf("Expected some log entries after installation attempt")
		return
	}
	if !strings.Contains(logs[0], "Starting KubeStellar installation") {
		t.Errorf("First log should contain 'Starting KubeStellar installation', got: %s", logs[0])
	}
}

func BenchmarkAppendLog(b *testing.B) {
	installID := "benchmark-test"
	installer.InitializeLogStorage(installID)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		installer.AppendLog(installID, fmt.Sprintf("Benchmark message %d", i))
	}
}

func BenchmarkGetLogs(b *testing.B) {
	installID := "benchmark-get-test"
	installer.InitializeLogStorage(installID)
	for i := 0; i < 1000; i++ {
		installer.AppendLog(installID, fmt.Sprintf("Log message %d", i))
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		installer.GetLogs(installID)
	}
}

func BenchmarkConcurrentAppendLog(b *testing.B) {
	installID := "benchmark-concurrent-test"
	installer.InitializeLogStorage(installID)
	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			installer.AppendLog(installID, fmt.Sprintf("Concurrent message %d", i))
			i++
		}
	})
}

func TestExtractEnvironmentVariables(t *testing.T) {
	installID := "env-test"
	installer.InitializeLogStorage(installID)
	installer.AppendLog(installID, "Some regular log")
	installer.AppendLog(installID, "export KUBECONFIG=/path/to/config")
	installer.AppendLog(installID, "export KUBESTELLAR_VERSION=\"v0.26.0\"")
	installer.AppendLog(installID, "export DEBUG='true'")
	installer.AppendLog(installID, "Another regular log")
	logs, exists := installer.GetLogs(installID)
	if !exists {
		t.Errorf("Logs should exist")
	}
	exportCount := 0
	for _, log := range logs {
		if strings.Contains(log, "export ") {
			exportCount++
		}
	}
	if exportCount != 3 {
		t.Errorf("Expected 3 export statements in logs, got %d", exportCount)
	}
}

func TestInstallKubeStellarDifferentPlatforms(t *testing.T) {
	platforms := []string{"kind", "k3d", "minikube"}
	for _, platform := range platforms {
		t.Run(platform, func(t *testing.T) {
			installID := "platform-test-" + platform
			installer.InitializeLogStorage(installID)
			go installer.InstallKubeStellar(installID, platform)
			time.Sleep(1 * time.Second)
			logs, exists := installer.GetLogs(installID)
			if !exists {
				t.Errorf("Logs should exist for platform %s", platform)
			}
			if len(logs) == 0 {
				t.Errorf("Expected log entries for platform %s", platform)
			}
			platformMentioned := false
			for _, log := range logs {
				if strings.Contains(log, platform) {
					platformMentioned = true
					break
				}
			}
			if !platformMentioned {
				t.Errorf("Platform %s should be mentioned in logs", platform)
			}
		})
	}
}

func TestConcurrentInstallations(t *testing.T) {
	const numInstalls = 3
	installIDs := make([]string, numInstalls)
	for i := 0; i < numInstalls; i++ {
		installIDs[i] = fmt.Sprintf("concurrent-install-%d", i)
		installer.InitializeLogStorage(installIDs[i])
	}
	for i := 0; i < numInstalls; i++ {
		go installer.InstallKubeStellar(installIDs[i], "kind")
	}
	time.Sleep(2 * time.Second)
	for i := 0; i < numInstalls; i++ {
		logs, exists := installer.GetLogs(installIDs[i])
		if !exists {
			t.Errorf("Logs should exist for installation %s", installIDs[i])
		}
		if len(logs) == 0 {
			t.Errorf("Expected log entries for installation %s", installIDs[i])
		}
	}
}

func TestLogIsolation(t *testing.T) {
	installID1 := "isolation-test-1"
	installID2 := "isolation-test-2"
	installer.InitializeLogStorage(installID1)
	installer.InitializeLogStorage(installID2)
	installer.AppendLog(installID1, "Message for install 1")
	installer.AppendLog(installID2, "Message for install 2")
	logs1, exists1 := installer.GetLogs(installID1)
	logs2, exists2 := installer.GetLogs(installID2)
	if !exists1 || !exists2 {
		t.Errorf("Both installations should have logs")
	}
	if len(logs1) != 1 || len(logs2) != 1 {
		t.Errorf("Each installation should have exactly 1 log entry")
	}
	if !strings.Contains(logs1[0], "install 1") {
		t.Errorf("Install 1 logs should contain 'install 1'")
	}
	if !strings.Contains(logs2[0], "install 2") {
		t.Errorf("Install 2 logs should contain 'install 2'")
	}
	if strings.Contains(logs1[0], "install 2") {
		t.Errorf("Install 1 logs should not contain 'install 2'")
	}
}

func TestAppendLogEdgeCases(t *testing.T) {
	installID := "edge-case-test"
	installer.InitializeLogStorage(installID)
	installer.AppendLog(installID, "")
	installer.AppendLog(installID, "Message with special chars: !@#$%^&*()")
	longMessage := strings.Repeat("A", 1000)
	installer.AppendLog(installID, longMessage)
	installer.AppendLog(installID, "Line 1\nLine 2\nLine 3")
	logs, exists := installer.GetLogs(installID)
	if !exists {
		t.Errorf("Logs should exist")
	}
	if len(logs) != 4 {
		t.Errorf("Expected 4 log entries, got %d", len(logs))
	}
	expectedMessages := []string{
		"",
		"Message with special chars: !@#$%^&*()",
		longMessage,
		"Line 1\nLine 2\nLine 3",
	}
	for i, expected := range expectedMessages {
		if !strings.Contains(logs[i], expected) {
			t.Errorf("Log entry %d should contain expected message", i)
		}
	}
}

func TestLogTimestampFormat(t *testing.T) {
	installID := "timestamp-test"
	installer.InitializeLogStorage(installID)
	installer.AppendLog(installID, "Test message")
	logs, exists := installer.GetLogs(installID)
	if !exists {
		t.Errorf("Logs should exist")
	}
	if len(logs) != 1 {
		t.Errorf("Expected 1 log entry, got %d", len(logs))
	}
	log := logs[0]
	if !strings.HasPrefix(log, "[") {
		t.Errorf("Log should start with '[', got: %s", log)
	}
	closeBracketIndex := strings.Index(log, "]")
	if closeBracketIndex == -1 {
		t.Errorf("Log should contain closing ']', got: %s", log)
	}
	timestamp := log[1:closeBracketIndex]
	timestampParts := strings.Split(timestamp, ":")
	if len(timestampParts) != 3 {
		t.Errorf("Timestamp should have format HH:MM:SS, got: %s", timestamp)
	}
	if _, err := time.Parse("15:04:05", timestamp); err != nil {
		t.Errorf("Invalid timestamp format: %s", timestamp)
	}
}
