package log

import (
	"os"
	"testing"

	"github.com/kubestellar/ui/backend/log"
	"go.uber.org/zap"
)

// Basic Tests to Ensure Logging Functions Don't Panic
func TestLogInfo(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("LogInfo panicked: %v", r)
		}
	}()

	log.LogInfo("test info message")
}

func TestLogError(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("LogError panicked: %v", r)
		}
	}()

	log.LogError("test error message")
}

func TestLogWarn(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("LogWarn panicked: %v", r)
		}
	}()

	log.LogWarn("test warn message")
}

func TestLogDebug(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("LogDebug panicked: %v", r)
		}
	}()

	log.LogDebug("test debug message")
}

func TestLogWithFields(t *testing.T) {
	// LogInfo with structured fields to ensure it handles various zap.Field inputs
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("LogInfo with fields panicked: %v", r)
		}
	}()

	log.LogInfo("test with fields",
		zap.String("key1", "value1"),
		zap.Int("key2", 42),
	)
}

func TestLogFatal(t *testing.T) {
	// LogFatal will call os.Exit(1), so we skip this test unless explicitly enabled.
	// To run this, use: TEST_FATAL=1 go test
	if os.Getenv("TEST_FATAL") != "1" {
		t.Skip("Skipping fatal test (set TEST_FATAL=1 to run)")
	}

	log.LogFatal("fatal test")
}

func TestAllLogFunctions(t *testing.T) {
	// Call all logging functions in sequence to ensure none panic
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("Log functions panicked: %v", r)
		}
	}()

	log.LogDebug("debug message")
	log.LogInfo("info message")
	log.LogWarn("warn message")
	log.LogError("error message")
}

func TestLogFieldTypes(t *testing.T) {
	// Ensure LogInfo can handle multiple field types without panic
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("Log with various fields panicked: %v", r)
		}
	}()

	log.LogInfo("testing various field types",
		zap.String("string_field", "test"),
		zap.Int("int_field", 123),
		zap.Float64("float_field", 3.14),
		zap.Bool("bool_field", true),
		zap.Duration("duration_field", 0),
	)
}

func BenchmarkLogInfo(b *testing.B) {
	for i := 0; i < b.N; i++ {
		log.LogInfo("benchmark test")
	}
}

func BenchmarkLogInfoWithFields(b *testing.B) {
	for i := 0; i < b.N; i++ {
		log.LogInfo("benchmark test",
			zap.String("field1", "value1"),
			zap.Int("field2", i),
		)
	}
}
