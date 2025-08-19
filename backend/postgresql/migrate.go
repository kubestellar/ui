package postgresql

import (
	"os"

	"github.com/kubestellar/ui/backend/log"
	"go.uber.org/zap"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func RunMigration() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.LogError("DATABASE_URL environment variable is not set")
		return
	}

	m, err := migrate.New(
		"file://postgresql/migrations",
		dbURL,
	)
	if err != nil {
		log.LogError("Failed to init migrate", zap.String("error", err.Error()))
		return
	}

	err = m.Up()
	if err != nil {
		if err == migrate.ErrNoChange {
			log.LogInfo("No migration changes to apply")
		} else {
			log.LogError("Failed to apply migrations", zap.String("error", err.Error()))
		}
		return
	} else {
		log.LogInfo("Migrations applied successfully")
	}
}
