// FOR DB QUERIES
package plugins

import (
	"database/sql"
	"fmt"

	database "github.com/kubestellar/ui/backend/postgresql/Database"
)

func CheckPluginWithInfo(pluginName, pluginVersion, pluginDescription string) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1 FROM plugin
			WHERE name=$1 AND version=$2 AND description=$3
		)
	`

	var exist bool
	row := database.DB.QueryRow(query, pluginName, pluginVersion, pluginDescription)
	if err := row.Scan(&exist); err != nil {
		return false, fmt.Errorf("failed to check plugin existence: %w", err)
	}

	return exist, nil
}
func CheckPluginWithID(pluginID int) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1 FROM plugin
			WHERE id=$1
		)
	`

	var exist bool
	row := database.DB.QueryRow(query, pluginID)
	if err := row.Scan(&exist); err != nil {
		return false, fmt.Errorf("failed to check plugin existence: %w", err)
	}

	return exist, nil
}

func AddPluginToDB(name string, version string, enabled bool, description string, userID int, status string) (int, error) {
	query := `
		INSERT INTO plugin (name, version, enabled, description, user_id, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`

	var pluginID int
	err := database.DB.QueryRow(query, name, version, enabled, description, userID, status).Scan(&pluginID)
	if err != nil {
		return -1, fmt.Errorf("failed to insert plugin: %w", err)
	}

	return pluginID, nil
}

func GetPluginIdDB(pluginName, pluginVersion, pluginDescription string) (int, error) {
	query := `
		SELECT id FROM plugin
		WHERE name=$1 AND version=$2 AND description=$3
	`

	var pluginID int
	row := database.DB.QueryRow(query, pluginName, pluginVersion, pluginDescription)
	if err := row.Scan(&pluginID); err != nil {
		switch err {
		case sql.ErrNoRows:
			return -1, fmt.Errorf("plugin not found: %w", err)
		default:
			return -1, err
		}
	}
	return pluginID, nil
}

func UpdatePluginStatusDB(pluginID int, status string) error {
	query := `
		UPDATE plugin
		SET status = $1
		WHERE id = $2
	`

	_, err := database.DB.Exec(query, status, pluginID)
	if err != nil {
		return fmt.Errorf("failed to update plugin status: %w", err)
	}

	return nil
}

func GetPluginStatusDB(pluginID int) (string, error) {
	query := `
		SELECT status FROM plugin
		WHERE id = $1
	`

	var status string
	row := database.DB.QueryRow(query, pluginID)
	if err := row.Scan(&status); err != nil {
		switch err {
		case sql.ErrNoRows:
			return "", fmt.Errorf("plugin not found: %w", err)
		default:
			return "", err
		}
	}

	return status, nil
}

func UninstallPluginFromDB(pluginID int) error {
	query := `
		DELETE FROM plugin
		WHERE id = $1
	`

	_, err := database.DB.Exec(query, pluginID)
	if err != nil {
		return fmt.Errorf("failed to uninstall plugin: %w", err)
	}

	return nil
}
