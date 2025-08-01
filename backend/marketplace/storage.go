package marketplace

import (
	"context"
	"io"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/kubestellar/ui/backend/log"
	"github.com/kubestellar/ui/backend/models"
	"go.uber.org/zap"
)

type StorageProvider interface {
	UploadFile(ctx context.Context, key string, data io.Reader) error
	GetFileURL(ctx context.Context, key string) (string, error)
	DeleteFile(ctx context.Context, key string) error
}

type StorageType string

const (
	StorageR2    StorageType = "r2"
	StorageLocal StorageType = "local"
)

type StorageConfig struct {
	Type StorageType

	Bucket     string
	PublicBase string

	// R2 option
	AccessKey string
	SecretKey string
	Endpoint  string

	// local option
	LocalBase string
}

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

func NewStorageProvider(cfg StorageConfig) (StorageProvider, error) {
	switch cfg.Type {
	case StorageR2:
		awsCfg, err := config.LoadDefaultConfig(context.TODO(),
			config.WithCredentialsProvider(
				credentials.NewStaticCredentialsProvider(cfg.AccessKey, cfg.SecretKey, ""),
			),
			config.WithRegion("auto"),
			config.WithEndpointResolver(R2Resolver{
				URL: cfg.Endpoint,
			}),
		)
		if err != nil {
			log.LogError("error loading aws configuration", zap.String("error", err.Error()))
			return nil, err
		}

		client := s3.NewFromConfig(awsCfg)

		return &R2Storage{
			Client: client,
			Bucket: cfg.Bucket,
		}, nil

	case StorageLocal:
		return &LocalStorage{
			BasePath:  cfg.LocalBase,
			PublicURL: cfg.PublicBase,
		}, nil
	default:
		return nil, nil
	}
}
