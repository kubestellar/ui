package utils

import (
	"strconv"
	"testing"
	"time"

	"github.com/kubestellar/ui/backend/utils"
)

func TestGenerateInstallID(t *testing.T) {
	t.Run("should generate unique install ID", func(t *testing.T) {
		id1 := utils.GenerateInstallID()
		time.Sleep(1 * time.Nanosecond) // Small delay to ensure different timestamps
		id2 := utils.GenerateInstallID()

		// IDs should be different
		if id1 == id2 {
			t.Errorf("Expected different IDs, but got same: %s", id1)
		}

		// ID should be a valid number (Unix nanoseconds)
		_, err := strconv.ParseInt(id1, 10, 64)
		if err != nil {
			t.Errorf("Generated ID should be a valid number, got: %s", id1)
		}

		// ID should be non-empty
		if id1 == "" {
			t.Error("Generated ID should not be empty")
		}
	})

	t.Run("should generate ID based on current time", func(t *testing.T) {
		beforeTime := time.Now().UnixNano()
		id := utils.GenerateInstallID()
		afterTime := time.Now().UnixNano()

		parsedID, err := strconv.ParseInt(id, 10, 64)
		if err != nil {
			t.Fatalf("Failed to parse generated ID: %v", err)
		}

		// ID should be within the time range
		if parsedID < beforeTime || parsedID > afterTime {
			t.Errorf("Generated ID %d should be between %d and %d", parsedID, beforeTime, afterTime)
		}
	})

	t.Run("should generate monotonically increasing IDs", func(t *testing.T) {
		var ids []int64
		for i := 0; i < 5; i++ {
			id := utils.GenerateInstallID()
			parsedID, err := strconv.ParseInt(id, 10, 64)
			if err != nil {
				t.Fatalf("Failed to parse generated ID: %v", err)
			}
			ids = append(ids, parsedID)
			time.Sleep(1 * time.Millisecond) // Small delay to ensure different timestamps
		}

		// Verify IDs are increasing
		for i := 1; i < len(ids); i++ {
			if ids[i] <= ids[i-1] {
				t.Errorf("ID %d should be greater than previous ID %d", ids[i], ids[i-1])
			}
		}
	})
}
