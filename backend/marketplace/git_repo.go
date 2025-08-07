package marketplace

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/kubestellar/ui/backend/log"
	"go.uber.org/zap"
)

type GitStorage struct {
	Remote     string // e.g. "https://github.com/user/repo.git"
	Local      string // e.g. "../../../plugin-storage" - it's a local path where the git storage repo is cloned
	Branch     string // e.g. "main" - the branch to use
	PublicBase string // base URL to access the files, looks like https://raw.githubusercontent.com/user/repo/main
}

func (g *GitStorage) UploadFile(ctx context.Context, key string, data io.Reader) error {
	if strings.Contains(key, "..") || strings.HasPrefix(key, "/") {
		return fmt.Errorf("invalid key path: %s", key)
	}

	// create a parent directory if needed
	// if the key is "plugin-monitor.tar.gz", we need to create a directory "plugin-monitor" in the local path

	baseName := strings.TrimSuffix(key, ".tar.gz")   // e.g. "plugin-monitor"
	localDirPath := filepath.Join(g.Local, baseName) // e.g. "../../../plugin-storage/plugin-monitor"
	filePath := filepath.Join(localDirPath, key)     // e.g. "../../../plugin-storage/plugin-monitor/plugin-monitor.tar.gz"
	if err := os.MkdirAll(filepath.Dir(filePath), os.ModePerm); err != nil {
		return err
	}

	// save data to file
	outFile, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer outFile.Close()

	if _, err := io.Copy(outFile, data); err != nil {
		return err
	}

	// git command
	cmds := [][]string{
		{"git", "-C", localDirPath, "add", key},
		{"git", "-C", localDirPath, "commit", "--allow-empty", "-m", fmt.Sprintf("Add %s", key)},
		{"git", "-C", localDirPath, "push", "origin", g.Branch},
	}

	for _, cmdArgs := range cmds {
		cmd := exec.CommandContext(ctx, cmdArgs[0], cmdArgs[1:]...)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			log.LogError("error running git command", zap.String("command", strings.Join(cmdArgs, " ")), zap.String("error", err.Error()))
			return fmt.Errorf("failed to run git command: %v", err)
		}
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

	baseName := strings.TrimSuffix(key, ".tar.gz")
	localDirPath := filepath.Join(g.Local, baseName) // e.g. "../../../plugin-storage/plugin-monitor"
	filePath := filepath.Join(localDirPath, key)

	if err := os.Remove(filePath); err != nil {
		return fmt.Errorf("failed to delete local file: %v", err)
	}

	cmds := [][]string{
		{"git", "-C", g.Local, "add", "-u"},
		{"git", "-C", g.Local, "commit", "--allow-empty", "-m", fmt.Sprintf("Remove %s", key)},
		{"git", "-C", g.Local, "push", "origin", g.Branch},
	}

	for _, cmdArgs := range cmds {
		cmd := exec.CommandContext(ctx, cmdArgs[0], cmdArgs[1:]...)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			log.LogError("error running git command", zap.String("command", strings.Join(cmdArgs, " ")), zap.String("error", err.Error()))
			return fmt.Errorf("failed to run git command: %v", err)
		}
	}

	return nil
}
