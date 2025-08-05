package marketplace

import (
	"fmt"
	"time"

	"github.com/kubestellar/ui/backend/log"
	"github.com/kubestellar/ui/backend/models"
	"go.uber.org/zap"

	pluginpkg "github.com/kubestellar/ui/backend/pkg/plugins"
)

type MarketplacePlugin struct {
	PluginDetailsID int                     `json:"plugin_id"`
	PluginName      string                  `json:"plugin_name"`
	Author          string                  `json:"author"`
	Description     string                  `json:"description"`
	Version         string                  `json:"version"`
	Featured        bool                    `json:"featured"`
	RatingAverage   float32                 `json:"rating_average"`
	RatingCount     int                     `json:"rating_count"`
	Downloads       int                     `json:"downloads"`
	ActiveInstalls  int                     `json:"active_installs"`
	License         string                  `json:"license"`
	Tags            []string                `json:"tags"`
	MinVersion      string                  `json:"min_version"`
	MaxVersion      string                  `json:"max_version"`
	Dependencies    models.DependenciesList `json:"dependencies"`
	UpdatedAt       time.Time               `json:"updated_at"`
	CreatedAt       time.Time               `json:"created_at"`
	Feedback        []models.PluginFeedback `json:"feedback"`
}

type MarketplaceManager struct {
	Store   StorageProvider
	plugins map[int]*MarketplacePlugin // maps PluginDetailsID to MarketplacePlugin
}

var (
	GlobalMarketplaceManager *MarketplaceManager
)

func SetGlobalMarketplaceManager(storageCfg StorageConfig) error {
	storage, err := NewStorageProvider(storageCfg)
	if err != nil {
		log.LogError("error getting new storage provider", zap.String("error", err.Error()))
		GlobalMarketplaceManager = nil
		return err
	}
	GlobalMarketplaceManager, err = NewMarketplaceManager(storage)
	return err
}

func GetGlobalMarketplaceManager() *MarketplaceManager {
	return GlobalMarketplaceManager
}

func NewMarketplaceManager(store StorageProvider) (*MarketplaceManager, error) {
	// retrieve existing plugins from the database
	plugins, err := pluginpkg.GetAllMarketplacePlugins()
	if err != nil {
		log.LogError("error getting all marketplace plugins", zap.String("error", err.Error()))
		return nil, err
	}

	// convert plugins to MarketplacePlugin
	var marketplacePlugins []*MarketplacePlugin
	for _, plugin := range plugins {
		pluginDetails, err := pluginpkg.GetPluginDetailsByID(plugin.PluginDetailsID)
		if err != nil {
			return nil, fmt.Errorf("failed to get plugin details: %w", err)
		}
		// get author name
		author, err := models.GetUserByID(pluginDetails.AuthorID)
		if err != nil {
			return nil, fmt.Errorf("failed to get author: %w", err)
		}

		// get feedback
		feedback, err := pluginpkg.GetPluginFeedback(plugin.ID) // use the marketplace plugin ID
		if err != nil {
			return nil, fmt.Errorf("failed to get feedback: %w", err)
		}

		marketplacePlugins = append(marketplacePlugins, &MarketplacePlugin{
			PluginDetailsID: plugin.PluginDetailsID,
			PluginName:      pluginDetails.Name,
			Author:          author.Username,
			Description:     pluginDetails.Description,
			Version:         pluginDetails.Version,
			Featured:        plugin.Featured,
			RatingAverage:   plugin.RatingAverage,
			RatingCount:     plugin.RatingCount,
			Downloads:       plugin.Downloads,
			ActiveInstalls:  plugin.ActiveInstalls,
			License:         pluginDetails.License,
			Tags:            pluginDetails.Tags,
			MinVersion:      pluginDetails.MinKubeStellarVersion,
			MaxVersion:      pluginDetails.MaxKubeStellarVersion,
			Dependencies:    pluginDetails.Dependencies,
			UpdatedAt:       plugin.UpdatedAt,
			CreatedAt:       plugin.CreatedAt,
			Feedback:        feedback,
		})
	}

	// create a map of plugins for quick access
	pluginMap := make(map[int]*MarketplacePlugin)
	for _, plugin := range marketplacePlugins {
		pluginMap[plugin.PluginDetailsID] = plugin
	}
	return &MarketplaceManager{
		Store:   store,
		plugins: pluginMap,
	}, nil
}

func (m *MarketplaceManager) AddPlugin(plugin *MarketplacePlugin) error {
	m.plugins[plugin.PluginDetailsID] = plugin
	return nil
}

func (m *MarketplaceManager) RemovePlugin(pluginID int) error {
	delete(m.plugins, pluginID)
	return nil
}

func (m *MarketplaceManager) GetAllPlugins() []*MarketplacePlugin {
	plugins := make([]*MarketplacePlugin, 0, len(m.plugins))
	for _, plugin := range m.plugins {
		plugins = append(plugins, plugin)
	}
	return plugins
}

func (m *MarketplaceManager) GetPluginByID(pluginID int) (*MarketplacePlugin, error) {
	plugin, exists := m.plugins[pluginID]
	if !exists {
		return nil, fmt.Errorf("plugin with ID %d not found", pluginID)
	}
	return plugin, nil
}

func (m *MarketplaceManager) AddFeedback(feedback *models.PluginFeedback, pluginID int) error {
	// Update the plugin's feedback in memory
	if plugin, exists := m.plugins[pluginID]; exists {
		plugin.Feedback = append(plugin.Feedback, *feedback)
	} else {
		return fmt.Errorf("plugin with ID %d not found", pluginID)
	}

	return nil
}

func (m *MarketplaceManager) GetPluginFeedback(pluginID int) ([]models.PluginFeedback, error) {
	plugin, exists := m.plugins[pluginID]
	if !exists {
		return nil, fmt.Errorf("plugin with ID %d not found", pluginID)
	}
	return plugin.Feedback, nil
}

func (m *MarketplaceManager) GetAllPluginTags() []string {
	tagsMap := make(map[string]struct{})
	for _, plugin := range m.plugins {
		for _, tag := range plugin.Tags {
			tagsMap[tag] = struct{}{}
		}
	}
	var tags []string
	for tag := range tagsMap {
		tags = append(tags, tag)
	}
	return tags
}

func (m *MarketplaceManager) GetFeaturedPlugins() []*MarketplacePlugin {
	featuredPlugins := make([]*MarketplacePlugin, 0)
	for _, plugin := range m.plugins {
		if plugin.Featured {
			featuredPlugins = append(featuredPlugins, plugin)
		}
	}
	return featuredPlugins
}

func (m *MarketplaceManager) GetPluginDependencies(pluginID int) (models.DependenciesList, error) {
	plugin, exists := m.plugins[pluginID]
	if !exists {
		return nil, fmt.Errorf("plugin with ID %d not found", pluginID)
	}
	return plugin.Dependencies, nil
}
