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

	migratePath := "file://postgresql/migrations"

	m, err := migrate.New(
		migratePath,
		dbURL,
	)
	if err != nil {
		log.LogError("Failed to initialize migrate", zap.String("error", err.Error()))
		return fmt.Errorf("failed to initialize migrate: %w", err)
	}

	err = m.Up()
	if err != nil {
		if err == migrate.ErrNoChange {
			log.LogInfo("No migration changes to apply")
			return nil
		}

		version, dirty, vErr := m.Version()
		if vErr != nil {
			log.LogError("Failed to get migration version", zap.String("error", vErr.Error()))
			return fmt.Errorf("failed to get migration version: %w", vErr)
		}
		if dirty {
			log.LogInfo("Database is dirty, forcing", zap.Uint("version", version))
			if fErr := m.Force(int(version)); fErr != nil {
				log.LogError("Failed to force migration", zap.String("error", fErr.Error()))
				return fmt.Errorf("failed to force migration: %w", fErr)
			}

			// retry migration up
			if uErr := m.Up(); uErr != nil && uErr != migrate.ErrNoChange {
				log.LogError("Failed to apply migrations after forcing", zap.String("error", uErr.Error()))
				return fmt.Errorf("failed to apply migrations after forcing: %w", uErr)
			}
		} else if err != migrate.ErrNoChange {
			log.LogError("Failed to init migrate", zap.String("error", err.Error()))
			return fmt.Errorf("failed to init migrate: %w", err)
		}
	}
	log.LogInfo("Database migrations applied successfully")
	return nil
}
