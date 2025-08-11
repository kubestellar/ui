package marketplace

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/kubestellar/ui/backend/log"
	"go.uber.org/zap"
)

type R2Storage struct {
	Client     *s3.Client
	Bucket     string // bucket key
	PublicBase string
}

type R2Resolver struct {
	URL string
}

func (r *R2Storage) UploadFile(ctx context.Context, key string, data io.Reader) error {
	_, err := r.Client.PutObject(ctx, &s3.PutObjectInput{
		ContentType: aws.String("application/gzip"),
		Bucket:      aws.String(r.Bucket),
		Key:         aws.String(key),
		Body:        data,
	})
	if err != nil {
		log.LogError("error s3 client couldn't put object", zap.String("error", err.Error()))
		return err
	}
	return nil
}

func (r *R2Storage) GetFileURL(ctx context.Context, key string) (string, error) {
	cleanBase := strings.TrimSuffix(r.PublicBase, "/")
	return fmt.Sprintf("%s/%s", cleanBase, key), nil
}

func (r *R2Storage) DeleteFile(ctx context.Context, key string) error {
	_, err := r.Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(r.Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		log.LogError("error delete s3 client object", zap.String("error", err.Error()))
		return err
	}
	return nil
}

func (r *R2Storage) DownloadFile(ctx context.Context, key string, storagePath string) error {
	return nil
}
