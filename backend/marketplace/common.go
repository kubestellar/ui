package marketplace

import (
	"fmt"

	"github.com/kubestellar/ui/backend/log"
	"github.com/kubestellar/ui/backend/models"
	pluginpkg "github.com/kubestellar/ui/backend/pkg/plugins"
	"go.uber.org/zap"
)

// check if the plugin is from the marketplace using pluginDetailsID
func CheckMarketplacePlugin(pluginID int) (bool, error) {
	marketplaceManager := GetGlobalMarketplaceManager()
	if marketplaceManager == nil {
		log.LogError("marketplace manager is nil")
		return false, fmt.Errorf("marketplace manager is not initialized")
	}

	return marketplaceManager.CheckPluginExists(pluginID), nil
}

// add a feedback
func AddMarketplacePluginFeedback(pluginID int, feedback *models.PluginFeedback) error {
	marketplaceManager := GetGlobalMarketplaceManager()
	if marketplaceManager == nil {
		log.LogError("marketplace manager is nil")
		return fmt.Errorf("marketplace manager is not initialized")
	}

	// check if the plugin with the ID exists
	exists, err := CheckMarketplacePlugin(pluginID)
	if err != nil {
		log.LogError("error checking marketplace plugin", zap.String("error", err.Error()))
		return err
	}

	if !exists {
		log.LogError("plugin not found in marketplace", zap.Int("pluginID", pluginID))
		return fmt.Errorf("plugin with ID %d not found in marketplace", pluginID)
	}

	// add the feedback
	err = marketplaceManager.AddFeedback(feedback, pluginID)
	if err != nil {
		log.LogError("error adding marketplace plugin feedback", zap.String("error", err.Error()))
		return fmt.Errorf("error adding feedback for plugin with ID %d, error: %v", pluginID, err)
	}

	// update the plugin rating average and count in the DB
	ratingAvg, err := marketplaceManager.GetRatingAverage(feedback.PluginID)
	if err != nil {
		log.LogError("error getting rating average", zap.Int("plugin_id", feedback.PluginID), zap.String("error", err.Error()))
		return fmt.Errorf("error getting rating average for plugin with ID %d, error: %v", feedback.PluginID, err)
	}

	ratingCnt, err := marketplaceManager.GetRatingCount(feedback.PluginID)
	if err != nil {
		log.LogError("error getting rating count", zap.Int("plugin_id", feedback.PluginID), zap.String("error", err.Error()))
		return fmt.Errorf("error getting rating count for plugin with ID %d, error: %v", feedback.PluginID, err)
	}

	// update rating average and count
	if err := pluginpkg.UpdateRating(pluginID, ratingAvg, ratingCnt); err != nil {
		log.LogError("error updating plugin rating", zap.Int("pluginID", pluginID), zap.String("error", err.Error()))
		return fmt.Errorf("error updating rating for plugin with ID %d, error: %v", pluginID, err)
	}

	// add to database
	// find the corresponding marketplace_plugin_ID
	// we need to do this because the plugin_feedback table uses marketplace_plugin_ID
	marketplacePluginID, err := pluginpkg.GetMarketplacePluginID(feedback.PluginID)
	if err != nil {
		log.LogError("error getting marketplace plugin ID", zap.Int("plugin_id", feedback.PluginID), zap.String("error", err.Error()))
		return fmt.Errorf("error getting marketplace plugin ID for plugin with ID %d, error: %v", feedback.PluginID, err)
	}

	// add to the database
	err = pluginpkg.AddPluginFeedbackToDB(
		marketplacePluginID, feedback.UserID, feedback.Rating, feedback.Comment, feedback.Suggestions,
	)
	if err != nil {
		log.LogError("error adding feedback to database", zap.String("error", err.Error()))
		return fmt.Errorf("error adding feedback to database for plugin with ID %d, error: %v", feedback.PluginID, err)
	}

	return nil
}
