package test

import (
	"os"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestMain(m *testing.M) {
	// Set test mode for all tests
	os.Setenv("TEST_MODE", "true")

	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Run the tests
	exitCode := m.Run()

	// Exit with the same code
	os.Exit(exitCode)
}
