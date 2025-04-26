package api

import (
	"encoding/json"
	"fmt"
	"io"

	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/k8s"
)

// First, let's define a simplified package struct for the helper functions
type ArtifactHubPackage struct {
	PackageID         string `json:"package_id"`
	Name              string `json:"name"`
	NormalizedName    string `json:"normalized_name"`
	LogoImageID       string `json:"logo_image_id"`
	LogoURL           string `json:"logo_url"`
	Stars             int    `json:"stars"`
	Official          bool   `json:"official"`
	VerifiedPublisher bool   `json:"verified_publisher"`
	Repository        struct {
		URL                     string `json:"url"`
		Name                    string `json:"name"`
		DisplayName             string `json:"display_name"`
		Kind                    int    `json:"kind"`
		VerifiedPublisher       bool   `json:"verified_publisher"`
		Official                bool   `json:"official"`
		OrganizationName        string `json:"organization_name"`
		OrganizationDisplayName string `json:"organization_display_name"`
	} `json:"repository"`
	Version        string   `json:"version"`
	AppVersion     string   `json:"app_version"`
	Description    string   `json:"description"`
	Keywords       []string `json:"keywords"`
	License        string   `json:"license"`
	Deprecated     bool     `json:"deprecated"`
	Signed         bool     `json:"signed"`
	SecurityReport struct {
		Summary struct {
			Critical int `json:"critical"`
			High     int `json:"high"`
			Medium   int `json:"medium"`
			Low      int `json:"low"`
			Unknown  int `json:"unknown"`
		} `json:"summary"`
	} `json:"security_report"`
	ContainersImages []struct {
		Name  string `json:"name"`
		Image string `json:"image"`
	} `json:"containers_images"`
	TS        int64 `json:"ts"`
	CreatedAt int64 `json:"created_at"`
	Links     []struct {
		Name string `json:"name"`
		URL  string `json:"url"`
	} `json:"links"`
	Maintainers []struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	} `json:"maintainers"`
	HomeURL    string `json:"home_url"`
	ContentURL string `json:"content_url"`
	InstallURL string `json:"install_url"`
}

// ArtifactHubPackageDetails represents detailed package information from Artifact Hub API
type ArtifactHubPackageDetails struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	AppVersion  string `json:"app_version"`
	Description string `json:"description"`
	Repository  struct {
		URL  string `json:"url"`
		Name string `json:"name"`
	} `json:"repository"`
	DefaultValues string `json:"default_values"`
}

// ArtifactHubDeployRequest represents the request payload for deploying from Artifact Hub
type ArtifactHubDeployRequest struct {
	PackageID     string             `json:"packageId"`     // Format: repo/org/chartname
	Version       string             `json:"version"`       // Specific version to deploy
	Namespace     string             `json:"namespace"`     // Target namespace
	ReleaseName   string             `json:"releaseName"`   // Helm release name
	Values        map[string]string  `json:"values"`        // Custom values
	ConfigMaps    []k8s.ConfigMapRef `json:"configMaps"`    // ConfigMap references
	WorkloadLabel string             `json:"workloadLabel"` // KubeStellar workload label
}

// ArtifactHubSearchRequest represents search parameters for Artifact Hub
type ArtifactHubSearchRequest struct {
	Query  string `json:"query"`
	Kind   string `json:"kind"` // helm, krew, falco, opa, etc.
	Offset int    `json:"offset"`
	Limit  int    `json:"limit"`
}

