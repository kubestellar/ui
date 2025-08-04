package api

import (
	"errors"
	"fmt"
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

	err = marketplace.ExtractTarGz(file, tempDir)
	if err != nil {
		log.LogError("error extracting tar.gz file", zap.String("error", err.Error()))
		return "", nil, err
	}

	// read plugin.yml
	pluginYAMLPath := filepath.Join(tempDir, "plugin.yml")
	manifest, err := marketplace.ParsePluginYML(pluginYAMLPath)
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
		[]byte(`[{"dependencies": "not mentioned"}]`),
		"unknown", // update this with the pluginID-pluginName.tar.gz
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
	marketplaceID, err := pluginpkg.AddMarketplacePluginToDB(
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

	// add to manager
	marketplacePlugin := &models.MarketplacePlugin{
		ID:              marketplaceID,
		PluginDetailsID: pluginDetailsID,
		Featured:        false,
		Verified:        false,
		PriceType:       "free",
		Price:           0,
		Currency:        "USD",
		RatingAverage:   0,
		RatingCount:     0,
		Downloads:       0,
		ActiveInstalls:  0,
		PublishedAt:     time.Now(),
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	manager := marketplace.GetGlobalMarketplaceManager()
	if manager == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Marketplace manager not initialized",
		})
		log.LogError("marketplace manager not initialized", zap.String("manager", "nil"))
		return "", nil, errors.New("marketplace manager not initialized")
	}
	err = manager.AddPlugin(marketplacePlugin)
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
	err = marketplace.CompressTarGz(tempDir, newTarPath)
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

func DeleteMarketplacePluginHandler(c *gin.Context) {
	isAdmin, isAdminExists := c.Get("is_admin")
	permission, permissionExists := c.Get("permissions")
	if !isAdminExists && !permissionExists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unable to check user permissions"})
		log.LogError(
			"request context does not have user permissions/is_admin",
			zap.Bool("is_admin_exists", isAdminExists),
			zap.Bool("permission_exists", permissionExists),
		)
		return
	}

	permMap, ok := permission.(map[string]string)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid permissions format"})
		log.LogError("invalid permissions format", zap.Any("permissions", permission))
		return

	}
	haveWritePermission := permMap["resources"] == "write"
	if !isAdmin.(bool) && !haveWritePermission {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User does not have permission to delete plugins"})
		log.LogError(
			"user does not have permission to delete plugins",
			zap.Bool("is_admin", isAdmin.(bool)),
			zap.Any("permissions", permission),
		)
		return
	}

	// get plugin ID from URL
	pluginIDStr := c.Param("id")
	pluginID, err := strconv.Atoi(pluginIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plugin ID"})
		log.LogError(
			"error converting plugin ID from string to int",
			zap.String("plugin_id", pluginIDStr),
			zap.String("error", err.Error()),
		)
		return
	}

	// check if plugin exists
	exists, err := pluginpkg.CheckPluginDetailsExistByID(pluginID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check plugin existence"})
		log.LogError("error checking plugin existence", zap.Int("plugin_id", pluginID), zap.String("error", err.Error()))
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		log.LogWarn("plugin not found", zap.Int("plugin_id", pluginID))
		return
	}

	// delete from storage
	manager := marketplace.GetGlobalMarketplaceManager()
	if manager == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Marketplace manager not initialized"})
		log.LogWarn("marketplace manager not initialized", zap.Any("manager", manager))
		return
	}

	// get the plugin key - e.g. monitor-plugin-123.tar.gz
	pluginDetails, err := pluginpkg.GetPluginDetailsByID(pluginID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get plugin details"})
		log.LogError("error getting plugin details", zap.Int("plugin_id", pluginID), zap.String("error", err.Error()))
		return
	}

	key := fmt.Sprintf("%s-%d.tar.gz", pluginDetails.Name, pluginID)
	err = manager.Store.DeleteFile(c.Request.Context(), key)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			log.LogWarn("plugin file not found in storage", zap.String("key", key))
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete plugin file from storage"})
			log.LogError("error deleting plugin file from storage", zap.String("key", key), zap.String("error", err.Error()))
			return
		}
	}

	// remove from marketplace manager
	err = manager.RemovePlugin(pluginID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove plugin from marketplace manager"})
		log.LogError("error removing plugin from marketplace manager", zap.Int("plugin_id", pluginID), zap.String("error", err.Error()))
		return
	}

	// we may need to implement a backup in case any error occurs afterwards, we will need to rollback the deletion
	// can use database transaction or soft delete

	// delete from database - only need to delete from plugin_details AS there's foreign key constraint
	err = pluginpkg.DeletePluginDetailsByID(pluginID)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			log.LogWarn("plugin details not found in database", zap.Int("plugin_id", pluginID))
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete plugin from database"})
			log.LogError("error deleting plugin from database", zap.Int("plugin_id", pluginID), zap.String("error", err.Error()))
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Plugin deleted successfully",
		"plugin_id": pluginID,
	})
}

