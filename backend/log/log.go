package log

import (
	"os"
	"strings"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var logger *zap.Logger

func LogInfo(msg string, fields ...zap.Field) {
	logger.Info(msg, fields...)

}

func LogError(msg string, fields ...zap.Field) {
	logger.Error(msg, fields...)
}

func LogWarn(msg string, fields ...zap.Field) {
	logger.Warn(msg, fields...)
}

func LogFatal(msg string, fields ...zap.Field) {
	logger.Fatal(msg, fields...)
}

func LogDebug(msg string, fields ...zap.Field) {
	logger.Debug(msg, fields...)
}

func getLogLevel() zapcore.Level {
	logLevelStr := strings.ToLower(os.Getenv("LOG_LEVEL"))
	switch logLevelStr {
	case "debug":
		return zap.DebugLevel
	case "info":
		return zap.InfoLevel
	case "warn":
		return zap.WarnLevel
	case "error":
		return zap.ErrorLevel
	case "fatal":
		return zap.FatalLevel
	default:
		return zap.InfoLevel // Default to INFO level if not specified or invalid
	}
}

func init() {
	cfg := zap.NewProductionConfig()
	cfg.Level = zap.NewAtomicLevelAt(getLogLevel())
	cfg.DisableStacktrace = true
	baseLogger, _ := cfg.Build()
	logger = baseLogger.WithOptions(zap.AddCallerSkip(1))
}
