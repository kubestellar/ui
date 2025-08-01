package marketplace

import (
	"context"
	"io"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/kubestellar/ui/backend/log"
	"go.uber.org/zap"
)

type R2Storage struct {
	Client *s3.Client
	Bucket string // bucket key
}

type R2Resolver struct {
	URL string
}

func (r R2Resolver) ResolveEndpoint(service, region string) (aws.Endpoint, error) {
	return aws.Endpoint{
		URL:           r.URL,
		SigningRegion: "auto",
	}, nil
}

func (r *R2Storage) UploadFile(ctx context.Context, key string, data io.Reader) error {
	_, err := r.Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(r.Bucket),
		Key:    aws.String(key),
		Body:   data,
	})
	if err != nil {
		log.LogError("error s3 client couldn't put object", zap.String("error", err.Error()))
		return err
	}
	return nil
}

func (r *R2Storage) GetFileURL(ctx context.Context, key string) (string, error) {
	return "", nil
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