type MarketplacePlugin struct {
	PluginDetailsID int                     `json:"plugin_id"`
	PluginName      string                  `json:"plugin_name"`
	Author          string                  `json:"author"`
	Description     string                  `json:"description"`
	Version         string                  `json:"version"`
	RatingAverage   float32                 `json:"rating_average"`
	Downloads       int                     `json:"downloads"`
	License         string                  `json:"license"`
	Tags            []string                `json:"tags"`
	MinVersion      string                  `json:"min_version"`
	MaxVersion      string                  `json:"max_version"`
	Dependencies    models.DependenciesList `json:"dependencies"`
	UpdatedAt       time.Time               `json:"updated_at"`
	CreatedAt       time.Time               `json:"created_at"`
	Feedback        []models.PluginFeedback `json:"feedback"`
}

func getMarketplacePluginDetails(plugin *models.MarketplacePlugin) (*MarketplacePlugin, error) {
	pluginDetails, err := pluginpkg.GetPluginDetailsByID(plugin.PluginDetailsID)
	if err != nil {
		return nil, fmt.Errorf("failed to get plugin details: %w", err)
	}
	// get author name
	author, err := models.GetUserByID(pluginDetails.AuthorID)
	if err != nil {
		return nil, fmt.Errorf("failed to get author: %w", err)
	}

	// get feedback
	feedback, err := pluginpkg.GetPluginFeedback(plugin.ID) // use the marketplace plugin ID
	if err != nil {
		return nil, fmt.Errorf("failed to get feedback: %w", err)
	}

	return &MarketplacePlugin{
		PluginDetailsID: plugin.PluginDetailsID,
		PluginName:      pluginDetails.Name,
		Author:          author.Username,
		Description:     pluginDetails.Description,
		Version:         pluginDetails.Version,
		RatingAverage:   plugin.RatingAverage,
		Downloads:       plugin.Downloads,
		License:         pluginDetails.License,
		Tags:            pluginDetails.Tags,
		MinVersion:      pluginDetails.MinKubeStellarVersion,
		MaxVersion:      pluginDetails.MaxKubeStellarVersion,
		Dependencies:    pluginDetails.Dependencies,
		UpdatedAt:       plugin.UpdatedAt,
		CreatedAt:       plugin.CreatedAt,
		Feedback:        feedback,
	}, nil
}

func GetAllMarketplacePluginsHandler(c *gin.Context) {
	var marketplacePlugins []MarketplacePlugin
	marketplaceManager := marketplace.GetGlobalMarketplaceManager()
	if marketplaceManager == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Marketplace manager not initialized"})
		log.LogError("marketplace manager not initialized", zap.String("manager", "nil"))
		return
	}
	for _, plugin := range marketplaceManager.GetAllPlugins() {
		// get the plugin details from the database by plugin_details ID
		pluginAllInfo, err := getMarketplacePluginDetails(plugin)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get plugin details"})
			log.LogError("error getting plugin details", zap.Int("plugin_id", plugin.ID), zap.String("error", err.Error()))
			return
		}
		marketplacePlugins = append(marketplacePlugins, *pluginAllInfo)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":             "Marketplace plugins retrieved successfully",
		"marketplace_plugins": marketplacePlugins,
	})
}

