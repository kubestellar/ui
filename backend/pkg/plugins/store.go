// FOR DB QUERIES
package plugins

import (
	"database/sql"
	"fmt"
	"os"
	"time"

	"github.com/kubestellar/ui/backend/models"
	database "github.com/kubestellar/ui/backend/postgresql/Database"
	"github.com/lib/pq"
)

////////////////////////////////////////////////////////////////////////
// FOR PLUGIN DETAILS TABLE QUERIES
////////////////////////////////////////////////////////////////////////

func CheckPluginDetailsExist(pluginName, pluginVersion, pluginDescription string, authorID int, isMarketplacePlugin bool) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1
			FROM plugin_details
			WHERE name = $1 AND version = $2 AND description = $3 AND author_id = $4 AND isMarketplacePlugin = $5
		)
	`

	var exist bool
	row := database.DB.QueryRow(query, pluginName, pluginVersion, pluginDescription, authorID, isMarketplacePlugin)
	if err := row.Scan(&exist); err != nil {
		return false, fmt.Errorf("failed to check plugin existence: %w", err)
	}

	return exist, nil
}

func CheckPluginDetailsExistByID(pluginID int) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1 FROM plugin_details
			WHERE id = $1
		)
	`

	var exist bool
	row := database.DB.QueryRow(query, pluginID)
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

func GetPluginDetailsByID(pluginID int) (*models.PluginDetails, error) {
	query := `
		SELECT * FROM plugin_details
		WHERE id = $1
	`

	var pluginDetails models.PluginDetails
	row := database.DB.QueryRow(query, pluginID)
	if err := row.Scan(
		&pluginDetails.ID,
		&pluginDetails.Name,
		&pluginDetails.Version,
		&pluginDetails.Description,
		&pluginDetails.AuthorID,
		&pluginDetails.Website,
		&pluginDetails.Repository,
		&pluginDetails.License,
		pq.Array(&pluginDetails.Tags),
		&pluginDetails.MinKubeStellarVersion,
		&pluginDetails.MaxKubeStellarVersion,
		&pluginDetails.Dependencies,
		&pluginDetails.PluginS3Key,
		&pluginDetails.FileSize,
		&pluginDetails.CreatedAt,
		&pluginDetails.UpdatedAt,
		&pluginDetails.IsMarketPlacePlugin,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("plugin details not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get plugin details: %w", err)
	}
	return &pluginDetails, nil
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
	isMarketplacePlugin bool,
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
			file_size, 
			isMarketplacePlugin
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
		isMarketplacePlugin,
	).Scan(&pluginDetailsID)

	if err != nil {
		return -1, fmt.Errorf("failed to insert plugin_details: %w", err)
	}

	return pluginDetailsID, nil
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

func DeletePluginDetailsByID(pluginID int) error {
	query := `
		DELETE FROM plugin_details
		WHERE id = $1
	`
	row, err := database.DB.Exec(query, pluginID)
	if err != nil {
		return fmt.Errorf("failed to delete plugin details: %w", err)
	}
	if rowsAffected, _ := row.RowsAffected(); rowsAffected == 0 {
		return os.ErrNotExist
	}
	return nil
}

func GetPluginIDByNameAndVersion(name, version string) (int, error) {
	query := `
		SELECT id FROM plugin_details
		WHERE name = $1 AND version = $2
	`
	var id int
	err := database.DB.QueryRow(query, name, version).Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return -1, fmt.Errorf("plugin not found: %w", err)
		}
		return -1, fmt.Errorf("failed to get plugin ID: %w", err)
	}
	return id, nil
}

////////////////////////////////////////////////////////////////////////
// FOR INSTALLED PLUGINS TABLE QUERIES
////////////////////////////////////////////////////////////////////////

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

func UpdateInstalledPluginInstalledPath(installedPluginID int, installedPath string) error {
	query := `
		UPDATE installed_plugins
		SET installed_path = $1
		WHERE plugin_details_id = $2
	`

	_, err := database.DB.Exec(query, installedPath, installedPluginID)
	if err != nil {
		return fmt.Errorf("failed to update installed plugin installed path: %w", err)
	}

	return nil
}

