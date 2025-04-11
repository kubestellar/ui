const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const os = require('os');

const execAsync = promisify(exec);

// Get the backend directory path
function getBackendDir() {
  // Check for the backend in the parent directory first (common setup)
  const parentBackendDir = path.join(__dirname, '../../backend');
  
  if (fs.existsSync(parentBackendDir)) {
    return parentBackendDir;
  }
  
  // Check for the backend as a sibling to the 'ui' directory
  const siblingBackendDir = path.join(__dirname, '../backend');
  
  if (fs.existsSync(siblingBackendDir)) {
    return siblingBackendDir;
  }
  
  // Default: Use a backend directory in the current project
  return path.join(__dirname, '../backend');
}

// Get the output bin directory
function getBinDir() {
  const backendDir = getBackendDir();
  const binDir = path.join(backendDir, 'bin');
  
  // Create bin directory if it doesn't exist
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }
  
  return binDir;
}

// Check if Go is installed
async function checkGo() {
  try {
    const { stdout } = await execAsync('go version');
    console.log('Go is installed:', stdout.trim());
    return true;
  } catch (error) {
    console.error('Go is not installed or not in the PATH');
    console.error('Please install Go before building the backend');
    return false;
  }
}

// Build the backend for the current platform
async function buildBackend() {
  const backendDir = getBackendDir();
  const binDir = getBinDir();
  const platform = os.platform();
  const extension = platform === 'win32' ? '.exe' : '';
  const outputPath = path.join(binDir, `kubestellar-backend${extension}`);
  
  console.log(`Building backend in ${backendDir}`);
  console.log(`Output path: ${outputPath}`);
  
  try {
    // Check if the backend main.go file exists
    const mainFile = path.join(backendDir, 'main.go');
    if (!fs.existsSync(mainFile)) {
      console.error(`Backend source file not found: ${mainFile}`);
      return false;
    }
    
    // Run the build command
    console.log('Running go build...');
    await execAsync(`cd ${backendDir} && go build -o ${outputPath}`);
    
    console.log('Backend built successfully');
    return true;
  } catch (error) {
    console.error('Failed to build backend:', error);
    return false;
  }
}

// Main function
async function main() {
  // Check if the backend binary already exists
  const binDir = getBinDir();
  const platform = os.platform();
  const extension = platform === 'win32' ? '.exe' : '';
  const outputPath = path.join(binDir, `kubestellar-backend${extension}`);
  
  if (fs.existsSync(outputPath)) {
    console.log('Backend binary already exists:', outputPath);
    process.exit(0);
  }
  
  // Check if Go is installed
  const goInstalled = await checkGo();
  if (!goInstalled) {
    process.exit(1);
  }
  
  // Build the backend
  const buildSuccess = await buildBackend();
  if (!buildSuccess) {
    process.exit(1);
  }
  
  console.log('Backend build and setup completed successfully');
}

// Run the main function
main().catch(err => {
  console.error('An error occurred:', err);
  process.exit(1);
});