func GetSingleMarketplacePluginHandler(c *gin.Context) {
	pluginIDStr := c.Param("id")
	pluginID, err := strconv.Atoi(pluginIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plugin ID"})
		log.LogError(
			"error converting plugin ID from string to int",
			zap.String("plugin_id", pluginIDStr),
			zap.String("error", err.Error()),
		)
		return
	}

	marketplaceManager := marketplace.GetGlobalMarketplaceManager()
	if marketplaceManager == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Marketplace manager not initialized"})
		log.LogError("marketplace manager not initialized", zap.String("manager", "nil"))
		return
	}

	plugin, err := marketplaceManager.GetPluginByID(pluginID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get plugin from marketplace manager"})
		log.LogError("error getting plugin from marketplace", zap.Int("plugin_id", pluginID), zap.String("error", err.Error()))
		return
	}
	if plugin == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found in marketplace"})
		log.LogWarn("plugin not found in marketplace", zap.Int("plugin_id", pluginID))
		return
	}

	pluginDetails, err := getMarketplacePluginDetails(plugin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get plugin details from marketplace"})
		log.LogError("error getting plugin details from marketplace", zap.Int("plugin_id", plugin.ID), zap.String("error", err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":            "Marketplace plugin retrieved successfully",
		"marketplace_plugin": pluginDetails,
	})
}

func GetMarketplacePluginReviewsHandler(c *gin.Context) {
	pluginIDStr := c.Param("id")
	pluginID, err := strconv.Atoi(pluginIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plugin ID"})
		log.LogError(
			"error converting plugin ID from string to int",
			zap.String("plugin_id", pluginIDStr),
			zap.String("error", err.Error()),
		)
		return
	}

	// find the corresponding marketplace_plugin_ID
	marketplacePluginID, err := pluginpkg.GetMarketplacePluginID(pluginID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get marketplace plugin ID"})
		log.LogError("error getting marketplace plugin ID", zap.Int("plugin_id", pluginID), zap.String("error", err.Error()))
		return
	}

	reviews, err := pluginpkg.GetPluginFeedback(marketplacePluginID) // use the marketplace plugin ID
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get plugin reviews"})
		log.LogError("error getting plugin reviews", zap.Int("plugin_id", pluginID), zap.String("error", err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin reviews retrieved successfully",
		"reviews": reviews,
	})
}

func SubmitMarketplacePluginFeedbackHandler(c *gin.Context) {
	// TODO: the proper pluginID field in the models.PluginFeedback should be marketplace_plugin_ID
	// but currently we are using pluginID as the plugin_details_ID
	var feedback models.PluginFeedback
	if err := c.ShouldBindJSON(&feedback); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feedback format"})
		log.LogError("error binding JSON to feedback", zap.String("error", err.Error()))
		return
	}

	// find the corresponding marketplace_plugin_ID
	marketplacePluginID, err := pluginpkg.GetMarketplacePluginID(feedback.PluginID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get marketplace plugin ID"})
		log.LogError("error getting marketplace plugin ID", zap.Int("plugin_id", feedback.PluginID), zap.String("error", err.Error()))
		return
	}

	// add to the database and get the ID
	err = pluginpkg.AddPluginFeedbackToDB(
		marketplacePluginID, feedback.UserID, feedback.Rating, feedback.Comment, feedback.Suggestions,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add feedback to database"})
		log.LogError("error adding feedback to database", zap.String("error", err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Feedback submitted successfully",
		"feedback": gin.H{
			"plugin_id":             feedback.PluginID,
			"marketplace_plugin_id": marketplacePluginID,
			"user_id":               feedback.UserID,
			"rating":                feedback.Rating,
			"comment":               feedback.Comment,
			"suggestions":           feedback.Suggestions,
			"created_at":            feedback.CreatedAt,
			"updated_at":            feedback.UpdatedAt,
		},
	})
}
