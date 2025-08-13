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

func HandlePluginFile(c *gin.Context, file multipart.File, header *multipart.FileHeader) (string, *os.File, error) {
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
			"error": "Plugin already uploaded: " + manifest.Metadata.Name,
		})
		log.LogWarn("plugin already uploaded", zap.String("plugin", manifest.Metadata.Name))
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
		"unknown", // TODO: update this with the pluginID-pluginName.tar.gz
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

	// add to manager
	marketplacePlugin := &marketplace.MarketplacePlugin{
		PluginDetailsID: pluginDetailsID,
		PluginName:      manifest.Metadata.Name,
		Author:          manifest.Metadata.Author,
		Description:     manifest.Metadata.Description,
		Version:         manifest.Metadata.Version,
		Featured:        false, // default to false, can be updated later
		RatingAverage:   0,
		RatingCount:     0,
		Downloads:       0,
		ActiveInstalls:  0,
		License:         "unknown",                         // manifest.Metadata.License,
		Tags:            []string{"monitoring", "cluster"}, // manifest.Metadata.Tags,
		MinVersion:      "0.0.1",                           // manifest.Metadata.MinVersion,
		MaxVersion:      "0.28.0",                          //manifest.Metadata.MaxVersion,
		Dependencies:    []models.Dependencies{},           //manifest.Metadata.Dependencies,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
		Feedback:        []models.PluginFeedback{},
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

	newTarPath, newFile, err := HandlePluginFile(c, file, header)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to handle file"})
		log.LogError("error handling file", zap.String("error", err.Error()))
		return
	}
	defer func() {
		os.Remove(newTarPath)
		newFile.Close()
	}()

	// get plugin key - e.g. cluster-monitor-marketplace-24.tar.gz
	// get the key from the newTarPath by remove the prefix of os.TempDir()
	key := filepath.Base(newTarPath)

	log.LogInfo("PLUGIN KEY", zap.String("key", key))

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

func GetAllMarketplacePluginsHandler(c *gin.Context) {
	marketplaceManager := marketplace.GetGlobalMarketplaceManager()
	if marketplaceManager == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Marketplace manager not initialized"})
		log.LogError("marketplace manager not initialized", zap.String("manager", "nil"))
		return
	}
	marketplacePlugins := marketplaceManager.GetAllPlugins()

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

	c.JSON(http.StatusOK, gin.H{
		"message":            "Marketplace plugin retrieved successfully",
		"marketplace_plugin": plugin,
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

	marketplaceManager := marketplace.GetGlobalMarketplaceManager()
	if marketplaceManager == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Marketplace manager not initialized"})
		log.LogError("marketplace manager not initialized", zap.String("manager", "nil"))
		return
	}

	reviews, err := marketplaceManager.GetPluginFeedback(pluginID)
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
	// TODO: update the plugin rating average and count for both manager and database
	var feedback models.PluginFeedback
	if err := c.ShouldBindJSON(&feedback); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feedback format"})
		log.LogError("error binding JSON to feedback", zap.String("error", err.Error()))
		return
	}

	// check if the feedback.PluginID matches with the plugin_id parameter
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
	if feedback.PluginID != pluginID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plugin ID in feedback does not match with the plugin ID in the URL"})
		log.LogError(
			"plugin ID in feedback does not match with the plugin ID in the URL",
			zap.Int("feedback_plugin_id", feedback.PluginID),
			zap.Int("url_plugin_id", pluginID),
		)
		return
	}

	// find the corresponding marketplace_plugin_ID
	// we need to do this because the plugin_feedback table uses marketplace_plugin_ID
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
	// add to the marketplace manager
	manager := marketplace.GetGlobalMarketplaceManager()
	if manager == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Marketplace manager not initialized"})
		log.LogError("marketplace manager not initialized", zap.String("manager", "nil"))
		return
	}
	err = manager.AddFeedback(&feedback, feedback.PluginID)

	// update the plugin rating average and count in the DB
	ratingAvg, err := manager.GetRatingAverage(feedback.PluginID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get rating average"})
		log.LogError("error getting rating average", zap.Int("plugin_id", feedback.PluginID), zap.String("error", err.Error()))
		return
	}

	ratingCnt, err := manager.GetRatingCount(feedback.PluginID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get rating count"})
		log.LogError("error getting rating count", zap.Int("plugin_id", feedback.PluginID), zap.String("error", err.Error()))
		return
	}

	err = pluginpkg.UpdateRating(feedback.PluginID, ratingAvg, ratingCnt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update plugin rating in database"})
		log.LogError(
			"error updating plugin rating in database",
			zap.Int("plugin_id", feedback.PluginID),
			zap.String("error", err.Error()),
		)
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

func GetMarketplacePluginCategoriesHandler(c *gin.Context) {
	// get all the marketplace plugins tags
	marketplaceManager := marketplace.GetGlobalMarketplaceManager()
	if marketplaceManager == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Marketplace manager not initialized"})
		log.LogError("marketplace manager not initialized", zap.String("manager", "nil"))
		return
	}
	tags := marketplaceManager.GetAllPluginTags()
	if tags == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No marketplace plugins found"})
		log.LogWarn("no marketplace plugins found", zap.String("tags", "nil"))
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "Marketplace plugin categories retrieved successfully",
		"tags":    tags,
	})
}

