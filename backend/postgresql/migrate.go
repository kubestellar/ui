package postgresql

import (
	"fmt"
	"os"

	"github.com/kubestellar/ui/backend/log"
	"go.uber.org/zap"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func RunMigration() error {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.LogError("DATABASE_URL environment variable is not set")
		return fmt.Errorf("DATABASE_URL is not set")
	}

	m, err := migrate.New(
		"file://postgresql/migrations",
		dbURL,
	)
	if err != nil {
		log.LogError("Failed to init migrate", zap.String("error", err.Error()))
		return fmt.Errorf("failed to init migrate: %w", err)
	}

	err = m.Up()
	if err != nil {
		if err == migrate.ErrNoChange {
			log.LogInfo("No migration changes to apply")
			return nil
		}

		log.LogError("Failed to apply migrations", zap.String("error", err.Error()))
		return fmt.Errorf("failed to apply migrations: %w", err)
	}
	log.LogInfo("Database migrations applied successfully")
	return nil
}
