package plugins

import (
	"context"
	"database/sql"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/models"
)

type PluginStore struct {
	DB *sql.DB
}

func NewPluginStore(db *sql.DB) *PluginStore {
	return &PluginStore{DB: db}
}

func (s *PluginStore) GetAllPlugins(c *gin.Context) ([]models.Plugin, error) {
	query := `
		SELECT * FROM plugin
	`

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	var plugins []models.Plugin
	rows, err := s.DB.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}

	defer rows.Close()
	for rows.Next() {
		var plugin models.Plugin
		err := rows.Scan(
			&plugin.ID,
			&plugin.Name,
			&plugin.Version,
			&plugin.Enabled,
			&plugin.Description,
			&plugin.UserID,
			&plugin.Status,
			&plugin.CreatedAt,
			&plugin.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		plugins = append(plugins, plugin)
	}

	return plugins, nil
}