func GetMarketplaceFeaturedPluginsHandler(c *gin.Context) {
	// get all featured marketplace plugins from database
	marketplaceManager := marketplace.GetGlobalMarketplaceManager()
	if marketplaceManager == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Marketplace manager not initialized"})
		log.LogError("marketplace manager not initialized", zap.String("manager", "nil"))
		return
	}
	featuredPlugins := marketplaceManager.GetFeaturedPlugins()

	c.JSON(http.StatusOK, gin.H{
		"message": "Featured marketplace plugins retrieved successfully",
		"plugins": featuredPlugins,
	})
}

func GetMarketplacePluginDependenciesHandler(c *gin.Context) {
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

	dependencies, err := marketplaceManager.GetPluginDependencies(pluginID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get plugin dependencies"})
		log.LogError("error getting plugin dependencies", zap.Int("plugin_id", pluginID), zap.String("error", err.Error()))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Plugin dependencies retrieved successfully",
		"dependencies": dependencies,
	})
}

// handler for search plugins with parameters name, author, description, tags
// filter by tags/categories, sort by rating, downloads, recent created
func SearchMarketplacePluginsHandler(c *gin.Context) {
	// get search keyword
	keyword := strings.ToLower(c.Query("keyword"))
	sortBy := c.DefaultQuery("sort_by", "created_at") // default to created_at
	filterTag := strings.ToLower(c.Query("tag"))      // single tag

	manager := marketplace.GetGlobalMarketplaceManager()
	if manager == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Marketplace manager not initialized"})
		log.LogError("marketplace manager not initialized", zap.String("manager", "nil"))
		return
	}

	plugins := manager.SearchPlugins(keyword, sortBy, filterTag)

	c.JSON(http.StatusOK, gin.H{
		"message": "Marketplace plugins search successfully",
		"filters": gin.H{
			"keyword": keyword,
			"sort":    sortBy,
			"tag":     filterTag,
		},
		"plugins": plugins,
	})
}

