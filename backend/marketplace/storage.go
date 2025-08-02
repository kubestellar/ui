package marketplace

import (
	"context"
	"fmt"
	"io"
	"net/url"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/kubestellar/ui/backend/log"
	"go.uber.org/zap"

	smithyendpoints "github.com/aws/smithy-go/endpoints"
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

	// R2 option
	Bucket    string // r2 bucket name
	AccessKey string
	SecretKey string
	Endpoint  string // e.g. for R2: https://<account>.r2.cloudflarestorage.com

	// local option
	LocalBase string // e.g. location of the plugin files "./data/plugins"
	BaseURL   string // e.g. the URL to get all the plugins http://localhost:8080/marketplace/plugins
}

type staticResolver struct {
	endpointURL string
}

func (r staticResolver) ResolveEndpoint(ctx context.Context, params s3.EndpointParameters) (
	smithyendpoints.Endpoint, error,
) {
	u, err := url.Parse(r.endpointURL)
	if err != nil {
		log.LogError("error parsing resolver endpoint", zap.String("error", err.Error()))
		return smithyendpoints.Endpoint{}, err
	}

	return smithyendpoints.Endpoint{URI: *u}, nil
}

func NewStorageProvider(cfg StorageConfig) (StorageProvider, error) {
	switch cfg.Type {
	case StorageR2:
		if cfg.Endpoint == "" || cfg.AccessKey == "" || cfg.SecretKey == "" {
			return nil, fmt.Errorf("incomplete R2 configuration")
		}

		awsCfg, err := config.LoadDefaultConfig(
			context.TODO(),
			config.WithCredentialsProvider(
				credentials.NewStaticCredentialsProvider(cfg.AccessKey, cfg.SecretKey, ""),
			),
			config.WithRegion("auto"),
		)

		if err != nil {
			log.LogError("error loading AWS configuration", zap.String("error", err.Error()))
			return nil, err
		}

		client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(cfg.Endpoint)
			o.EndpointResolverV2 = staticResolver{
				endpointURL: cfg.Endpoint,
			}
		})

		return &R2Storage{
			Client:     client,
			Bucket:     cfg.Bucket,
			PublicBase: cfg.Endpoint,
		}, nil

	case StorageLocal:
		return &LocalStorage{
			BasePath: cfg.LocalBase,
			BaseURL:  cfg.BaseURL,
		}, nil
	default:
		return nil, nil
	}
}
