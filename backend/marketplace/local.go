package marketplace

import (
	"context"
	"io"
)

type LocalStorage struct {
	BasePath  string
	PublicURL string
}

func (l *LocalStorage) UploadFile(ctx context.Context, key string, data io.Reader) error {
	return nil
}

func (l *LocalStorage) GetFileURL(ctx context.Context, key string) (string, error) {
	return "", nil
}

func (l *LocalStorage) DeleteFile(ctx context.Context, key string) error {
	return nil
}