// pull the tar.gz from git repo, extract it to plugins/ folder
// save info to database
func InstallMarketplacePluginHandler(c *gin.Context) {
	// mark starting time for the LoadTime of the plugin
	startTime := time.Now()

	pluginIDStr := c.Param("id")
	pluginID, err := strconv.Atoi(pluginIDStr)
	if err != nil {
		log.LogError(
			"error converting plugin ID from string to int",
			zap.String("plugin_id", pluginIDStr),
			zap.String("error", err.Error()),
		)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plugin ID"})
		return
	}

	// get the current user id
	userIDStr, exists := c.Get("user_id")
	if !exists {
		log.LogError("user ID not found in the request context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userID := userIDStr.(int)

	// get the plugin name
	marketplaceManager := marketplace.GetGlobalMarketplaceManager()
	if marketplaceManager == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Marketplace manager not initialized"})
		log.LogError("marketplace manager not initialized", zap.String("manager", "nil"))
		return
	}

	plugin, err := marketplaceManager.GetPluginByID(pluginID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get plugin from marketplace manager"})
		log.LogError("error getting plugin from marketplace manager", zap.Int("plugin_id", pluginID), zap.String("error", err.Error()))
		return
	}

	pluginKey := fmt.Sprintf("%s-%d", plugin.PluginName, pluginID)
	fileKey := fmt.Sprintf("%s.tar.gz", pluginKey)

	// download the plugin from git repo and extract it to plugins/ folder
	pluginFolder := filepath.Join(".", "plugins")

	err = marketplaceManager.Store.DownloadFile(c.Request.Context(), fileKey, pluginFolder)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":         "failed to download plugin to folder",
			"plugin":        pluginKey,
			"plugin_folder": pluginFolder,
		})
		log.LogError(
			"error downloading plugin",
			zap.String("plugin_key", pluginKey),
			zap.String("plugin_folder_destination", pluginFolder),
			zap.String("error", err.Error()),
		)
		return
	}

	// update the installed_plugins table
	marketplacePluginID, err := pluginpkg.GetMarketplacePluginID(pluginID)
	if err != nil {
		log.LogError("error getting marketplace plugin ID", zap.Int("plugin_id", pluginID), zap.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get marketplace plugin ID"})
		return
	}
	installedPath := filepath.Join(pluginFolder, pluginKey)

	installedPlugin := &models.InstalledPlugin{
		PluginDetailsID:     pluginID,
		MarketplacePluginID: &marketplacePluginID,
		UserID:              userID,
		InstalledMethod:     "marketplace",
		Enabled:             true,
		Status:              "active",
		InstalledPath:       installedPath,
		LoadTime:            int(time.Since(startTime).Milliseconds()),
	}

	// add to DB
	installedPluginID, err := pluginpkg.AddInstalledPluginToDB(
		installedPlugin.PluginDetailsID,
		installedPlugin.MarketplacePluginID,
		installedPlugin.UserID,
		installedPlugin.InstalledMethod,
		installedPlugin.Enabled,
		installedPlugin.Status,
		installedPlugin.InstalledPath,
		installedPlugin.LoadTime,
	)
	if err != nil {
		log.LogError(
			"error adding installed plugin to DB",
			zap.Int("plugin_details_id", installedPlugin.PluginDetailsID),
			zap.String("error", err.Error()),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add installed plugin to database"})
		return
	}
	log.LogInfo("installed plugin ID", zap.Int("installed_plugin_id", installedPluginID))

	pluginManager := GetGlobalPluginManager()
	if pluginManager == nil {
		log.LogError("Plugin manager not available", zap.String("plugin", pluginKey))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Plugin manager not available"})
		return
	}

	// use installed plugin id for creating newly created plugin directpry
	pluginKey = fmt.Sprintf("%s-%d", plugin.PluginName, installedPluginID)

	newInstalledPath := filepath.Join(pluginFolder, pluginKey)

	// Rename the directory
	renameErr := os.Rename(installedPath, newInstalledPath)
	if renameErr != nil {
		log.LogError("Error renaming directory:", zap.Error(renameErr))
		return
	}

	// Load the plugin dynamically using the global plugin manager
	if err := pluginManager.LoadPlugin(newInstalledPath); err != nil {
		log.LogError("Failed to load plugin after installation",
			zap.String("plugin", pluginKey),
			zap.String("installed_path", newInstalledPath),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load plugin"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin installed successfully",
		"plugin":  pluginKey,
	})
}
