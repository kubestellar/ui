#!/bin/bash

# API Test Runner Script
echo "==============================================="
echo "       KubeStellar UI - API Test Suite"
echo "==============================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo -e "${RED}Error: Go is not installed or not in PATH${NC}"
    exit 1
fi

# Change to backend directory if not already there
if [[ ! -f "go.mod" ]]; then
    if [[ -d "backend" ]]; then
        cd backend
        echo -e "${BLUE}Changed to backend directory${NC}"
    else
        echo -e "${RED}Error: Cannot find go.mod file or backend directory${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}Current directory: $(pwd)${NC}"
echo

# Clean up any previous test results and temporary files
rm -f test_results.txt test_summary.txt *.tmp

# Function to run tests for a specific file
run_test_file() {
    local test_file=$1
    local test_name=$(basename "$test_file" .go)
    
    echo -e "${YELLOW}Running ${test_name}...${NC}"
    
    # Run the test and capture output
    if go test "./$test_file" -v > "${test_name}_result.tmp" 2>&1; then
        echo -e "${GREEN}✓ ${test_name} completed${NC}"
        return 0
    else
        echo -e "${RED}✗ ${test_name} had failures${NC}"
        return 1
    fi
}

# Run individual test files
echo -e "${BLUE}Running individual test files:${NC}"
echo "-------------------------------------------"

test_files=(
    "test/api/status_handler_test.go"
    "test/api/cluster_logs_test.go"
    "test/api/installer_test.go"
    "test/api/manage_clusters_test.go"
    "test/api/handlers_test.go"
    "test/api/cluster_socket_test.go"
    "test/api/installer_websocket_test.go"
    "test/api/deploy_test.go"
    "test/api/detach_test.go"
    "test/api/artifact_test.go"
    "test/api/plugins_test.go"
)

failed_files=()
passed_files=()

for test_file in "${test_files[@]}"; do
    if [[ -f "$test_file" ]]; then
        if run_test_file "$test_file"; then
            passed_files+=("$test_file")
        else
            failed_files+=("$test_file")
        fi
    else
        echo -e "${RED}Warning: Test file $test_file not found${NC}"
    fi
    echo
done

echo
echo -e "${BLUE}Running all API tests together:${NC}"
echo "-------------------------------------------"

# Run all tests together and capture detailed output
echo -e "${YELLOW}Executing: go test ./test/api/... -v${NC}"
go test ./test/api/... -v > test_results.txt 2>&1
test_exit_code=$?

# Count results
total_tests=$(grep -c "=== RUN" test_results.txt 2>/dev/null || echo "0")
passed_tests=$(grep -c "--- PASS:" test_results.txt 2>/dev/null || echo "0")
failed_tests=$(grep -c "--- FAIL:" test_results.txt 2>/dev/null || echo "0")
skipped_tests=$(grep -c "--- SKIP:" test_results.txt 2>/dev/null || echo "0")

# Generate summary
echo
echo "==============================================="
echo -e "${BLUE}           TEST RESULTS SUMMARY${NC}"
echo "==============================================="

echo -e "Total Tests:    ${BLUE}$total_tests${NC}"
echo -e "Passed:         ${GREEN}$passed_tests${NC}"
echo -e "Failed:         ${RED}$failed_tests${NC}"
echo -e "Skipped:        ${YELLOW}$skipped_tests${NC}"

if [[ $failed_tests -gt 0 ]]; then
    echo
    echo -e "${RED}Failed Tests:${NC}"
    grep "--- FAIL:" test_results.txt | sed 's/--- FAIL: /  ✗ /' || echo "  No detailed failure info available"
fi

echo
echo -e "${BLUE}Individual File Results:${NC}"
echo "-------------------------------------------"
echo -e "${GREEN}Passed Files (${#passed_files[@]}):${NC}"
for file in "${passed_files[@]}"; do
    echo "  ✓ $(basename "$file")"
done

if [[ ${#failed_files[@]} -gt 0 ]]; then
    echo
    echo -e "${RED}Failed Files (${#failed_files[@]}):${NC}"
    for file in "${failed_files[@]}"; do
        echo "  ✗ $(basename "$file")"
    done
fi

# Calculate success rate
if [[ $total_tests -gt 0 ]]; then
    success_rate=$(( (passed_tests * 100) / total_tests ))
    echo
    echo -e "${BLUE}Success Rate: ${success_rate}%${NC}"
    
    if [[ $success_rate -ge 90 ]]; then
        echo -e "${GREEN}Excellent! 🎉${NC}"
    elif [[ $success_rate -ge 75 ]]; then
        echo -e "${YELLOW}Good! 👍${NC}"
    else
        echo -e "${RED}Needs improvement 🔧${NC}"
    fi
fi

echo
echo "==============================================="
echo -e "${BLUE}Detailed results saved to: test_results.txt${NC}"
echo -e "${BLUE}View with: cat test_results.txt${NC}"
echo "==============================================="

# Clean up temporary files
rm -f *_result.tmp *.tmp

# Exit with appropriate code
if [[ $test_exit_code -eq 0 ]] && [[ ${#failed_files[@]} -eq 0 ]]; then
    echo -e "${GREEN}All tests completed successfully! ✅${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Check the results above. ❌${NC}"
    exit 1
fi 