// EnhancedArtifactHubPackageDetails with all available details
type EnhancedArtifactHubPackageDetails struct {
	PackageID      string   `json:"package_id"`
	Name           string   `json:"name"`
	NormalizedName string   `json:"normalized_name"`
	LogoImageID    string   `json:"logo_image_id"`
	LogoURL        string   `json:"logo_url"`
	Stars          int      `json:"stars"`
	Version        string   `json:"version"`
	AppVersion     string   `json:"app_version"`
	Description    string   `json:"description"`
	Keywords       []string `json:"keywords"`
	HomeURL        string   `json:"home_url"`
	ReadmeURL      string   `json:"readme_url"`
	License        string   `json:"license"`
	Deprecated     bool     `json:"deprecated"`
	Signed         bool     `json:"signed"`
	CreatedAt      int64    `json:"created_at"`
	Digest         string   `json:"digest"`
	InstallURL     string   `json:"install"`
	ValueSchemaURL string   `json:"values_schema_url"`
	ContentURL     string   `json:"content_url"`
	Repository     struct {
		URL                     string `json:"url"`
		Name                    string `json:"name"`
		DisplayName             string `json:"display_name"`
		Kind                    int    `json:"kind"`
		VerifiedPublisher       bool   `json:"verified_publisher"`
		Official                bool   `json:"official"`
		OrganizationName        string `json:"organization_name"`
		OrganizationDisplayName string `json:"organization_display_name"`
	} `json:"repository"`
	Links []struct {
		Name string `json:"name"`
		URL  string `json:"url"`
	} `json:"links"`
	Maintainers []struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	} `json:"maintainers"`
	ContainersImages []struct {
		Name        string `json:"name"`
		Image       string `json:"image"`
		Whitelisted bool   `json:"whitelisted"`
	} `json:"containers_images"`
	SecurityReport struct {
		Summary struct {
			Critical int `json:"critical"`
			High     int `json:"high"`
			Medium   int `json:"medium"`
			Low      int `json:"low"`
			Unknown  int `json:"unknown"`
		} `json:"summary"`
		Full map[string]interface{} `json:"full"`
	} `json:"security_report"`
	Recommendations []struct {
		URL string `json:"url"`
	} `json:"recommendations"`
	Screenshots []struct {
		Title string `json:"title"`
		URL   string `json:"url"`
	} `json:"screenshots"`
	ChangeLog []struct {
		Version                 string   `json:"version"`
		TS                      int64    `json:"ts"`
		Changes                 []string `json:"changes"`
		ContainsSecurityUpdates bool     `json:"contains_security_updates"`
		Prerelease              bool     `json:"prerelease"`
	} `json:"change_log"`
	DefaultValues string      `json:"default_values"`
	ValuesSchema  interface{} `json:"values_schema"`
	Stats         struct {
		Subscriptions int `json:"subscriptions"`
		Webhooks      int `json:"webhooks"`
	} `json:"stats"`
}

// DeployFromArtifactHub deploys a Helm chart directly from Artifact Hub
func DeployFromArtifactHub(c *gin.Context) {
	var req ArtifactHubDeployRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	// Parse the packageID to extract repository info
	parts := strings.Split(req.PackageID, "/")
	if len(parts) < 3 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid packageId format. Expected format: repo/org/chartname"})
		return
	}

	repoType := parts[0]
	orgName := parts[1]
	chartName := parts[2]

	// Get package details from Artifact Hub API
	packageDetails, err := getArtifactHubPackageDetails(repoType, orgName, chartName, req.Version)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get package details from Artifact Hub", "details": err.Error()})
		return
	}

	// If workload label is not provided, use the chart name
	if req.WorkloadLabel == "" {
		req.WorkloadLabel = chartName
	}

	// Prepare the Helm deployment request
	helmReq := k8s.HelmDeploymentRequest{
		RepoName:      packageDetails.Repository.Name,
		RepoURL:       packageDetails.Repository.URL,
		ChartName:     chartName,
		Namespace:     req.Namespace,
		ReleaseName:   req.ReleaseName,
		Version:       req.Version,
		Values:        req.Values,
		ConfigMaps:    req.ConfigMaps,
		WorkloadLabel: req.WorkloadLabel,
	}

	// Parse the "store" parameter from the query string
	storeQuery := c.Query("store")
	store := false
	if storeQuery == "true" {
		store = true
	}

	// Deploy using existing Helm deployment function
	release, err := k8s.DeployHelmChart(helmReq, store)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Deployment failed", "details": err.Error()})
		return
	}

	response := gin.H{
		"message":        "Artifact Hub chart deployed successfully",
		"release":        release.Name,
		"namespace":      release.Namespace,
		"version":        release.Chart.Metadata.Version,
		"status":         release.Info.Status.String(),
		"workload_label": req.WorkloadLabel,
		"packageId":      req.PackageID,
	}

	if store {
		response["stored_in"] = "kubestellar-helm ConfigMap"
	}

	c.JSON(http.StatusOK, response)
}

