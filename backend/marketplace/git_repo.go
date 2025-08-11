package marketplace

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/kubestellar/ui/backend/log"
	"go.uber.org/zap"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/go-git/go-git/v5/plumbing/transport/http"
)

type GitStorage struct {
	Remote     string // e.g. "https://github.com/user/repo.git"
	Branch     string // e.g. "main" - the branch to use
	PublicBase string // base URL to access the files, looks like https://raw.githubusercontent.com/user/repo/main
	Token      string // Github Token / personal access token
}

func (g *GitStorage) UploadFile(ctx context.Context, key string, data io.Reader) error {
	if strings.Contains(key, "..") || strings.HasPrefix(key, "/") {
		return fmt.Errorf("invalid key path: %s", key)
	}

	// clone temporary git repo
	tmpDir, err := os.MkdirTemp("", "plugin-repo-*")
	if err != nil {
		log.LogError("error creating temporary directory", zap.String("error", err.Error()))
		return fmt.Errorf("failed to create temporary directory: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// clone the git repo
	repo, err := git.PlainClone(tmpDir, false, &git.CloneOptions{
		URL:           g.Remote,
		ReferenceName: plumbing.NewBranchReferenceName(g.Branch),
		SingleBranch:  true,
		Depth:         1,
		Auth: &http.BasicAuth{
			Username: "x-access-token",
			Password: g.Token,
		},
	})

	if err != nil {
		log.LogError("error cloning git repository", zap.String("error", err.Error()))
		return fmt.Errorf("failed to clone git repository: %v", err)
	}

	// create a parent directory if needed
	// if the key is "plugin-monitor.tar.gz", we need to create a directory "plugin-monitor"

	baseName := strings.TrimSuffix(key, ".tar.gz")  // e.g. "plugin-monitor"
	localDirPath := filepath.Join(tmpDir, baseName) // e.g. "/tmp/plugin-repo-abc123/plugin-monitor/"
	if err := os.MkdirAll(localDirPath, 0755); err != nil {
		log.LogError("error creating local directory", zap.String("error", err.Error()))
		return fmt.Errorf("failed to create local directory: %v", err)
	}

	filePath := filepath.Join(localDirPath, key) // e.g. "/tmp/plugin-repo-abc123/plugin-monitor/plugin-monitor.tar.gz"
	f, err := os.Create(filePath)
	if err != nil {
		log.LogError("error creating local file", zap.String("error", err.Error()))
		return fmt.Errorf("failed to create local file: %v", err)
	}
	defer f.Close()

	// write the data to the file
	if _, err := io.Copy(f, data); err != nil {
		log.LogError("error writing data to local file", zap.String("error", err.Error()))
		return fmt.Errorf("failed to write data to local file: %v", err)
	}

	// init the worktree
	wt, err := repo.Worktree()
	if err != nil {
		log.LogError("error getting worktree", zap.String("error", err.Error()))
		return fmt.Errorf("failed to get worktree: %v", err)
	}

	// add the file and commit
	if _, err := wt.Add("."); err != nil {
		log.LogError("error adding files to git", zap.String("error", err.Error()))
		return fmt.Errorf("failed to add files to git: %v", err)
	}
	_, err = wt.Commit(fmt.Sprintf("Add %s", key), &git.CommitOptions{
		Author: &object.Signature{
			Name:  "AutoUploader",
			Email: "bot@example.com",
			When:  time.Now(),
		},
	})
	if err != nil {
		return fmt.Errorf("failed to commit: %v", err)
	}

	// push the changes
	if err := repo.Push(&git.PushOptions{
		Auth: &http.BasicAuth{
			Username: "x-access-token",
			Password: g.Token,
		},
	}); err != nil {
		return fmt.Errorf("failed to push: %v", err)
	}

	return nil
}

func (g *GitStorage) GetFileURL(ctx context.Context, key string) (string, error) {
	if strings.Contains(key, "..") || strings.HasPrefix(key, "/") {
		return "", fmt.Errorf("invalid key path: %s", key)
	}
	cleanBase := strings.TrimSuffix(g.PublicBase, "/")
	baseName := strings.TrimSuffix(key, filepath.Ext(key)) // e.g. "plugin-monitor"

	return fmt.Sprintf("%s/%s/%s", cleanBase, baseName, key), nil // e.g. "https://raw.githubusercontent.com/user/repo/main/plugin-monitor.tar.gz"
}

func (g *GitStorage) DeleteFile(ctx context.Context, key string) error {
	if strings.Contains(key, "..") || strings.HasPrefix(key, "/") {
		return fmt.Errorf("invalid key path: %s", key)
	}

	tmpDir, err := os.MkdirTemp("", "plugin-repo-*")
	if err != nil {
		return fmt.Errorf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	repo, err := git.PlainClone(tmpDir, false, &git.CloneOptions{
		URL:           g.Remote,
		ReferenceName: plumbing.NewBranchReferenceName(g.Branch),
		SingleBranch:  true,
		Depth:         1,
		Auth: &http.BasicAuth{
			Username: "x-access-token",
			Password: g.Token,
		},
	})
	if err != nil {
		return fmt.Errorf("failed to clone repo: %v", err)
	}

	baseName := strings.TrimSuffix(key, ".tar.gz")
	filePath := filepath.Join(tmpDir, baseName, key)
	if err := os.Remove(filePath); err != nil {
		return fmt.Errorf("failed to remove file: %v", err)
	}

	wt, err := repo.Worktree()
	if err != nil {
		return fmt.Errorf("failed to get worktree: %v", err)
	}
	if _, err := wt.Remove(filepath.Join(baseName, key)); err != nil {
		return fmt.Errorf("failed to remove from index: %v", err)
	}

	_, err = wt.Commit(fmt.Sprintf("Remove %s", key), &git.CommitOptions{
		Author: &object.Signature{
			Name:  "AutoUploader",
			Email: "bot@example.com",
			When:  time.Now(),
		},
	})
	if err != nil {
		return fmt.Errorf("failed to commit: %v", err)
	}

	if err := repo.Push(&git.PushOptions{
		Auth: &http.BasicAuth{
			Username: "x-access-token",
			Password: g.Token,
		},
	}); err != nil {
		return fmt.Errorf("failed to push: %v", err)
	}

	return nil
}

func (g *GitStorage) DownloadFile(ctx context.Context, key string, storagePath string) error {
	if strings.Contains(key, "..") || strings.Contains(key, "/") || strings.Contains(key, "\\") {
		return fmt.Errorf("invalid key: %s", key)
	}
	if strings.HasPrefix(key, "/") || strings.HasPrefix(key, "\\") {
		return fmt.Errorf("invalid key: %s", key)
	}

	// create a new temporary folder to fetch the plugins from github repo
	tmpDir, err := os.MkdirTemp("", "plugin-repo-*")
	if err != nil {
		return fmt.Errorf("failed to create temp dir: %v", err)
	}

	defer os.RemoveAll(tmpDir)

	// clone git repo
	_, err = git.PlainClone(tmpDir, false, &git.CloneOptions{
		URL:           g.Remote,
		ReferenceName: plumbing.NewBranchReferenceName(g.Branch),
		SingleBranch:  true,
		Depth:         1,
		Auth: &http.BasicAuth{
			Username: "x-access-token",
			Password: g.Token,
		},
	})

	if err != nil {
		return fmt.Errorf("error cloning github repo: %v", err)
	}

	// find the plugin file
	baseName := strings.TrimSuffix(key, ".tar.gz")
	filePath := filepath.Join(tmpDir, baseName, key) // plugin-repo-123/monitor-plugin-1/monitor-plugin-1.tar.gz

	// use the key to create a new folder under the plugins/
	// extract the tar.gz file there

	// get only folder with the name of the key from repo

	// check if the tar file exist
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return fmt.Errorf("file %s does not exist", filePath)
	}

	tarFile, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("error opening tar file: %v", err)
	}
	defer tarFile.Close()

	// ensure the destination exists
	if err := os.MkdirAll(storagePath, 0755); err != nil {
		return fmt.Errorf("failed to create storage path: %v", err)
	}
	destPath := filepath.Join(storagePath, baseName)

	absDest, err := filepath.Abs(destPath)
	if err != nil {
		return fmt.Errorf("failed to get absolute path: %v", err)
	}
	absStorage, err := filepath.Abs(storagePath)
	if err != nil {
		return fmt.Errorf("failed to get absolute path: %v", err)
	}

	if !strings.HasPrefix(absDest, absStorage+string(os.PathSeparator)) {
		return fmt.Errorf("destination path %s is outside of storage path %s", absDest, absStorage)
	}

	// create destination folder
	if err := os.MkdirAll(absDest, 0755); err != nil {
		return fmt.Errorf("failed to create destination path: %v", err)
	}

	// Extract to the destination
	if err := ExtractTarGz(tarFile, absDest); err != nil {
		return fmt.Errorf("error extracting tar file: %v", err)
	}

	return nil
}
