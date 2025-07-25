// FOR DB QUERIES
package plugins

import (
	"database/sql"
	"fmt"

	database "github.com/kubestellar/ui/backend/postgresql/Database"
	"github.com/lib/pq"
)

func CheckPluginWithInfo(pluginName, pluginVersion, pluginDescription string, userID int) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1
			FROM plugin_details pd
			JOIN installed_plugins ip ON ip.plugin_details_id = pd.id
			WHERE pd.name = $1 AND pd.version = $2 AND pd.description = $3 AND ip.user_id = $4
		)
	`

	var exist bool
	row := database.DB.QueryRow(query, pluginName, pluginVersion, pluginDescription, userID)
	if err := row.Scan(&exist); err != nil {
		return false, fmt.Errorf("failed to check plugin existence: %w", err)
	}

	return exist, nil
}

func CheckInstalledPluginWithID(pluginID int) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1 FROM installed_plugins
			WHERE plugin_details_id=$1
		) 
	`

	var exist bool
	row := database.DB.QueryRow(query, pluginID)
	if err := row.Scan(&exist); err != nil {
		return false, fmt.Errorf("failed to check plugin existence: %w", err)
	}

	return exist, nil
}

func CheckPluginDetailsExist(pluginName, pluginVersion, pluginDescription string, authorID int) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1
			FROM plugin_details
			WHERE name = $1 AND version = $2 AND description = $3 AND author_id = $4
		)
	`

	var exist bool
	row := database.DB.QueryRow(query, pluginName, pluginVersion, pluginDescription, authorID)
	if err := row.Scan(&exist); err != nil {
		return false, fmt.Errorf("failed to check plugin existence: %w", err)
	}

	return exist, nil
}

func GetPluginDetailsID(pluginName, pluginVersion, pluginDescription string, authorID int) (int, error) {
	query := `
		SELECT id FROM plugin_details
		WHERE name = $1 AND version = $2 AND description = $3 AND author_id = $4
	`

	var pluginID int
	row := database.DB.QueryRow(query, pluginName, pluginVersion, pluginDescription, authorID)
	if err := row.Scan(&pluginID); err != nil {
		return -1, fmt.Errorf("failed to get plugin details ID: %w", err)
	}

	return pluginID, nil
}

func AddPluginToDB(
	name string,
	version string,
	description string,
	authorID int,
	website string,
	repository string,
	license string,
	tags []string,
	minVersion string, // kubestellar version
	maxVersion string, // kubestellar version
	dependencies []byte, // pass as JSON byte slice
	s3Key string,
	fileSize int,
) (int, error) {
	query := `
		INSERT INTO plugin_details (
			name,
			version,
			description,
			author_id,
			website,
			repository,
			license,
			tags,
			min_kubestellar_version,
			max_kubestellar_version,
			dependencies,
			plugin_s3_key,
			file_size
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id
	`

	var pluginDetailsID int
	err := database.DB.QueryRow(
		query,
		name,
		version,
		description,
		authorID,
		website,
		repository,
		license,
		pq.Array(tags), // for text[]
		minVersion,
		maxVersion,
		dependencies, // []byte as JSONB
		s3Key,
		fileSize,
	).Scan(&pluginDetailsID)

	if err != nil {
		return -1, fmt.Errorf("failed to insert plugin_details: %w", err)
	}

	return pluginDetailsID, nil
}

func AddInstalledPluginToDB(
	pluginDetailsID int,
	marketplacePluginID *int, // nullable
	userID int,
	installedMethod string,
	enabled bool,
	status string,
	installedPath string,
	loadTime int,
) (int, error) {
	query := `
		INSERT INTO installed_plugins (
			plugin_details_id,
			marketplace_plugin_id,
			user_id,
			installed_method,
			enabled,
			status,
			installed_path,
			loadtime
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`

	var installedPluginID int
	err := database.DB.QueryRow(
		query,
		pluginDetailsID,
		marketplacePluginID, // Can be nil
		userID,
		installedMethod,
		enabled,
		status,
		installedPath,
		loadTime,
	).Scan(&installedPluginID)

	if err != nil {
		return -1, fmt.Errorf("failed to insert installed plugin: %w", err)
	}

	return installedPluginID, nil
}

func GetPluginIdDB(pluginName, pluginVersion, pluginDescription string) (int, error) {
	query := `
		SELECT id FROM plugin_details
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

func UpdatePluginStatusDB(pluginID int, status string, userID int) error {
	query := `
		UPDATE installed_plugins
		SET status = $1
		WHERE plugin_details_id = $2 AND user_id = $3
	`

	_, err := database.DB.Exec(query, status, pluginID, userID)
	if err != nil {
		return fmt.Errorf("failed to update plugin status: %w", err)
	}

	return nil
}

func GetPluginStatusDB(pluginID int) (string, error) {
	query := `
		SELECT status FROM installed_plugins
		WHERE plugin_details_id = $1
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
		DELETE FROM installed_plugins
		WHERE plugin_details_id = $1
	`

	_, err := database.DB.Exec(query, pluginID)
	if err != nil {
		return fmt.Errorf("failed to uninstall plugin: %w", err)
	}

	return nil
}
