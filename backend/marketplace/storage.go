package marketplace

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/kubestellar/ui/backend/log"
	"go.uber.org/zap"

	smithyendpoints "github.com/aws/smithy-go/endpoints"

	pluginpkg "github.com/kubestellar/ui/backend/pkg/plugins"
	"gopkg.in/yaml.v2"
)

type StorageProvider interface {
	UploadFile(ctx context.Context, key string, data io.Reader) error
	GetFileURL(ctx context.Context, key string) (string, error)
	DeleteFile(ctx context.Context, key string) error
	DownloadFile(ctx context.Context, key string, storagePath string) error
}

type StorageType string

const (
	StorageR2    StorageType = "r2"
	StorageLocal StorageType = "local"
	StorageGit   StorageType = "git"
)

type StorageConfig struct {
	Type StorageType

	// Git option
	GitRemoteURL string // e.g. https://github.com/user/repo.git
	GitBranch    string // e.g. main
	GitBaseURL   string // raw.githubusercontent.com/...
	GitToken     string // GitHub token for private repos

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
	case StorageGit:
		if cfg.GitRemoteURL == "" || cfg.GitBranch == "" || cfg.GitBaseURL == "" || cfg.GitToken == "" {
			return nil, fmt.Errorf("incomplete git configuration")
		}

		return &GitStorage{
			Remote:     cfg.GitRemoteURL,
			Branch:     cfg.GitBranch,
			PublicBase: cfg.GitBaseURL,
			Token:      cfg.GitToken,
		}, nil

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

func ExtractTarGz(file io.Reader, dest string) error {
	uncompressedFile, err := gzip.NewReader(file)
	if err != nil {
		log.LogError("error creating gzip reader", zap.String("error", err.Error()))
		return err
	}
	defer uncompressedFile.Close()

	tarReader := tar.NewReader(uncompressedFile)

	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.LogError("error reading tar file", zap.String("error", err.Error()))
			return err
		}

		// clean and validate path
		targetPath := filepath.Join(dest, header.Name)

		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(targetPath, os.FileMode(header.Mode)); err != nil {
				log.LogError("error creating directory", zap.String("error", err.Error()))
				return err
			}

		case tar.TypeReg:
			// ensure the parent directory exists

			if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
				log.LogError("error creating parent directory", zap.String("error", err.Error()))
				return err
			}


			// skip macOS metadata files
			if strings.HasPrefix(filepath.Base(header.Name), "._") {
				continue

			}

			f, err := os.Create(targetPath)
			if err != nil {
				log.LogError("error creating file from tar", zap.String("error", err.Error()))
				return err
			}
			defer f.Close()

			if _, err := io.Copy(f, tarReader); err != nil {
				log.LogError("error copying file from tar", zap.String("error", err.Error()))
				return err
			}

		default:
			// skip symlinks and other types for safety
			continue
		}
	}

	return nil
}

func ParsePluginYML(path string) (pluginpkg.PluginManifest, error) {
	manifestData, err := os.ReadFile(path)
	if err != nil {
		log.LogError("error reading plugin manifest file", zap.String("error", err.Error()))
		return pluginpkg.PluginManifest{}, err
	}

	var manifest pluginpkg.PluginManifest
	if err := yaml.Unmarshal(manifestData, &manifest); err != nil {
		log.LogError("error unmarshalling plugin manifest", zap.String("error", err.Error()))
		return pluginpkg.PluginManifest{}, err
	}
	return manifest, nil
}

func CompressTarGz(sourceDir, targetFile string) error {
	f, err := os.Create(targetFile)
	if err != nil {
		log.LogError("error creating tar.gz file", zap.String("error", err.Error()))
		return err
	}
	defer f.Close()

	gz := gzip.NewWriter(f)
	defer gz.Close()

	tw := tar.NewWriter(gz)
	defer tw.Close()

	return filepath.Walk(sourceDir, func(file string, fi os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if file == sourceDir {
			return nil
		}

		relPath, err := filepath.Rel(sourceDir, file)
		if err != nil {
			return err
		}

		hdr, err := tar.FileInfoHeader(fi, relPath)
		if err != nil {
			return err
		}
		hdr.Name = relPath

		if err := tw.WriteHeader(hdr); err != nil {
			return err
		}

		if fi.Mode().IsRegular() {
			srcFile, err := os.Open(file)
			if err != nil {
				return err
			}
			defer srcFile.Close()

			if _, err := io.Copy(tw, srcFile); err != nil {
				return err
			}
		}
		return nil
	})
}
