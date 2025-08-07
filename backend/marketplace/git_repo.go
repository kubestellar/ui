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
	filePath := filepath.Join(g.Local, key)
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
		{"git", "-C", g.Local, "add", key},
		{"git", "-C", g.Local, "commit", "--allow-empty", "-m", fmt.Sprintf("Add %s", key)},
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

func (g *GitStorage) GetFileURL(ctx context.Context, key string) (string, error) {
	if strings.Contains(key, "..") || strings.HasPrefix(key, "/") {
		return "", fmt.Errorf("invalid key path: %s", key)
	}
	cleanBase := strings.TrimSuffix(g.PublicBase, "/")
	return fmt.Sprintf("%s/%s", cleanBase, key), nil // e.g. "https://raw.githubusercontent.com/user/repo/main/plugin-monitor.tar.gz"
}

func (g *GitStorage) DeleteFile(ctx context.Context, key string) error {
	if strings.Contains(key, "..") || strings.HasPrefix(key, "/") {
		return fmt.Errorf("invalid key path: %s", key)
	}

	filePath := filepath.Join(g.Local, key)

	if err := os.Remove(filePath); err != nil {
		return fmt.Errorf("failed to delete local file: %v", err)
	}

	cmds := [][]string{
		{"git", "-C", g.Local, "rm", key},
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
