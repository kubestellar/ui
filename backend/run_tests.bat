@echo off
setlocal enabledelayedexpansion

REM API Test Runner Script for Windows
echo ===============================================
echo        KubeStellar UI - API Test Suite
echo ===============================================
echo.

REM Check if Go is installed
go version >nul 2>&1
if errorlevel 1 (
    echo Error: Go is not installed or not in PATH
    exit /b 1
)

REM Change to backend directory if not already there
if not exist "go.mod" (
    if exist "backend" (
        cd backend
        echo Changed to backend directory
    ) else (
        echo Error: Cannot find go.mod file or backend directory
        exit /b 1
    )
)

echo Current directory: %CD%
echo.

REM Clean up any previous test results and temporary files
if exist test_results.txt del test_results.txt
if exist test_summary.txt del test_summary.txt
if exist *.tmp del *.tmp
if exist *_result.tmp del *_result.tmp

REM Initialize counters
set passed_files=0
set failed_files=0
set total_files=0

REM Test files list
set test_files=test/api/status_handler_test.go test/api/cluster_logs_test.go test/api/installer_test.go test/api/manage_clusters_test.go test/api/handlers_test.go test/api/cluster_socket_test.go test/api/installer_websocket_test.go test/api/deploy_test.go test/api/detach_test.go test/api/artifact_test.go test/api/plugins_test.go

echo Running individual test files:
echo -------------------------------------------

REM Run individual test files
for %%f in (%test_files%) do (
    set /a total_files+=1
    if exist "%%f" (
        echo Running %%~nxf...
        go test "./%%f" -v > "%%~nf_result.tmp" 2>&1
        if !errorlevel! equ 0 (
            echo ^✓ %%~nxf completed
            set /a passed_files+=1
        ) else (
            echo ^✗ %%~nxf had failures
            set /a failed_files+=1
        )
        echo.
    ) else (
        echo Warning: Test file %%f not found
    )
)

echo.
echo Running all API tests together:
echo -------------------------------------------

REM Run all tests together and capture detailed output
echo Executing: go test ./test/api/... -v
go test ./test/api/... -v > test_results.txt 2>&1
set test_exit_code=!errorlevel!

REM Count results from test output
set total_tests=0
set passed_tests=0
set failed_tests=0

for /f %%i in ('findstr /c:"=== RUN" test_results.txt 2^>nul ^| find /c /v ""') do set total_tests=%%i
for /f %%i in ('findstr /c:"--- PASS:" test_results.txt 2^>nul ^| find /c /v ""') do set passed_tests=%%i
for /f %%i in ('findstr /c:"--- FAIL:" test_results.txt 2^>nul ^| find /c /v ""') do set failed_tests=%%i

REM Handle case where no tests found
if "!total_tests!"=="" set total_tests=0
if "!passed_tests!"=="" set passed_tests=0
if "!failed_tests!"=="" set failed_tests=0

REM Generate summary
echo.
echo ===============================================
echo            TEST RESULTS SUMMARY
echo ===============================================

echo Total Tests:    !total_tests!
echo Passed:         !passed_tests!
echo Failed:         !failed_tests!

if !failed_tests! gtr 0 (
    echo.
    echo Failed Tests:
    findstr /c:"--- FAIL:" test_results.txt 2>nul
)

echo.
echo Individual File Results:
echo -------------------------------------------
echo Passed Files: !passed_files!/!total_files!
echo Failed Files: !failed_files!/!total_files!

REM Calculate success rate
if !total_tests! gtr 0 (
    set /a success_rate=(!passed_tests! * 100) / !total_tests!
    echo.
    echo Success Rate: !success_rate!%%
    
    if !success_rate! geq 90 (
        echo Excellent! 🎉
    ) else if !success_rate! geq 75 (
        echo Good! 👍
    ) else (
        echo Needs improvement 🔧
    )
)

echo.
echo ===============================================
echo Detailed results saved to: test_results.txt
echo View with: type test_results.txt
echo ===============================================

REM Clean up temporary files
if exist *_result.tmp del *_result.tmp
if exist *.tmp del *.tmp

REM Exit with appropriate code
if !test_exit_code! equ 0 if !failed_files! equ 0 (
    echo All tests completed successfully! ✅
    exit /b 0
) else (
    echo Some tests failed. Check the results above. ❌
    exit /b 1
) 