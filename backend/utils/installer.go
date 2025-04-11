package utils

import (
	"fmt"
	"time"
)

// GenerateInstallID generates a unique installation ID
func GenerateInstallID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}
