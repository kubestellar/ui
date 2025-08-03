package api

import (
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/log"
	"github.com/kubestellar/ui/backend/marketplace"
	"github.com/kubestellar/ui/backend/models"
	pluginpkg "github.com/kubestellar/ui/backend/pkg/plugins"
	"github.com/kubestellar/ui/backend/utils"
	"go.uber.org/zap"
)

func HandleFile(c *gin.Context, file multipart.File, header *multipart.FileHeader) (string, *os.File, error) {
	// steps (it's pretty similar to the handler for installing plugins):
	// 1. Extract tar.gz file temporarily and read .yml file to get plugin details
	// 2. Check if plugin exists in DB by plugin name, description, version, and author ID
	// 3. If exists, return error
	// 4. If not exists, create a new plugin entry in the DB and get the plugin ID (we should have a fallback if there's any error after this step)
	// 5. Compress the plugin file "pluginName-pluginId.tar.gz" and return

	// 1. Extract tar.gz file
	tempDir, err := os.MkdirTemp("", "plugin-upload")
	if err != nil {
		log.LogError("error creating temp directory", zap.String("error", err.Error()))
		return "", nil, err
	}
	defer os.RemoveAll(tempDir)

	err = utils.ExtractTarGz(file, tempDir)
	if err != nil {
		log.LogError("error extracting tar.gz file", zap.String("error", err.Error()))
		return "", nil, err
	}

	// read plugin.yml
	pluginYAMLPath := filepath.Join(tempDir, "plugin.yml")
	manifest, err := utils.ParsePluginYML(pluginYAMLPath)
	if err != nil {
		log.LogError("error parsing plugin.yml", zap.String("error", err.Error()))
		return "", nil, err
	}

	// 2. Check if plugin exists in the DB
	// get author's ID from DB
	author, err := models.GetUserByUsername(manifest.Metadata.Author)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Unable to get author from database: " + manifest.Metadata.Author,
		})
		log.LogError("unable to get author from database", zap.String("author", manifest.Metadata.Author), zap.Error(err))
		return "", nil, err
	}
	if author == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Author not found in database: " + manifest.Metadata.Author,
		})
		log.LogInfo("author not found", zap.String("author", manifest.Metadata.Author))
		return "", nil, err
	}

	// 3. If exists
	existed, err := pluginpkg.CheckPluginDetailsExist(manifest.Metadata.Name, manifest.Metadata.Version, manifest.Metadata.Description, author.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Error checking plugin exists: " + manifest.Metadata.Name,
		})
		log.LogError("error checking plugin exists", zap.String("error", err.Error()))
		return "", nil, err
	}
	if existed {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Plugin already installed: " + manifest.Metadata.Name,
		})
		log.LogWarn("plugin already installed", zap.String("plugin", manifest.Metadata.Name))
		return "", nil, err
	}

	// 4. Not exists, add to DB
	// add to plugin_details table
	pluginDetailsID, err := pluginpkg.AddPluginToDB(
		manifest.Metadata.Name,
		manifest.Metadata.Version,
		manifest.Metadata.Description,
		author.ID,
		"kubestellar.io",
		"unknown",
		"unknown",
		[]string{"monitoring", "cluster"},
		"0.0.1",  // will change this after we have a versioning system
		"0.28.0", // will change this after we have a versioning system
		[]byte(`{"dependencies": "not mentioned"}`),
		"unknown",
		int(header.Size),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Unable to add plugin to database " + manifest.Metadata.Name,
		})
		log.LogError("unable to add plugin to database", zap.String("error", err.Error()))

		return "", nil, err
	}

	// add to marketplace_plugins table
	err = pluginpkg.AddMarketplacePluginToDB(
		pluginDetailsID,
		false,      // featured
		false,      // verified
		"free",     // price type
		0,          // price
		"USD",      // currency
		0,          // rating average
		0,          // rating count
		0,          // downloads
		0,          // active installs
		time.Now(), // published at
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Unable to add plugin to marketplace " + manifest.Metadata.Name,
		})
		log.LogError("unable to add plugin to marketplace", zap.String("error", err.Error()))
		return "", nil, err
	}

	// 5. Compress the plugin file
	newFileName := manifest.Metadata.Name + "-" + strconv.Itoa(pluginDetailsID) + ".tar.gz"
	newTarPath := filepath.Join(os.TempDir(), newFileName)
	err = utils.CompressTarGz(tempDir, newTarPath)
	if err != nil {
		log.LogError("error compressing tar.gz file", zap.String("error", err.Error()))
		return "", nil, err
	}
	newFile, err := os.Open(newTarPath)
	if err != nil {
		log.LogError("error opening new tar.gz file", zap.String("error", err.Error()))
		return "", nil, err
	}

	return newTarPath, newFile, nil
}

func UploadPluginHandler(c *gin.Context) {
	// TODO: check the user is admin or has write permission
	isAdmin, isAdminExists := c.Get("is_admin")
	permissions, permissionExists := c.Get("permissions")
	if !isAdminExists && !permissionExists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User is not authorized to upload plugins"})
		log.LogError("user is not authorized to upload plugins")
		return
	}
	// check the user write permission on resources
	haveWritePermission := permissions.(map[string]string)["resources"] == "write"
	if !isAdmin.(bool) && !haveWritePermission {
		c.JSON(http.StatusForbidden, gin.H{"error": "User does not have permission to upload plugins"})
		log.LogError(
			"user does not have permission to upload plugins",
			zap.Bool("is_admin", isAdmin.(bool)),
			zap.Any("permissions", permissions),
		)
		return
	}

	// get form file
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
		log.LogError("error getting file from request", zap.String("error", err.Error()))
		return
	}

	defer file.Close()

	// Validate file type
	if !strings.HasSuffix(header.Filename, ".tar.gz") {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid file type. Please upload a .tar.gz file",
		})
		return
	}

	// TODO: change the key to pluginName-pluginId

	newTarPath, newFile, err := HandleFile(c, file, header)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to handle file"})
		log.LogError("error handling file", zap.String("error", err.Error()))
		return
	}
	defer func() {
		os.Remove(newTarPath)
		newFile.Close()
	}()

	// get plugin key - e.g. monitor-plugin
	// get the key from the newTarPath by remove the prefix of os.TempDir()
	key := filepath.Base(newTarPath)

	// check the global manager
	manager := marketplace.GetGlobalMarketplaceManager()
	if manager == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Marketplace manager not initialized"})
		log.LogError("marketplace manager not initialized", zap.String("manager", "nil"))
		return
	}

	// upload to storage
	err = manager.Store.UploadFile(c.Request.Context(), key, newFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "unable to upload plugin file"})
		log.LogError("error uploading plugin file", zap.String("error", err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin uploaded successfully",
		"key":     key,
	})
}
