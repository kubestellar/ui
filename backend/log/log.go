package log

import "go.uber.org/zap"

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

func init() {

	cfg := zap.NewProductionConfig()
	cfg.DisableStacktrace = true
	zapLogger, _ := cfg.Build()
	logger = zapLogger

}
