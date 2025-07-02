package utils

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/utils"
)

func TestReadFileContent(t *testing.T) {
	t.Run("should read content from reader", func(t *testing.T) {
		content := "Hello, World!"
		reader := strings.NewReader(content)

		result, err := utils.ReadFileContent(reader)
		if err != nil {
			t.Errorf("Failed to read file content: %v", err)
		}

		if string(result) != content {
			t.Errorf("Expected %s, got %s", content, string(result))
		}
	})

	t.Run("should read empty content", func(t *testing.T) {
		reader := strings.NewReader("")

		result, err := utils.ReadFileContent(reader)
		if err != nil {
			t.Errorf("Failed to read empty content: %v", err)
		}

		if len(result) != 0 {
			t.Errorf("Expected empty result, got %d bytes", len(result))
		}
	})

	t.Run("should read binary content", func(t *testing.T) {
		binaryData := []byte{0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE, 0xFD}
		reader := bytes.NewReader(binaryData)

		result, err := utils.ReadFileContent(reader)
		if err != nil {
			t.Errorf("Failed to read binary content: %v", err)
		}

		if !bytes.Equal(result, binaryData) {
			t.Errorf("Binary data mismatch. Expected %v, got %v", binaryData, result)
		}
	})

	t.Run("should read large content", func(t *testing.T) {
		// Create a large string (1MB)
		largeContent := strings.Repeat("A", 1024*1024)
		reader := strings.NewReader(largeContent)

		result, err := utils.ReadFileContent(reader)
		if err != nil {
			t.Errorf("Failed to read large content: %v", err)
		}

		if len(result) != len(largeContent) {
			t.Errorf("Expected %d bytes, got %d bytes", len(largeContent), len(result))
		}

		if string(result) != largeContent {
			t.Error("Large content mismatch")
		}
	})

	t.Run("should handle multiline content", func(t *testing.T) {
		content := `Line 1
Line 2
Line 3
With special chars: !@#$%^&*()
Unicode: 测试 🚀 émojis`
		reader := strings.NewReader(content)

		result, err := utils.ReadFileContent(reader)
		if err != nil {
			t.Errorf("Failed to read multiline content: %v", err)
		}

		if string(result) != content {
			t.Errorf("Expected %s, got %s", content, string(result))
		}
	})
}

