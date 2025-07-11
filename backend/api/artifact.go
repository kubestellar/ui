package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"

	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/k8s"
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
		log.Printf("[ERROR] Invalid request payload: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	log.Printf("[INFO] Received deploy request: %+v", req)

	// Parse the packageID to extract repository info
	parts := strings.Split(req.PackageID, "/")
	if len(parts) < 3 {
		log.Printf("[ERROR] Invalid packageId format: %s", req.PackageID)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid packageId format. Expected format: repo/org/chartname"})
		return
	}

	repoType := parts[0]
	orgName := parts[1]
	chartName := parts[2]

	log.Printf("[INFO] Parsed packageID - RepoType: %s, OrgName: %s, ChartName: %s", repoType, orgName, chartName)

	// Get package details from Artifact Hub API
	packageDetails, err := getArtifactHubPackageDetails(repoType, orgName, chartName, req.Version)
	if err != nil {
		log.Printf("[ERROR] Failed to get package details from Artifact Hub: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get package details from Artifact Hub", "details": err.Error()})
		return
	}

	log.Printf("[INFO] Retrieved package details: %+v", packageDetails)

	// If workload label is not provided, use the chart name
	if req.WorkloadLabel == "" {
		req.WorkloadLabel = chartName
		log.Printf("[INFO] Workload label not provided. Defaulting to chart name: %s", chartName)
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

	log.Printf("[INFO] Constructed HelmDeploymentRequest: %+v", helmReq)

	// Parse the "store" parameter from the query string
	storeQuery := c.Query("store")
	store := storeQuery == "true"

	log.Printf("[INFO] Store flag parsed: %v", store)

	// Deploy using existing Helm deployment function
	release, err := k8s.DeployHelmChart(helmReq, store)
	if err != nil {
		log.Printf("[ERROR] Deployment failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Deployment failed", "details": err.Error()})
		return
	}

	log.Printf("[INFO] Helm chart deployed successfully: Release=%s, Namespace=%s, Status=%s",
		release.Name, release.Namespace, release.Info.Status.String())

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
		log.Printf("[INFO] Deployment stored in kubestellar-helm ConfigMap")
	}

	c.JSON(http.StatusOK, response)
}

func SearchArtifactHub(c *gin.Context) {
	var req ArtifactHubSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[ERROR] Invalid search request payload: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	log.Printf("[INFO] Received search request: %+v", req)

	// Set defaults
	if req.Limit == 0 {
		req.Limit = 20
	}
	if req.Kind == "" {
		req.Kind = "0" // Helm charts
	}

	query := url.Values{}
	query.Set("kind", req.Kind)
	query.Set("offset", fmt.Sprintf("%d", req.Offset))
	query.Set("limit", fmt.Sprintf("%d", req.Limit))
	query.Set("ts_query_web", req.Query)

	apiURL := fmt.Sprintf("https://artifacthub.io/api/v1/packages/search?%s", query.Encode())
	log.Printf("[INFO] Calling Artifact Hub search API: %s", apiURL)

	resp, err := http.Get(apiURL)
	if err != nil {
		log.Printf("[ERROR] Failed to search Artifact Hub: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search Artifact Hub", "details": err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("[ERROR] Artifact Hub API error [%d]: %s", resp.StatusCode, string(bodyBytes))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Artifact Hub API error", "details": string(bodyBytes)})
		return
	}

	var searchResults ArtifactHubSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResults); err != nil {
		log.Printf("[ERROR] Failed to decode search response: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse Artifact Hub response", "details": err.Error()})
		return
	}

	log.Printf("[INFO] Search returned %d packages", len(searchResults.Packages))

	c.JSON(http.StatusOK, gin.H{
		"message": "Search completed successfully",
		"count":   len(searchResults.Packages),
		"results": searchResults.Packages,
	})
}

func GetArtifactHubPackageInfo(c *gin.Context) {
	packageID := c.Param("packageId")
	if packageID == "" {
		log.Printf("[ERROR] Package ID is missing in request")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Package ID is required"})
		return
	}

	log.Printf("[INFO] Retrieving package info for: %s", packageID)

	parts := strings.Split(packageID, "/")
	if len(parts) < 3 {
		log.Printf("[ERROR] Invalid packageId format: %s", packageID)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid packageId format. Expected format: repo/org/chartname"})
		return
	}

	repoType := parts[0]
	orgName := parts[1]
	chartName := parts[2]
	version := c.Query("version")

	log.Printf("[INFO] Parsed packageId - RepoType: %s, OrgName: %s, ChartName: %s, Version: %s",
		repoType, orgName, chartName, version)

	packageDetails, err := getArtifactHubPackageDetails(repoType, orgName, chartName, version)
	if err != nil {
		log.Printf("[ERROR] Failed to fetch package details: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get package details", "details": err.Error()})
		return
	}

	log.Printf("[INFO] Successfully retrieved package details")

	c.JSON(http.StatusOK, gin.H{
		"message": "Package details retrieved successfully",
		"package": packageDetails,
	})
}