// SearchArtifactHub searches for packages on Artifact Hub
func SearchArtifactHub(c *gin.Context) {
	var req ArtifactHubSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	// Set defaults
	if req.Limit == 0 {
		req.Limit = 20
	}
	if req.Kind == "" {
		req.Kind = "0" // Helm charts
	}

	// Build the query parameters
	query := url.Values{}
	query.Set("kind", req.Kind)
	query.Set("offset", fmt.Sprintf("%d", req.Offset))
	query.Set("limit", fmt.Sprintf("%d", req.Limit))
	query.Set("ts_query_web", req.Query)

	// Make request to Artifact Hub API
	apiURL := fmt.Sprintf("https://artifacthub.io/api/v1/packages/search?%s", query.Encode())

	resp, err := http.Get(apiURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search Artifact Hub", "details": err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Artifact Hub API error", "details": string(bodyBytes)})
		return
	}

	// Parse the response
	var searchResults ArtifactHubSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResults); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse Artifact Hub response", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Search completed successfully",
		"count":   len(searchResults.Packages),
		"results": searchResults.Packages,
	})
}

// GetArtifactHubPackageInfo retrieves detailed information about a specific package
func GetArtifactHubPackageInfo(c *gin.Context) {
	packageID := c.Param("packageId")
	if packageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Package ID is required"})
		return
	}

	// Parse the packageID to extract repository info
	parts := strings.Split(packageID, "/")
	if len(parts) < 3 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid packageId format. Expected format: repo/org/chartname"})
		return
	}

	repoType := parts[0]
	orgName := parts[1]
	chartName := parts[2]

	version := c.Query("version")

	// Get package details from Artifact Hub API
	packageDetails, err := getArtifactHubPackageDetails(repoType, orgName, chartName, version)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get package details", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Package details retrieved successfully",
		"package": packageDetails,
	})
}

// ListArtifactHubRepositories lists available repositories from Artifact Hub
func ListArtifactHubRepositories(c *gin.Context) {
	// Make request to Artifact Hub API to get all repositories
	apiURL := "https://artifacthub.io/api/v1/repositories/search"

	resp, err := http.Get(apiURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch repositories", "details": err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Artifact Hub API error", "details": string(bodyBytes)})
		return
	}

	// Parse the response
	var repositories []interface{}
	if err := json.NewDecoder(resp.Body).Decode(&repositories); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse repositories", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Repositories retrieved successfully",
		"count":        len(repositories),
		"repositories": repositories,
	})
}

// Helper function to get package details from Artifact Hub API
func getArtifactHubPackageDetails(repoType, orgName, chartName, version string) (*ArtifactHubPackageDetails, error) {
	// Construct the API URL
	var apiURL string
	if version != "" {
		apiURL = fmt.Sprintf("https://artifacthub.io/api/v1/packages/%s/%s/%s/%s", repoType, orgName, chartName, version)
	} else {
		apiURL = fmt.Sprintf("https://artifacthub.io/api/v1/packages/%s/%s/%s", repoType, orgName, chartName)
	}

	// Make request to Artifact Hub API
	resp, err := http.Get(apiURL)
	if err != nil {
		return nil, fmt.Errorf("failed to make request to Artifact Hub API: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("artifact Hub API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// Parse the response
	var packageDetails ArtifactHubPackageDetails
	if err := json.NewDecoder(resp.Body).Decode(&packageDetails); err != nil {
		return nil, fmt.Errorf("failed to parse package details: %v", err)
	}

	return &packageDetails, nil
}

// GetArtifactHubPackageValues retrieves the default values.yaml for a specific package version
func GetArtifactHubPackageValues(c *gin.Context) {
	packageID := c.Param("packageId")
	version := c.Query("version")

	if packageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Package ID is required"})
		return
	}

	// Parse the packageID to extract repository info
	parts := strings.Split(packageID, "/")
	if len(parts) < 3 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid packageId format. Expected format: repo/org/chartname"})
		return
	}

	repoType := parts[0]
	orgName := parts[1]
	chartName := parts[2]

	// Get package details from Artifact Hub API
	packageDetails, err := getArtifactHubPackageDetails(repoType, orgName, chartName, version)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get package details", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        "Default values retrieved successfully",
		"packageId":      packageID,
		"version":        packageDetails.Version,
		"default_values": packageDetails.DefaultValues,
	})
}

