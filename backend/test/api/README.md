# API Tests

This directory contains comprehensive tests for all API handlers defined in the `backend/api` package.

## Test Files

### Core API Tests

- **`handlers_test.go`** - Tests for main cluster onboarding and management handlers

  - `OnboardClusterHandler` (JSON and form-data variants)
  - `GetClusterStatusHandler`
  - `UpdateManagedClusterLabelsHandler`

- **`status_handler_test.go`** - Tests for KubeStellar status checking

  - `CheckKubeStellarStatusHandler`

- **`cluster_logs_test.go`** - Tests for cluster onboarding logs

  - `OnboardingLogsHandler`

- **`manage_clusters_test.go`** - Tests for managed cluster operations
  - `GetManagedClustersHandler`
  - `GetManagedClusterHandler`

### Installation & Infrastructure Tests

- **`installer_test.go`** - Tests for KubeStellar installation

  - `CheckPrerequisitesHandler`
  - `InstallHandler`
  - `GetLogsHandler`

- **`installer_websocket_test.go`** - Tests for installation WebSocket handlers
  - `LogsWebSocketHandler`
  - WebSocket upgrade requirements

### Deployment Tests

- **`deploy_test.go`** - Tests for deployment operations

  - `DeployHandler`
  - `GitHubWebhookHandler`
  - `HealthCheckHandler`
  - `DeploymentStatusHandler`
  - `ListDeploymentsHandler`
  - `DeleteDeploymentHandler`
  - `ValidateConfigHandler`

- **`detach_test.go`** - Tests for cluster detachment
  - `DetachClusterHandler`
  - `GetDetachmentLogsHandler`

### External Integrations Tests

- **`artifact_test.go`** - Tests for Artifact Hub and Helm operations

  - `SearchPackagesHandler`
  - `GetPackageDetailHandler`
  - `ListRepositoriesHandler`
  - `InstallHelmPackageHandler`
  - `DeployHelmChartHandler`
  - `ListHelmReleasesHandler`
  - `UninstallHelmReleaseHandler`

- **`plugins_test.go`** - Tests for plugin management
  - `ListPluginsHandler`
  - `GetPluginHandler`
  - `InstallPluginHandler`
  - `UninstallPluginHandler`
  - `EnablePluginHandler`
  - `DisablePluginHandler`
  - `ExecutePluginHandler`

### WebSocket Tests

- **`cluster_socket_test.go`** - Tests for cluster WebSocket handlers
  - `WSOnboardingHandler`
  - `WSHealthHandler`
  - Utility functions (`LogOnboardingEvent`, `GetOnboardingEvents`, etc.)

## Test Coverage

The tests cover:

### ✅ Positive Test Cases

- Valid requests with correct parameters
- Successful API calls with expected responses
- Proper HTTP status codes (200, 201, etc.)

### ✅ Negative Test Cases

- Invalid request payloads
- Missing required parameters
- Malformed JSON
- Empty/null values
- Invalid content types

### ✅ Edge Cases

- Empty query parameters
- Special characters in inputs
- WebSocket upgrade scenarios
- Error handling paths

### ✅ Handler Types Tested

- **HTTP Handlers** - GET, POST, PUT, DELETE endpoints
- **WebSocket Handlers** - Connection establishment and validation
- **Utility Functions** - Helper functions and event management

## Running the Tests

### Run All API Tests

```bash
cd backend
go test ./test/api/... -v
```

### Run Specific Test File

```bash
cd backend
go test ./test/api/handlers_test.go -v
go test ./test/api/deploy_test.go -v
# etc.
```

### Run Tests with Coverage

```bash
cd backend
go test ./test/api/... -v -cover
```

### Run Tests with Detailed Coverage Report

```bash
cd backend
go test ./test/api/... -v -coverprofile=coverage.out
go tool cover -html=coverage.out -o coverage.html
```

## Test Structure

Each test file follows the same pattern:

```go
func TestHandlerName(t *testing.T) {
    tests := []struct {
        name           string
        input          interface{}
        expectedStatus int
        expectedError  string
    }{
        // Test cases
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Setup
            gin.SetMode(gin.TestMode)
            w := httptest.NewRecorder()
            c, _ := gin.CreateTestContext(w)

            // Test execution
            // Assertions
        })
    }
}
```

## Dependencies

The tests use:

- **testify/assert** - For assertions
- **gin-gonic/gin** - For HTTP context mocking
- **net/http/httptest** - For HTTP request/response recording
- Standard Go testing package

## Notes

### WebSocket Testing Limitations

WebSocket handlers require special setup for full testing. The current tests focus on:

- Parameter validation
- Connection upgrade requirements
- Error handling for missing parameters

For full WebSocket testing, additional tools like `gorilla/websocket` test utilities would be needed.

### Test Environment Expectations

Many tests expect certain failures in the test environment (e.g., Kubernetes clusters not being available, external services not accessible). This is normal and expected behavior.

### Mocking Considerations

Some tests may benefit from mocking external dependencies (Kubernetes clients, Redis, external APIs) for more isolated testing. The current implementation tests the actual handler logic with real dependencies where possible.

## Future Improvements

1. **Add Mocking** - Mock external dependencies for more isolated tests
2. **Integration Tests** - Add end-to-end integration tests
3. **WebSocket Testing** - Implement full WebSocket connection testing
4. **Performance Tests** - Add benchmarking and load testing
5. **Test Data** - Create reusable test fixtures and data sets