func ListArtifactHubRepositories(c *gin.Context) {
	apiURL := "https://artifacthub.io/api/v1/repositories/search"
	log.Printf("[INFO] Fetching repositories from Artifact Hub: %s", apiURL)

	resp, err := http.Get(apiURL)
	if err != nil {
		log.Printf("[ERROR] Failed to fetch repositories: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch repositories", "details": err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("[ERROR] Artifact Hub API returned status %d: %s", resp.StatusCode, string(bodyBytes))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Artifact Hub API error", "details": string(bodyBytes)})
		return
	}

	var repositories []interface{}
	if err := json.NewDecoder(resp.Body).Decode(&repositories); err != nil {
		log.Printf("[ERROR] Failed to decode repositories response: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse repositories", "details": err.Error()})
		return
	}

	log.Printf("[INFO] Retrieved %d repositories from Artifact Hub", len(repositories))

	c.JSON(http.StatusOK, gin.H{
		"message":      "Repositories retrieved successfully",
		"count":        len(repositories),
		"repositories": repositories,
	})
}

func getArtifactHubPackageDetails(repoType, orgName, chartName, version string) (*ArtifactHubPackageDetails, error) {
	var apiURL string
	if version != "" {
		apiURL = fmt.Sprintf("https://artifacthub.io/api/v1/packages/%s/%s/%s/%s", repoType, orgName, chartName, version)
	} else {
		apiURL = fmt.Sprintf("https://artifacthub.io/api/v1/packages/%s/%s/%s", repoType, orgName, chartName)
	}

	log.Printf("[INFO] Fetching package details from: %s", apiURL)

	resp, err := http.Get(apiURL)
	if err != nil {
		log.Printf("[ERROR] Request to Artifact Hub failed: %v", err)
		return nil, fmt.Errorf("failed to make request to Artifact Hub API: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("[ERROR] Artifact Hub returned status %d: %s", resp.StatusCode, string(bodyBytes))
		return nil, fmt.Errorf("artifact Hub API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var packageDetails ArtifactHubPackageDetails
	if err := json.NewDecoder(resp.Body).Decode(&packageDetails); err != nil {
		log.Printf("[ERROR] Failed to decode package details: %v", err)
		return nil, fmt.Errorf("failed to parse package details: %v", err)
	}

	log.Printf("[INFO] Successfully fetched package details for %s/%s/%s version=%s", repoType, orgName, chartName, version)
	return &packageDetails, nil
}

func GetArtifactHubPackageValues(c *gin.Context) {
	packageID := c.Param("packageId")
	version := c.Query("version")

	if packageID == "" {
		log.Printf("[ERROR] Package ID not provided")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Package ID is required"})
		return
	}

	log.Printf("[INFO] Fetching default values.yaml for packageId: %s, version: %s", packageID, version)

	parts := strings.Split(packageID, "/")
	if len(parts) < 3 {
		log.Printf("[ERROR] Invalid package ID format: %s", packageID)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid packageId format. Expected format: repo/org/chartname"})
		return
	}

	repoType := parts[0]
	orgName := parts[1]
	chartName := parts[2]

	packageDetails, err := getArtifactHubPackageDetails(repoType, orgName, chartName, version)
	if err != nil {
		log.Printf("[ERROR] Failed to retrieve package details: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get package details", "details": err.Error()})
		return
	}

	log.Printf("[INFO] Successfully retrieved default values.yaml for %s/%s/%s version=%s", repoType, orgName, chartName, version)

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

func extractRepositories(packages []ArtifactHubPackage) []map[string]interface{} {
	repoMap := make(map[string]map[string]interface{})

	for _, pkg := range packages {
		if _, exists := repoMap[pkg.Repository.Name]; !exists {
			log.Printf("[INFO] Adding repository: %s (DisplayName: %s, Verified: %v, Official: %v)",
				pkg.Repository.Name, pkg.Repository.DisplayName, pkg.Repository.VerifiedPublisher, pkg.Repository.Official)

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

	log.Printf("[INFO] Extracted %d unique repositories", len(repositories))
	return repositories
}

func extractKinds(packages []ArtifactHubPackage) []map[string]interface{} {
	kindMap := make(map[int]string)
	kindNames := map[int]string{
		0: "Helm charts", 1: "Falco rules", 2: "OPA policies", 3: "OLM operators", 4: "Tinkerbell actions",
		5: "Krew kubectl plugins", 6: "Tekton tasks", 7: "KEDA scalers", 8: "CoreDNS plugins", 9: "Keptn integrations",
		10: "Container images", 11: "Kubewarden policies", 12: "Gatekeeper policies", 13: "Kyverno policies",
		14: "Knative client plugins", 15: "Backstage plugins", 16: "Argo templates", 17: "KubeArmor policies",
		18: "KCL modules", 19: "Headlamp plugins", 20: "Inspektor gadgets",
	}

	for _, pkg := range packages {
		if _, exists := kindMap[pkg.Repository.Kind]; !exists {
			kindName := kindNames[pkg.Repository.Kind]
			log.Printf("[INFO] Found kind: %d (%s)", pkg.Repository.Kind, kindName)
			kindMap[pkg.Repository.Kind] = kindName
		}
	}

	kinds := make([]map[string]interface{}, 0, len(kindMap))
	for id, name := range kindMap {
		kinds = append(kinds, map[string]interface{}{
			"id":   id,
			"name": name,
		})
	}

	log.Printf("[INFO] Extracted %d unique kinds", len(kinds))
	return kinds
}

// Helper function to extract unique licenses from search results
func extractLicenses(packages []ArtifactHubPackage) []string {
	licenseMap := make(map[string]bool)

	for _, pkg := range packages {
		if pkg.License != "" {
			if _, exists := licenseMap[pkg.License]; !exists {
				log.Printf("[INFO] Found license: %s", pkg.License)
			}
			licenseMap[pkg.License] = true
		}
	}

	licenses := make([]string, 0, len(licenseMap))
	for license := range licenseMap {
		licenses = append(licenses, license)
	}

	log.Printf("[INFO] Extracted %d unique licenses", len(licenses))
	return licenses
}

// SearchArtifactHub searches for packages on Artifact Hub with full details
func SearchArtifactHubAdvance(c *gin.Context) {
	var req ArtifactHubSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[ERROR] Invalid search request payload: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	log.Printf("[INFO] Processing ArtifactHub search request: query=%s, kind=%s, offset=%d, limit=%d", req.Query, req.Kind, req.Offset, req.Limit)

	if req.Limit == 0 {
		req.Limit = 20
	}
	if req.Kind == "" {
		req.Kind = "0"
	}

	query := url.Values{}
	query.Set("kind", req.Kind)
	query.Set("offset", fmt.Sprintf("%d", req.Offset))
	query.Set("limit", fmt.Sprintf("%d", req.Limit))
	query.Set("ts_query_web", req.Query)
	query.Set("facets", "true")

	apiURL := fmt.Sprintf("https://artifacthub.io/api/v1/packages/search?%s", query.Encode())
	log.Printf("[INFO] Making API request to: %s", apiURL)

	resp, err := http.Get(apiURL)
	if err != nil {
		log.Printf("[ERROR] Failed to reach Artifact Hub API: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search Artifact Hub", "details": err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("[ERROR] Artifact Hub API returned status %d: %s", resp.StatusCode, string(bodyBytes))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Artifact Hub API error", "details": string(bodyBytes)})
		return
	}

	var searchResults ArtifactHubSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResults); err != nil {
		log.Printf("[ERROR] Failed to decode Artifact Hub response: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse Artifact Hub response", "details": err.Error()})
		return
	}

	for i := range searchResults.Packages {
		if searchResults.Packages[i].LogoImageID != "" {
			searchResults.Packages[i].LogoURL = fmt.Sprintf("https://artifacthub.io/image/%s", searchResults.Packages[i].LogoImageID)
		}
	}

	log.Printf("[INFO] Successfully fetched %d packages from Artifact Hub", len(searchResults.Packages))

	c.JSON(http.StatusOK, gin.H{
		"message": "Search completed successfully",
		"count":   len(searchResults.Packages),
		"results": searchResults.Packages,
		"facets": gin.H{
			"repositories": extractRepositories(searchResults.Packages),
			"kinds":        extractKinds(searchResults.Packages),
			"licenses":     extractLicenses(searchResults.Packages),
		},
	})
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
	var apiURL string
	if version != "" {
		apiURL = fmt.Sprintf("https://artifacthub.io/api/v1/packages/%s/%s/%s/%s", repoType, orgName, chartName, version)
	} else {
		apiURL = fmt.Sprintf("https://artifacthub.io/api/v1/packages/%s/%s/%s", repoType, orgName, chartName)
	}

	log.Printf("[INFO] Fetching package details from: %s", apiURL)

	resp, err := http.Get(apiURL)
	if err != nil {
		log.Printf("[ERROR] Failed request to ArtifactHub: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[ERROR] ArtifactHub returned status %d: %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("status %d: %s", resp.StatusCode, string(body))
	}

	var pkg EnhancedArtifactHubPackageDetails
	if err := json.NewDecoder(resp.Body).Decode(&pkg); err != nil {
		log.Printf("[ERROR] Failed to decode package details: %v", err)
		return nil, err
	}

	log.Printf("[INFO] Retrieved package: %s/%s", orgName, chartName)
	return &pkg, nil
}

func getPackageVersions(repoType, orgName, chartName string) ([]map[string]interface{}, error) {
	apiURL := fmt.Sprintf("https://artifacthub.io/api/v1/packages/%s/%s/%s/versions", repoType, orgName, chartName)
	log.Printf("[INFO] Fetching versions from: %s", apiURL)

	resp, err := http.Get(apiURL)
	if err != nil {
		log.Printf("[ERROR] Failed to get versions: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[ERROR] Failed to get versions: status %d", resp.StatusCode)
		return nil, fmt.Errorf("status %d", resp.StatusCode)
	}

	var versions []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&versions); err != nil {
		log.Printf("[ERROR] Failed to parse versions: %v", err)
		return nil, err
	}

	log.Printf("[INFO] Fetched %d versions for %s", len(versions), chartName)
	return versions, nil
}

// getInstallationInstructions fetches installation instructions for a package.
func getInstallationInstructions(repoType, orgName, chartName, version string) (string, error) {
	var apiURL string
	if version != "" {
		apiURL = fmt.Sprintf("https://artifacthub.io/api/v1/packages/%s/%s/%s/%s/install", repoType, orgName, chartName, version)
	} else {
		apiURL = fmt.Sprintf("https://artifacthub.io/api/v1/packages/%s/%s/%s/install", repoType, orgName, chartName)
	}

	log.Printf("[INFO] Fetching installation instructions from: %s", apiURL)

	resp, err := http.Get(apiURL)
	if err != nil {
		log.Printf("[ERROR] Failed to fetch installation instructions: %v", err)
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("[ERROR] ArtifactHub install endpoint returned status %d: %s", resp.StatusCode, string(bodyBytes))
		return "", fmt.Errorf("failed to get installation instructions: status %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[ERROR] Failed to read response body: %v", err)
		return "", err
	}

	log.Printf("[INFO] Installation instructions retrieved successfully")
	return string(bodyBytes), nil
}

// getRelatedPackages finds packages related to the given packageID using keywords and org name.
func getRelatedPackages(packageID string) ([]map[string]interface{}, error) {
	parts := strings.Split(packageID, "/")
	if len(parts) < 3 {
		return nil, fmt.Errorf("invalid packageId format: %s", packageID)
	}

	repoType, orgName, chartName := parts[0], parts[1], parts[2]
	currentPackageID := fmt.Sprintf("%s/%s/%s", repoType, orgName, chartName)

	// Fetch base package details
	packageDetails, err := getEnhancedArtifactHubPackageDetails(repoType, orgName, chartName, "")
	if err != nil {
		log.Printf("[ERROR] Failed to get base package details for %s: %v", packageID, err)
		return nil, fmt.Errorf("failed to get package details: %v", err)
	}

	// Construct search query using keywords and org
	query := url.Values{}
	query.Set("limit", "5")
	query.Set("offset", "0")

	var searchQuery string
	if len(packageDetails.Keywords) > 0 {
		keywordCount := min(3, len(packageDetails.Keywords))
		searchQuery = strings.Join(packageDetails.Keywords[:keywordCount], " ")
	}
	orgFilter := fmt.Sprintf("org:%s", orgName)
	if searchQuery != "" {
		searchQuery += " " + orgFilter
	} else {
		searchQuery = orgFilter
	}
	query.Set("ts_query_web", searchQuery)

	apiURL := fmt.Sprintf("https://artifacthub.io/api/v1/packages/search?%s", query.Encode())
	log.Printf("[INFO] Searching for related packages using: %s", apiURL)

	resp, err := http.Get(apiURL)
	if err != nil {
		log.Printf("[ERROR] Related packages search failed: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[ERROR] Search API returned status %d: %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("search API returned status %d", resp.StatusCode)
	}

	var searchResults ArtifactHubSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResults); err != nil {
		log.Printf("[ERROR] Failed to decode related packages response: %v", err)
		return nil, err
	}

	// Filter and format related packages (excluding current one)
	related := make([]map[string]interface{}, 0, 4)
	for _, pkg := range searchResults.Packages {
		pkgID := fmt.Sprintf("%d/%s/%s", pkg.Repository.Kind, pkg.Repository.OrganizationName, pkg.Name)

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

		if len(related) >= 4 {
			break
		}
	}

	log.Printf("[INFO] Found %d related packages for %s", len(related), packageID)
	return related, nil
}