// Updated ArtifactHubSearchResponse using the package struct
type ArtifactHubSearchResponse struct {
	Packages []ArtifactHubPackage `json:"packages"`
}

// Helper function to extract unique repositories from search results
func extractRepositories(packages []ArtifactHubPackage) []map[string]interface{} {
	repoMap := make(map[string]map[string]interface{})

	for _, pkg := range packages {
		if _, exists := repoMap[pkg.Repository.Name]; !exists {
			repoMap[pkg.Repository.Name] = map[string]interface{}{
				"name":               pkg.Repository.Name,
				"display_name":       pkg.Repository.DisplayName,
				"verified_publisher": pkg.Repository.VerifiedPublisher,
				"official":           pkg.Repository.Official,
			}
		}
	}

	repositories := make([]map[string]interface{}, 0, len(repoMap))
	for _, repo := range repoMap {
		repositories = append(repositories, repo)
	}

	return repositories
}

// Helper function to extract unique kinds from search results
func extractKinds(packages []ArtifactHubPackage) []map[string]interface{} {
	kindMap := make(map[int]string)
	kindNames := map[int]string{
		0:  "Helm charts",
		1:  "Falco rules",
		2:  "OPA policies",
		3:  "OLM operators",
		4:  "Tinkerbell actions",
		5:  "Krew kubectl plugins",
		6:  "Tekton tasks",
		7:  "KEDA scalers",
		8:  "CoreDNS plugins",
		9:  "Keptn integrations",
		10: "Container images",
		11: "Kubewarden policies",
		12: "Gatekeeper policies",
		13: "Kyverno policies",
		14: "Knative client plugins",
		15: "Backstage plugins",
		16: "Argo templates",
		17: "KubeArmor policies",
		18: "KCL modules",
		19: "Headlamp plugins",
		20: "Inspektor gadgets",
	}

	for _, pkg := range packages {
		if _, exists := kindMap[pkg.Repository.Kind]; !exists {
			kindMap[pkg.Repository.Kind] = kindNames[pkg.Repository.Kind]
		}
	}

	kinds := make([]map[string]interface{}, 0, len(kindMap))
	for id, name := range kindMap {
		kinds = append(kinds, map[string]interface{}{
			"id":   id,
			"name": name,
		})
	}

	return kinds
}

// Helper function to extract unique licenses from search results
func extractLicenses(packages []ArtifactHubPackage) []string {
	licenseMap := make(map[string]bool)

	for _, pkg := range packages {
		if pkg.License != "" {
			licenseMap[pkg.License] = true
		}
	}

	licenses := make([]string, 0, len(licenseMap))
	for license := range licenseMap {
		licenses = append(licenses, license)
	}

	return licenses
}

