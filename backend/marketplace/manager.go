package marketplace

import "github.com/kubestellar/ui/backend/models"

type MarketplaceManager struct {
	store   StorageProvider
	plugins map[int]*models.MarketplacePlugin
}

func NewMarketPlaceManager(store StorageProvider) *MarketplaceManager {
	return &MarketplaceManager{
		store:   store,
		plugins: make(map[int]*models.MarketplacePlugin),
	}
}