func GetInstalledPluginId(pluginName, pluginVersion, pluginDescription string, authorID int, userID int) (int, error) {
	query := `		
			SELECT ip.id
			FROM plugin_details pd
			JOIN installed_plugins ip ON ip.plugin_details_id = pd.id
			WHERE pd.name = $1 AND pd.version = $2 AND pd.description = $3 AND pd.author_id = $4 AND ip.user_id = $5
	`

	var pluginID int
	row := database.DB.QueryRow(query, pluginName, pluginVersion, pluginDescription, authorID, userID)
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

func UninstallPluginFromDB(pluginID int, userID int) error {
	query := `
		DELETE FROM installed_plugins
		WHERE plugin_details_id = $1 AND user_id = $2
	`

	_, err := database.DB.Exec(query, pluginID, userID)
	if err != nil {
		return fmt.Errorf("failed to uninstall plugin: %w", err)
	}

	return nil
}

func UninstallAllPluginFromDB(pluginID int) error {
	query := `
		DELETE FROM installed_plugins
		WHERE id = $1
	`

	_, err := database.DB.Exec(query, pluginID)
	if err != nil {
		return fmt.Errorf("failed to uninstall all plugin: %w", err)
	}

	return nil
}

////////////////////////////////////////////////////////////////////////
// FOR MARKETPLACE PLUGINS TABLE QUERIES
////////////////////////////////////////////////////////////////////////

func AddMarketplacePluginToDB(
	pluginDetailsID int,
	featured bool,
	verified bool,
	priceType string,
	price float64,
	currency string,
	ratingAverage float64,
	ratingCount int,
	downloads int,
	activeInstalls int,
	publishedAt time.Time,
) error {
	query := `
		INSERT INTO marketplace_plugins (
			plugin_details_id,
			featured,
			verified,
			price_type,
			price,
			currency,
			rating_average,
			rating_count,
			downloads,
			active_installs,
			published_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	row, err := database.DB.Exec(
		query,
		pluginDetailsID,
		featured,
		verified,
		priceType,
		price,
		currency,
		ratingAverage,
		ratingCount,
		downloads,
		activeInstalls,
		publishedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to add marketplace plugin: %w", err)
	}
	rowsAffected, err := row.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("no rows were affected, plugin might already exist")
	}

	return nil
}

func GetMarketplacePluginByID(pluginID int) (*models.MarketplacePlugin, error) {
	query := `
		SELECT * FROM marketplace_plugins
		WHERE id = $1
	`

	var plugin models.MarketplacePlugin
	row := database.DB.QueryRow(query, pluginID)
	if err := row.Scan(
		&plugin.ID,
		&plugin.PluginDetailsID,
		&plugin.Featured,
		&plugin.Verified,
		&plugin.PriceType,
		&plugin.Price,
		&plugin.Currency,
		&plugin.RatingAverage,
		&plugin.RatingCount,
		&plugin.Downloads,
		&plugin.ActiveInstalls,
		&plugin.PublishedAt,
		&plugin.CreatedAt,
		&plugin.UpdatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("marketplace plugin not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get marketplace plugin: %w", err)
	}

	return &plugin, nil
}

func GetAllMarketplacePlugins() ([]*models.MarketplacePlugin, error) {
	query := `
		SELECT * FROM marketplace_plugins
	`
	rows, err := database.DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to get all marketplace plugins: %w", err)
	}
	defer rows.Close()

	var plugins []*models.MarketplacePlugin
	for rows.Next() {
		var plugin models.MarketplacePlugin
		if err := rows.Scan(
			&plugin.ID,
			&plugin.PluginDetailsID,
			&plugin.Featured,
			&plugin.Verified,
			&plugin.PriceType,
			&plugin.Price,
			&plugin.Currency,
			&plugin.RatingAverage,
			&plugin.RatingCount,
			&plugin.Downloads,
			&plugin.ActiveInstalls,
			&plugin.PublishedAt,
			&plugin.CreatedAt,
			&plugin.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan DB rows: %w", err)
		}
		plugins = append(plugins, &plugin)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over rows: %w", err)
	}
	return plugins, nil
}

func GetMarketplacePluginID(pluginDetailsID int) (int, error) {
	query := `
		SELECT id FROM marketplace_plugins
		WHERE plugin_details_id = $1
	`
	var marketplacePluginID int
	err := database.DB.QueryRow(query, pluginDetailsID).Scan(&marketplacePluginID)
	if err != nil {
		if err == sql.ErrNoRows {
			return -1, fmt.Errorf("marketplace plugin not found for plugin details ID %d: %w", pluginDetailsID, err)
		}
		return -1, fmt.Errorf("failed to get marketplace plugin ID: %w", err)
	}
	return marketplacePluginID, nil
}

func UpdateRating(pluginDetailsID int, ratingAvg float32, ratingCnt int) error {
	query := `
		UPDATE marketplace_plugins
		SET rating_average = $2, rating_count = $3
		WHERE plugin_details_id = $1
	`
	_, err := database.DB.Exec(query, pluginDetailsID, ratingAvg, ratingCnt)
	if err != nil {
		return fmt.Errorf("failed to update rating average and count: %w", err)
	}
	return nil
}

////////////////////////////////////////////////////////////////////////
// FOR PLUGIN FEEDBACK TABLE QUERIES
////////////////////////////////////////////////////////////////////////

func GetPluginFeedback(marketplacePluginID int) ([]models.PluginFeedback, error) {
	query := `
		SELECT * FROM plugin_feedback
		WHERE marketplace_plugin_id = $1
	`

	rows, err := database.DB.Query(query, marketplacePluginID)
	if err != nil {
		return nil, fmt.Errorf("failed to get plugin feedback: %w", err)
	}
	defer rows.Close()
	var feedback []models.PluginFeedback
	for rows.Next() {
		var f models.PluginFeedback
		if err := rows.Scan(
			&f.ID,
			&f.PluginID,
			&f.UserID,
			&f.Rating,
			&f.Comment,
			&f.Suggestions,
			&f.CreatedAt,
			&f.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan feedback row: %w", err)
		}
		feedback = append(feedback, f)
	}
	return feedback, nil
}

func AddPluginFeedbackToDB(marketplacePluginID, userID, rating int, comment string, suggessions string) error {
	query := `
		INSERT INTO plugin_feedback (
			marketplace_plugin_id,
			user_id,
			rating,
			comment,
			suggestions
		)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := database.DB.Exec(query, marketplacePluginID, userID, rating, comment, suggessions)
	if err != nil {
		return fmt.Errorf("failed to add plugin feedback to the database: %w", err)
	}
	return nil
}