// SearchArtifactHub searches for packages on Artifact Hub with full details
func SearchArtifactHubAdvance(c *gin.Context) {
	var req ArtifactHubSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	// Set defaults
	if req.Limit == 0 {
		req.Limit = 20
	}
	if req.Kind == "" {
		req.Kind = "0" // Helm charts
	}

	// Build the query parameters
	query := url.Values{}
	query.Set("kind", req.Kind)
	query.Set("offset", fmt.Sprintf("%d", req.Offset))
	query.Set("limit", fmt.Sprintf("%d", req.Limit))
	query.Set("ts_query_web", req.Query)
	query.Set("facets", "true") // Request additional facets

	// Make request to Artifact Hub API
	apiURL := fmt.Sprintf("https://artifacthub.io/api/v1/packages/search?%s", query.Encode())

	resp, err := http.Get(apiURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search Artifact Hub", "details": err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Artifact Hub API error", "details": string(bodyBytes)})
		return
	}

	// Parse the response
	var searchResults ArtifactHubSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResults); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse Artifact Hub response", "details": err.Error()})
		return
	}

	// Process each package to add logo URL if image ID exists
	for i := range searchResults.Packages {
		if searchResults.Packages[i].LogoImageID != "" {
			// Construct the logo URL from the image ID
			searchResults.Packages[i].LogoURL = fmt.Sprintf("https://artifacthub.io/image/%s", searchResults.Packages[i].LogoImageID)
		}
	}

	// Create enhanced response
	enhancedResponse := gin.H{
		"message": "Search completed successfully",
		"count":   len(searchResults.Packages),
		"results": searchResults.Packages,
		"facets": gin.H{
			"repositories": extractRepositories(searchResults.Packages),
			"kinds":        extractKinds(searchResults.Packages),
			"licenses":     extractLicenses(searchResults.Packages),
		},
	}

	c.JSON(http.StatusOK, enhancedResponse)
}

// GetArtifactHubPackageAdvanceDetails retrieves comprehensive details for a specific package with all metadata
func GetArtifactHubPackageAdvanceDetails(c *gin.Context) {
	packageID := c.Param("packageId")
	if packageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Package ID is required"})
		return
	}

	// Parse the packageID to extract repository info
	parts := strings.Split(packageID, "/")
	if len(parts) < 3 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid packageId format. Expected format: repo/org/chartname"})
		return
	}

	repoType := parts[0]
	orgName := parts[1]
	chartName := parts[2]
	version := c.Query("version")

	// Get comprehensive package details
	packageDetails, err := getEnhancedArtifactHubPackageDetails(repoType, orgName, chartName, version)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get package details", "details": err.Error()})
		return
	}

	// Add logo URL if image ID exists
	if packageDetails.LogoImageID != "" {
		packageDetails.LogoURL = fmt.Sprintf("https://artifacthub.io/image/%s", packageDetails.LogoImageID)
	}

	// Get additional details
	additionalInfo := make(map[string]interface{})

	// Get all available versions
	versions, err := getPackageVersions(repoType, orgName, chartName)
	if err == nil {
		additionalInfo["available_versions"] = versions
	}

	// Get installation instructions if available
	installInstructions, err := getInstallationInstructions(repoType, orgName, chartName, version)
	if err == nil {
		additionalInfo["installation_instructions"] = installInstructions
	}

	// Get related packages
	relatedPackages, err := getRelatedPackages(packageDetails.PackageID)
	if err == nil {
		additionalInfo["related_packages"] = relatedPackages
	}

	response := gin.H{
		"message":         "Advanced package details retrieved successfully",
		"package":         packageDetails,
		"additional_info": additionalInfo,
	}

	c.JSON(http.StatusOK, response)
}

// Helper function to get enhanced package details from Artifact Hub API
func getEnhancedArtifactHubPackageDetails(repoType, orgName, chartName, version string) (*EnhancedArtifactHubPackageDetails, error) {
	// Construct the API URL
	var apiURL string
	if version != "" {
		apiURL = fmt.Sprintf("https://artifacthub.io/api/v1/packages/%s/%s/%s/%s", repoType, orgName, chartName, version)
	} else {
		apiURL = fmt.Sprintf("https://artifacthub.io/api/v1/packages/%s/%s/%s", repoType, orgName, chartName)
	}

	// Make request to Artifact Hub API
	resp, err := http.Get(apiURL)
	if err != nil {
		return nil, fmt.Errorf("failed to make request to Artifact Hub API: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("artifact Hub API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// Parse the response
	var packageDetails EnhancedArtifactHubPackageDetails
	if err := json.NewDecoder(resp.Body).Decode(&packageDetails); err != nil {
		return nil, fmt.Errorf("failed to parse package details: %v", err)
	}

	return &packageDetails, nil
}

// Helper function to get all available versions of a package
func getPackageVersions(repoType, orgName, chartName string) ([]map[string]interface{}, error) {
	apiURL := fmt.Sprintf("https://artifacthub.io/api/v1/packages/%s/%s/%s/versions", repoType, orgName, chartName)

	resp, err := http.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get versions: status %d", resp.StatusCode)
	}

	var versions []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&versions); err != nil {
		return nil, fmt.Errorf("failed to parse versions: %v", err)
	}

	return versions, nil
}

