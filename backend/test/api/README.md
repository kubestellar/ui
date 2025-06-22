# KubeStellar UI - API Test Suite

Comprehensive test suite for all KubeStellar UI backend API endpoints.

## Overview

This test suite provides complete coverage of all API handlers in the KubeStellar UI backend, including:

- **Authentication & Security**: Token validation, middleware testing
- **Cluster Management**: Onboarding, status checks, detachment
- **Deployment Operations**: GitOps workflows, validation, status tracking
- **Plugin System**: Installation, management, configuration
- **WebSocket Connections**: Real-time logging, health monitoring
- **Artifact Management**: Helm charts, package repositories

## Test Structure

### Test Files

1. **`status_handler_test.go`** - System status checking
2. **`cluster_logs_test.go`** - Cluster onboarding logs
3. **`installer_test.go`** - KubeStellar installation process
4. **`manage_clusters_test.go`** - Managed cluster operations
5. **`handlers_test.go`** - Core cluster management handlers
6. **`deploy_test.go`** - Deployment and GitOps operations
7. **`detach_test.go`** - Cluster detachment processes
8. **`artifact_test.go`** - Artifact Hub and Helm operations
9. **`plugins_test.go`** - Plugin management system
10. **`cluster_socket_test.go`** - WebSocket communication
11. **`installer_websocket_test.go`** - Installation WebSocket handlers

### Test Coverage

- **Total Tests**: 150+
- **Success Rate**: 98%+
- **Test Types**: Unit tests, integration tests, edge case validation
- **Patterns**: Table-driven tests, mock HTTP requests, error simulation

## Running Tests

### Local Development

#### Option 1: Using Test Scripts

```bash
# Unix/Linux/macOS
./run_tests.sh

# Windows
run_tests.bat
```

#### Option 2: Using Make (Unix/Linux/macOS)

```bash
# Run all tests
make test

# Run with verbose output
make test-verbose

# Run with coverage report
make test-coverage

# Run specific test file
make test-file FILE=status_handler_test.go

# Run specific test function
make test-func FUNC=TestOnboardClusterHandler

# Quick test (subset)
make quick-test
```

#### Option 3: Direct Go Commands

```bash
# All tests
go test ./test/api/... -v

# Specific file
go test ./test/api/status_handler_test.go -v

# Specific function
go test ./test/api/... -v -run TestOnboardClusterHandler

# With coverage
go test ./test/api/... -v -coverprofile=coverage.out
```

### CI/CD Integration

#### GitHub Actions

The repository includes automated testing workflows:

1. **`.github/workflows/api-tests.yml`** - Main API test workflow

   - Runs on: Push to main/dev, PRs to main/dev
   - Platform: Ubuntu Latest
   - Go Version: 1.21
   - Features: Dependency caching, test result artifacts, summary reports

2. **`.github/workflows/cross-platform-tests.yml`** - Cross-platform testing
   - Runs on: Ubuntu, Windows, macOS
   - Go Versions: 1.20, 1.21
   - Features: Matrix builds, platform-specific test scripts

#### Workflow Configuration

```yaml
# Example GitHub Actions usage
name: API Tests
on:
  push:
    branches: [main, dev]
    paths: ['backend/**']
  pull_request:
    branches: [main, dev]
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      - name: Run API Tests
        working-directory: ./backend
        run: |
          chmod +x run_tests.sh
          ./run_tests.sh
```

#### Other CI/CD Systems

**Jenkins**:

```groovy
pipeline {
    agent any
    stages {
        stage('Test') {
            steps {
                dir('backend') {
                    sh 'chmod +x run_tests.sh'
                    sh './run_tests.sh'
                }
            }
        }
    }
}
```

**GitLab CI**:

```yaml
test:
  image: golang:1.21
  script:
    - cd backend
    - chmod +x run_tests.sh
    - ./run_tests.sh
  artifacts:
    reports:
      junit: backend/test_results.xml
```

**Azure DevOps**:

```yaml
- task: Go@0
  displayName: 'Run API Tests'
  inputs:
    command: 'custom'
    customCommand: 'test'
    arguments: './test/api/... -v'
    workingDirectory: 'backend'
```

## Test Environment

### Dependencies

Tests require:

- Go 1.20+
- Gin web framework
- Testify assertion library
- HTTP test utilities

### External Services

Tests handle missing external dependencies gracefully:

- **Redis**: Tests continue without Redis (warnings logged)
- **Kubernetes**: Mock contexts used for cluster operations
- **External APIs**: Network calls mocked or handled with appropriate errors

### Environment Variables

Optional configuration:

```bash
export KUBECONFIG=/path/to/kubeconfig    # Kubernetes configuration
export REDIS_URL=redis://localhost:6379  # Redis connection
export LOG_LEVEL=debug                    # Logging verbosity
```

## Test Patterns

### Table-Driven Tests

```go
tests := []struct {
    name           string
    requestBody    map[string]interface{}
    expectedStatus int
    expectedError  string
}{
    {
        name: "Valid request",
        requestBody: map[string]interface{}{
            "param": "value",
        },
        expectedStatus: http.StatusOK,
    },
}
```

### HTTP Request Testing

```go
gin.SetMode(gin.TestMode)
w := httptest.NewRecorder()
c, _ := gin.CreateTestContext(w)

jsonBody, _ := json.Marshal(requestBody)
req, _ := http.NewRequest(http.MethodPost, "/endpoint", bytes.NewBuffer(jsonBody))
req.Header.Set("Content-Type", "application/json")
c.Request = req

handler(c)
assert.Equal(t, expectedStatus, w.Code)
```

## Troubleshooting

### Common Issues

1. **Test Timeout**: Some tests involve network calls

   - Solution: Run with increased timeout: `go test -timeout 5m`

2. **Redis Connection Errors**: Expected in test environment

   - Solution: Tests handle Redis unavailability gracefully

3. **Kubernetes Context Errors**: Expected without cluster setup

   - Solution: Tests mock Kubernetes operations appropriately

4. **Race Conditions**: Rare failures when running full suite
   - Solution: Run individual test files or use `go test -p 1`

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=debug
go test ./test/api/... -v
```

### Cleaning Up

Remove temporary files:

```bash
# Unix/Linux/macOS
make clean

# Windows
Remove-Item -Path *.tmp, *_result.tmp, test_results.txt -Force

# Manual
rm -f *.tmp *_result.tmp test_results.txt coverage.out coverage.html
```

## Contributing

### Adding New Tests

1. Create test file: `new_handler_test.go`
2. Follow table-driven test pattern
3. Include positive, negative, and edge cases
4. Add comprehensive assertions
5. Update this README

### Test Guidelines

- Use descriptive test names
- Test both success and failure scenarios
- Mock external dependencies
- Validate HTTP status codes and response bodies
- Handle environment-specific conditions gracefully

### Performance Considerations

- Individual test files: < 1 second
- Full test suite: < 30 seconds
- Use parallel testing where appropriate: `t.Parallel()`
- Clean up resources after tests

## Maintenance

### Regular Tasks

1. **Update Dependencies**: Keep test libraries current
2. **Review Coverage**: Aim for >95% code coverage
3. **Monitor Performance**: Keep test execution time reasonable
4. **Update Documentation**: Keep README and comments current

### Metrics Tracking

Track test metrics:

- Execution time trends
- Success/failure rates
- Coverage percentages
- CI/CD pipeline performance

---

For questions or issues with the test suite, please refer to the main project documentation or open an issue in the repository.
