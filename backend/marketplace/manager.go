package marketplace

import (
	"github.com/kubestellar/ui/backend/log"
	"github.com/kubestellar/ui/backend/models"
	"go.uber.org/zap"
)

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

type MarketplaceManager struct {
	Store   StorageProvider
	plugins map[int]*models.MarketplacePlugin
}

func NewMarketPlaceManager(store StorageProvider) *MarketplaceManager {
	return &MarketplaceManager{
		Store:   store,
		plugins: make(map[int]*models.MarketplacePlugin),
	}
}