// Helper function to get installation instructions
func getInstallationInstructions(repoType, orgName, chartName, version string) (string, error) {
	var apiURL string
	if version != "" {
		apiURL = fmt.Sprintf("https://artifacthub.io/api/v1/packages/%s/%s/%s/%s/install", repoType, orgName, chartName, version)
	} else {
		apiURL = fmt.Sprintf("https://artifacthub.io/api/v1/packages/%s/%s/%s/install", repoType, orgName, chartName)
	}

	resp, err := http.Get(apiURL)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to get installation instructions: status %d", resp.StatusCode)
	}

	bodyBytes, _ := io.ReadAll(resp.Body)
	return string(bodyBytes), nil
}

// Helper function to get related packages
func getRelatedPackages(packageID string) ([]map[string]interface{}, error) {
	// Parse the packageID to extract repository info
	parts := strings.Split(packageID, "/")
	if len(parts) < 3 {
		return nil, fmt.Errorf("invalid packageId format: %s", packageID)
	}

	repoType := parts[0]
	orgName := parts[1]
	chartName := parts[2]

	// Get package details to extract keywords for related search
	packageDetails, err := getEnhancedArtifactHubPackageDetails(repoType, orgName, chartName, "")
	if err != nil {
		return nil, fmt.Errorf("failed to get package details: %v", err)
	}

	// Use a combination of organization and keywords to find related packages
	query := url.Values{}
	query.Set("limit", "5")
	query.Set("offset", "0")

	// If we have keywords, use them to find related packages
	var searchQuery string
	if len(packageDetails.Keywords) > 0 {
		// Use up to 3 keywords
		keywordCount := 3
		if len(packageDetails.Keywords) < 3 {
			keywordCount = len(packageDetails.Keywords)
		}
		searchQuery = strings.Join(packageDetails.Keywords[:keywordCount], " ")
	}

	// Add org name to improve relevance but exclude the current package
	orgFilter := fmt.Sprintf("org:%s", orgName)
	if searchQuery != "" {
		searchQuery = searchQuery + " " + orgFilter
	} else {
		searchQuery = orgFilter
	}

	query.Set("ts_query_web", searchQuery)

	// Make request to search API
	apiURL := fmt.Sprintf("https://artifacthub.io/api/v1/packages/search?%s", query.Encode())

	resp, err := http.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("search API returned status %d", resp.StatusCode)
	}

	var searchResults ArtifactHubSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResults); err != nil {
		return nil, err
	}

	// Filter out the original package and convert to required format
	currentPackageID := fmt.Sprintf("%s/%s/%s", repoType, orgName, chartName)
	related := make([]map[string]interface{}, 0)

	for _, pkg := range searchResults.Packages {
		pkgID := fmt.Sprintf("%d/%s/%s", pkg.Repository.Kind, pkg.Repository.OrganizationName, pkg.Name)

		// Skip the current package
		if pkgID == currentPackageID {
			continue
		}

		related = append(related, map[string]interface{}{
			"package_id":  pkgID,
			"name":        pkg.Name,
			"description": pkg.Description,
			"logo_url":    pkg.LogoURL,
			"repository":  pkg.Repository.Name,
			"stars":       pkg.Stars,
		})

		// Limit to 4 related packages
		if len(related) >= 4 {
			break
		}
	}

	return related, nil
}
