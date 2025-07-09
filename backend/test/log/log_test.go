package log_test

import (
	"sync"
	"testing"

	"errors"

	"strconv"

	"github.com/kubestellar/ui/backend/log"
	"go.uber.org/zap"
)

func TestLogInfo(t *testing.T) {
	log.LogInfo("Test info message")
	log.LogInfo("Test info message with fields", zap.String("user", "testuser"), zap.Int("count", 42), zap.Bool("enabled", true))
	log.LogInfo("")
	log.LogInfo("Test message with special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?")
}

func TestLogError(t *testing.T) {
	log.LogError("Test error message")
	log.LogError("Test error message with fields", zap.String("error_code", "E001"), zap.String("component", "auth"), zap.Error(
		errors.New("general error for testing"),
	))
	log.LogError("")
}

func TestLogWarn(t *testing.T) {
	log.LogWarn("Test warning message")
	log.LogWarn("Test warning message with fields", zap.String("warning_type", "deprecation"), zap.String("version", "1.0.0"))
}

func TestLogDebug(t *testing.T) {
	log.LogDebug("Test debug message")
	log.LogDebug("Test debug message with fields", zap.String("function", "TestLogDebug"), zap.Int("line", 123), zap.Float64("duration", 0.045))
}

func TestLogFatal(t *testing.T) {
	t.Skip("LogFatal calls os.Exit(1) which cannot be tested in unit tests")
}

func TestLoggingWithDifferentFieldTypes(t *testing.T) {
	log.LogInfo("Test message with various field types",
		zap.String("string_field", "value"),
		zap.Int("int_field", 42),
		zap.Int64("int64_field", 123456789),
		zap.Float64("float64_field", 3.14159),
		zap.Bool("bool_field", true),
		zap.Any("any_field", map[string]string{"key": "value"}),
	)
}

func TestLoggingPerformance(t *testing.T) {
	for i := 0; i < 100; i++ {
		log.LogInfo("Performance test message", zap.Int("index", i))
	}
}

func TestLoggingConcurrency(t *testing.T) {
	var wg sync.WaitGroup
	for g := 0; g < 5; g++ {
		wg.Add(1)
		go func(gid int) {
			defer wg.Done()
			for i := 0; i < 10; i++ {
				log.LogInfo("Concurrent log message", zap.Int("goroutine_id", gid), zap.Int("message_id", i))
			}
		}(g)
	}
	wg.Wait()
}

func TestLoggingWithNilFields(t *testing.T) {
	var nilFields []zap.Field
	log.LogInfo("Test message with nil fields", nilFields...)
}

func TestLoggingWithEmptyFields(t *testing.T) {
	log.LogInfo("Test message with empty field values", zap.String("empty_string", ""), zap.Int("zero_int", 0), zap.Bool("false_bool", false))
}

func TestLoggingIntegration(t *testing.T) {
	log.LogDebug("Debug message", zap.String("level", "debug"))
	log.LogInfo("Info message", zap.String("level", "info"))
	log.LogWarn("Warning message", zap.String("level", "warn"))
	log.LogError("Error message", zap.String("level", "error"))
}

func TestLoggingFunctionSignatures(t *testing.T) {
	log.LogDebug("test message")
	log.LogDebug("test message", zap.String("test", "value"))
	log.LogInfo("test message")
	log.LogInfo("test message", zap.String("test", "value"))
	log.LogWarn("test message")
	log.LogWarn("test message", zap.String("test", "value"))
	log.LogError("test message")
	log.LogError("test message", zap.String("test", "value"))
}

func TestLoggingEdgeCases(t *testing.T) {
	longMsg := "This is a very long message that contains many characters. It is designed to test how the logging system handles messages that are significantly longer than typical log messages. This message should be processed without any issues by the logging system."
	log.LogInfo(longMsg)
	log.LogInfo("Test message with unicode: 你好世界 🌍  🚀 💻")
	fields := []zap.Field{}
	for i := 0; i < 50; i++ {
		fields = append(fields, zap.Int("field_"+strconv.Itoa(i), i))
	}
	log.LogInfo("Test message with many fields", fields...)
}
