package utils

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"io"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/log"
	"go.uber.org/zap"
	"gopkg.in/yaml.v2"

	pluginpkg "github.com/kubestellar/ui/backend/pkg/plugins"
)

func ReadFileContent(file io.Reader) ([]byte, error) {
	buf := new(bytes.Buffer)
	if _, err := io.Copy(buf, file); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// Return the form file bytes
func GetFormFileBytes(fileName string, ctx *gin.Context) ([]byte, error) {
	fh, err := ctx.FormFile(fileName)
	if err != nil {
		return nil, err
	}
	f, err := fh.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()
	Content, err := io.ReadAll(f)
	if err != nil {
		return nil, err
	}
	return Content, nil

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

		targetPath := filepath.Join(dest, header.Name)
		switch header.Typeflag {
		case tar.TypeDir:
			os.MkdirAll(targetPath, os.FileMode(header.Mode))
		case tar.TypeReg:
			f, err := os.Create(targetPath)
			if err != nil {
				log.LogError("error creating file from tar", zap.String("error", err.Error()))
				return err
			}
			if _, err := io.Copy(f, tarReader); err != nil {
				f.Close()
				log.LogError("error copying file from tar", zap.String("error", err.Error()))
				return err
			}
			f.Close()
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