func TestGetFormFileBytes(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	t.Run("should get form file bytes", func(t *testing.T) {
		// Create multipart form
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)

		fileContent := "test file content"
		part, err := writer.CreateFormFile("testfile", "test.txt")
		if err != nil {
			t.Fatalf("Failed to create form file: %v", err)
		}

		_, err = part.Write([]byte(fileContent))
		if err != nil {
			t.Fatalf("Failed to write to form file: %v", err)
		}

		writer.Close()

		// Create HTTP request
		req, err := http.NewRequest("POST", "/upload", body)
		if err != nil {
			t.Fatalf("Failed to create request: %v", err)
		}
		req.Header.Set("Content-Type", writer.FormDataContentType())

		// Create Gin context
		w := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(w)
		ctx.Request = req

		// Test the function
		result, err := utils.GetFormFileBytes("testfile", ctx)
		if err != nil {
			t.Errorf("Failed to get form file bytes: %v", err)
		}

		if string(result) != fileContent {
			t.Errorf("Expected %s, got %s", fileContent, string(result))
		}
	})

	t.Run("should handle binary file", func(t *testing.T) {
		// Create multipart form with binary data
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)

		binaryData := []byte{0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE, 0xFD}
		part, err := writer.CreateFormFile("binaryfile", "test.bin")
		if err != nil {
			t.Fatalf("Failed to create form file: %v", err)
		}

		_, err = part.Write(binaryData)
		if err != nil {
			t.Fatalf("Failed to write to form file: %v", err)
		}

		writer.Close()

		// Create HTTP request
		req, err := http.NewRequest("POST", "/upload", body)
		if err != nil {
			t.Fatalf("Failed to create request: %v", err)
		}
		req.Header.Set("Content-Type", writer.FormDataContentType())

		// Create Gin context
		w := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(w)
		ctx.Request = req

		// Test the function
		result, err := utils.GetFormFileBytes("binaryfile", ctx)
		if err != nil {
			t.Errorf("Failed to get binary form file bytes: %v", err)
		}

		if !bytes.Equal(result, binaryData) {
			t.Errorf("Binary data mismatch. Expected %v, got %v", binaryData, result)
		}
	})

	t.Run("should handle empty file", func(t *testing.T) {
		// Create multipart form with empty file
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)

		part, err := writer.CreateFormFile("emptyfile", "empty.txt")
		if err != nil {
			t.Fatalf("Failed to create form file: %v", err)
		}

		// Don't write anything to the file
		_ = part
		writer.Close()

		// Create HTTP request
		req, err := http.NewRequest("POST", "/upload", body)
		if err != nil {
			t.Fatalf("Failed to create request: %v", err)
		}
		req.Header.Set("Content-Type", writer.FormDataContentType())

		// Create Gin context
		w := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(w)
		ctx.Request = req

		// Test the function
		result, err := utils.GetFormFileBytes("emptyfile", ctx)
		if err != nil {
			t.Errorf("Failed to get empty form file bytes: %v", err)
		}

		if len(result) != 0 {
			t.Errorf("Expected empty result, got %d bytes", len(result))
		}
	})

	t.Run("should return error for non-existent file", func(t *testing.T) {
		// Create multipart form without the requested file
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)

		// Create a different file
		part, err := writer.CreateFormFile("otherfile", "other.txt")
		if err != nil {
			t.Fatalf("Failed to create form file: %v", err)
		}
		part.Write([]byte("other content"))

		writer.Close()

		// Create HTTP request
		req, err := http.NewRequest("POST", "/upload", body)
		if err != nil {
			t.Fatalf("Failed to create request: %v", err)
		}
		req.Header.Set("Content-Type", writer.FormDataContentType())

		// Create Gin context
		w := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(w)
		ctx.Request = req

		// Test the function
		_, err = utils.GetFormFileBytes("nonexistent", ctx)
		if err == nil {
			t.Error("Expected error for non-existent file, but got none")
		}
	})

	t.Run("should return error for request without multipart form", func(t *testing.T) {
		// Create regular HTTP request without multipart form
		req, err := http.NewRequest("POST", "/upload", strings.NewReader("regular body"))
		if err != nil {
			t.Fatalf("Failed to create request: %v", err)
		}
		req.Header.Set("Content-Type", "application/json")

		// Create Gin context
		w := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(w)
		ctx.Request = req

		// Test the function
		_, err = utils.GetFormFileBytes("testfile", ctx)
		if err == nil {
			t.Error("Expected error for non-multipart request, but got none")
		}
	})

	t.Run("should handle large file", func(t *testing.T) {
		// Create multipart form with large file
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)

		// Create large content (100KB)
		largeContent := strings.Repeat("A", 100*1024)
		part, err := writer.CreateFormFile("largefile", "large.txt")
		if err != nil {
			t.Fatalf("Failed to create form file: %v", err)
		}

		_, err = part.Write([]byte(largeContent))
		if err != nil {
			t.Fatalf("Failed to write to form file: %v", err)
		}

		writer.Close()

		// Create HTTP request
		req, err := http.NewRequest("POST", "/upload", body)
		if err != nil {
			t.Fatalf("Failed to create request: %v", err)
		}
		req.Header.Set("Content-Type", writer.FormDataContentType())

		// Create Gin context
		w := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(w)
		ctx.Request = req

		// Test the function
		result, err := utils.GetFormFileBytes("largefile", ctx)
		if err != nil {
			t.Errorf("Failed to get large form file bytes: %v", err)
		}

		if len(result) != len(largeContent) {
			t.Errorf("Expected %d bytes, got %d bytes", len(largeContent), len(result))
		}

		if string(result) != largeContent {
			t.Error("Large file content mismatch")
		}
	})
}
