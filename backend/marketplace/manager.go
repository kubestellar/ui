package marketplace

import (
	"github.com/kubestellar/ui/backend/log"
	"github.com/kubestellar/ui/backend/models"
	"go.uber.org/zap"

	pluginpkg "github.com/kubestellar/ui/backend/pkg/plugins"
)

type MarketplaceManager struct {
	Store   StorageProvider
	plugins map[int]*models.MarketplacePlugin // maps PluginDetailsID to MarketplacePlugin
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
	GlobalMarketplaceManager = NewMarketPlaceManager(storage)
	return nil
}

func GetGlobalMarketplaceManager() *MarketplaceManager {
	return GlobalMarketplaceManager
}

func NewMarketPlaceManager(store StorageProvider) *MarketplaceManager {
	// retrieve existing plugins from the database
	plugins, err := pluginpkg.GetAllMarketplacePlugins()
	if err != nil {
		log.LogError("error getting all marketplace plugins", zap.String("error", err.Error()))
		return nil
	}
	// create a map of plugins for quick access
	pluginMap := make(map[int]*models.MarketplacePlugin)
	for _, plugin := range plugins {
		pluginMap[plugin.PluginDetailsID] = plugin
	}
	return &MarketplaceManager{
		Store:   store,
		plugins: pluginMap,
	}
}

func (m *MarketplaceManager) AddPlugin(plugin *models.MarketplacePlugin) error {
	m.plugins[plugin.PluginDetailsID] = plugin
	return nil
}

func (m *MarketplaceManager) RemovePlugin(pluginID int) error {
	delete(m.plugins, pluginID)
	return nil
}

func (m *MarketplaceManager) GetAllPlugins() []*models.MarketplacePlugin {
	plugins := make([]*models.MarketplacePlugin, 0, len(m.plugins))
	for _, plugin := range m.plugins {
		plugins = append(plugins, plugin)
	}
	return plugins
}
