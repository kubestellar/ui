const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');

// Global references to prevent garbage collection
let mainWindow;
let backendProcess;

// URL for the KubeStellar logo
const LOGO_URL = 'https://docs.kubestellar.io/release-0.27.2/logo.png';


// Function to download the icon from URL
async function downloadIcon(url, targetPath) {
  console.log(`Downloading icon from ${url} to ${targetPath}...`);
  
  // Make sure the directory exists
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`Created directory: ${targetDir}`);
  }
  
  try {
    // Using Node's https module to download
    const https = require('https');
    const file = fs.createWriteStream(targetPath);
    
    return new Promise((resolve, reject) => {
      https.get(url, response => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download icon: ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`Successfully downloaded icon to ${targetPath}`);
          resolve(targetPath);
        });
      }).on('error', err => {
        fs.unlink(targetPath, () => {}); // Delete the file if there's an error
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error downloading icon:', error);
    return null;
  }
}

// Improved icon resolution function
async function resolveIconPath() {
  console.log('Resolving application icon...');
  
  // Platform-specific icon extensions
  const platformIconExtension = {
    'win32': '.ico',
    'darwin': '.icns',
    'linux': '.png'
  };
  
  const defaultExtension = '.png'; // Using PNG for all platforms for the KubeStellar logo
  const iconBaseName = `kubestellar-logo${defaultExtension}`;
  
  // Define the target path for the downloaded icon
  let targetIconPath;
  if (app.isPackaged) {
    // In packaged app, save to the resources directory
    targetIconPath = path.join(process.resourcesPath, 'assets', 'icons', iconBaseName);
  } else {
    // In development, save to the assets directory
    targetIconPath = path.join(__dirname, 'assets', 'icons', iconBaseName);
  }
  
  // If the icon doesn't exist yet, download it
  if (!fs.existsSync(targetIconPath)) {
    try {
      await downloadIcon(LOGO_URL, targetIconPath);
    } catch (error) {
      console.error('Failed to download icon:', error);
    }
  }
  
  // Possible icon locations in priority order
  const possiblePaths = [];
  
  // First try the downloaded icon
  possiblePaths.push(targetIconPath);
  
  // Then fallback paths
  // In packaged app
  if (app.isPackaged) {
    possiblePaths.push(
      path.join(process.resourcesPath, 'assets', 'icons', 'icon.png'),
      path.join(process.resourcesPath, 'assets', 'icon.png'),
      path.join(process.resourcesPath, 'icon.png')
    );
  } else {
    // In development mode
    possiblePaths.push(
      path.join(__dirname, 'assets', 'icons', 'icon.png'),
      path.join(__dirname, 'assets', 'icon.png'),
      path.join(__dirname, '..', 'assets', 'icons', 'icon.png'),
      path.join(__dirname, 'icon.png')
    );
  }
  
  // Try all possible paths
  for (const iconPath of possiblePaths) {
    console.log('Checking for icon at:', iconPath);
    if (fs.existsSync(iconPath)) {
      console.log('Found icon at:', iconPath);
      return { path: iconPath, exists: true };
    }
  }
  
  // If we get here, no icon was found
  console.warn('No icon found in any location');
  
  // Return the target path as fallback, even though it doesn't exist
  return { path: targetIconPath, exists: false };
}

// Create the browser window
async function createWindow() {
  console.log('Creating main window...');
  
  // Resolve icon path (this is now async)
  const icon = await resolveIconPath();
  
  // Create the browser window with appropriate options
  const options = {
    width: 3200,       
    height: 1800,      
    minWidth: 1600,    
    minHeight: 1000, 
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    backgroundColor: '#FFFFFF',
    // Optional: set app title
    title: 'KubeStellar'
  };
  
  // Only add icon if it exists
  if (icon.exists) {
    options.icon = icon.path;
    console.log('Setting window icon to:', icon.path);
  } else {
    console.warn('No icon found, window will use default icon');
  }
  
  mainWindow = new BrowserWindow(options);  // Pass options to BrowserWindow constructor

  console.log('ELECTRON_SERVE =', process.env.ELECTRON_SERVE);
  console.log('App is packaged =', app.isPackaged);
  
  // Load the app
  if (process.env.ELECTRON_SERVE === 'true') {
    console.log('Loading from dev server: http://localhost:5173');
    // We're in development mode, load from the dev server
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development mode
    mainWindow.webContents.openDevTools();
  } else {
    // IMPORTANT FIX: In production, the path needs to be resolved correctly
    // The issue was using __dirname which in asar context might not be what you expect
    const indexPath = app.isPackaged 
      ? path.join(app.getAppPath(), 'dist', 'index.html')
      : path.join(__dirname, 'dist', 'index.html');
      
    console.log('Loading from file:', indexPath);
    mainWindow.loadFile(indexPath);
    
    // Uncomment this line to open DevTools in production for debugging
    // mainWindow.webContents.openDevTools();
  }

  // Handle window closure
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Path to the Go backend executable
const getBackendPath = () => {
  const platform = os.platform();
  const arch = os.arch(); // Get architecture (x64, arm64, etc.)
  const extension = platform === 'win32' ? '.exe' : '';
  
  // Choose binary name based on platform and architecture
  let binaryName;
  if (platform === 'win32') {
    binaryName = 'kubestellar-backend-windows-amd64' + extension;
  } else if (platform === 'darwin') {
    // Check architecture on macOS
    binaryName = arch === 'arm64' 
      ? 'kubestellar-backend-darwin-arm64'
      : 'kubestellar-backend-darwin-amd64';
  } else {
    // Linux - choose based on architecture
    if (arch === 'arm64') {
      binaryName = 'kubestellar-backend-linux-arm64';
    } else if (arch === 'arm') {
      binaryName = 'kubestellar-backend-linux-arm';
    } else {
      binaryName = 'kubestellar-backend-linux-amd64';
    }
  }
  
  // In development mode, look for the backend in a different location
  if (process.env.ELECTRON_SERVE === 'true') {
    // Check multiple possible locations
    const possiblePaths = [
      path.join(__dirname, '../backend/bin', binaryName),
      path.join(__dirname, 'backend/bin', binaryName),
      path.join(__dirname, '../../backend/bin', binaryName)
    ];
    
    for (const testPath of possiblePaths) {
      console.log('Checking for backend at:', testPath);
      if (fs.existsSync(testPath)) {
        console.log('Found backend at:', testPath);
        return testPath;
      }
    }
    
    // Default to the first path if none found
    return possiblePaths[0];
  }
  
  // In production, look in the resources/backend directory
  const prodPath = path.join(process.resourcesPath, 'resources', 'backend', binaryName);
  console.log('Production backend path:', prodPath);
  
  // Check if the specific binary exists
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }
  
  // If the specific binary doesn't exist, try the generic name
  const genericPath = path.join(process.resourcesPath, 'resources', 'backend', 'kubestellar-backend');
  if (fs.existsSync(genericPath)) {
    console.log('Found generic backend at:', genericPath);
    return genericPath;
  }
  
  // Return the original path, even if it doesn't exist
  return prodPath;
}

// Start the backend process
function startBackend() {
  const backendPath = getBackendPath();
  
  console.log('Looking for backend at:', backendPath);
  
  if (!fs.existsSync(backendPath)) {
    console.error('Backend not found at:', backendPath);
    
    // Try some alternative paths
    const alternativePaths = [
      // Try without the resources directory
      path.join(process.resourcesPath, 'backend', path.basename(backendPath)),
      // Try with a different backend name
      path.join(process.resourcesPath, 'resources', 'backend', 'kubestellar-backend'),
      // Try with an absolute path based on app location
      path.join(app.getAppPath(), '..', 'resources', 'backend', path.basename(backendPath))
    ];
    
    let foundAlternative = false;
    for (const altPath of alternativePaths) {
      console.log('Checking alternative path:', altPath);
      if (fs.existsSync(altPath)) {
        console.log('Found backend at alternative path:', altPath);
        foundAlternative = true;
        backendProcess = startBackendProcess(altPath);
        return;
      }
    }
    
    // In development mode, just show a warning
    if (process.env.ELECTRON_SERVE === 'true') {
      console.warn('Running in development mode without backend');
      return;
    }
    
    // In production, show an error but don't quit
    dialog.showErrorBox(
      'Backend Not Found',
      `Could not find the KubeStellar backend at: ${backendPath}. ` +
      'The application will continue but some features may not work.'
    );
    return;
  }

  // Start the backend if we found it
  backendProcess = startBackendProcess(backendPath);
}

// Helper function to start the backend process
function startBackendProcess(backendPath) {
  // Environment variables for the backend
  const env = {
    ...process.env,
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    REDIS_ENABLED: 'false', // Set to false to disable Redis requirement
    POSTGRES_HOST: 'localhost',
    POSTGRES_PORT: '5432',
    POSTGRES_USER: 'postgres',
    POSTGRES_PASSWORD: 'password',
    POSTGRES_DB: 'jwt_db',
    JWT_SECRET: 'your-secret-key'
  };

  console.log('Starting backend process from:', backendPath);
  
  // Skip chmod for AppImage (read-only filesystem)
  // just check if the file exists and is executable
  if (!fs.existsSync(backendPath)) {
    console.error('Backend binary does not exist:', backendPath);
    return null;
  }
  
  try {
    // Check if file is executable
    const stats = fs.statSync(backendPath);
    const isExecutable = !!(stats.mode & 0o111);
    console.log('Backend is executable:', isExecutable);
    
    if (!isExecutable && !app.isPackaged) {
      // Make it executable if not in AppImage (which is read-only)
      fs.chmodSync(backendPath, 0o755);
      console.log('Made backend executable');
    }
  } catch (err) {
    console.error('Error checking file stats:', err);
  }
  
  // Spawn the backend process
  const proc = spawn(backendPath, [], { env });

  proc.stdout.on('data', (data) => {
    console.log(`Backend stdout: ${data}`);
  });

  proc.stderr.on('data', (data) => {
    console.error(`Backend stderr: ${data}`);
  });

  proc.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    if (code !== 0 && mainWindow) {
      dialog.showErrorBox(
        'Backend Error',
        `The KubeStellar backend exited with code ${code}. The application may not function correctly.`
      );
    }
  });
  
  return proc;
}

// Create window when Electron is ready
app.whenReady().then(async () => {
  // Print important debug paths
  console.log('App path:', app.getAppPath());
  console.log('Resource path:', process.resourcesPath);
  console.log('Current directory:', __dirname);
  console.log('Is packaged:', app.isPackaged);
  
  // List all files in the resources directory to help debug
  if (app.isPackaged) {
    try {
      console.log('Contents of resources directory:');
      listDirectoryContents(process.resourcesPath);
    } catch (err) {
      console.error('Failed to list resources directory:', err);
    }
  }
  
  // Start the backend first if it exists
  startBackend();
  
  // Then create the window (now async)
  await createWindow();
  
  // Set app icon in taskbar/dock (macOS specific)
  if (process.platform === 'darwin') {
    try {
      const icon = await resolveIconPath();
      if (icon.exists) {
        app.dock.setIcon(icon.path);
        console.log('Set dock icon to:', icon.path);
      }
    } catch (err) {
      console.error('Failed to set dock icon:', err);
    }
  }
});

// Helper function to recursively list directory contents
function listDirectoryContents(dirPath, level = 0) {
  if (level > 2) return; // Only go 2 levels deep to avoid too much output
  
  const indent = '  '.repeat(level);
  try {
    const items = fs.readdirSync(dirPath);
    items.forEach(item => {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      console.log(`${indent}${item} ${stats.isDirectory() ? '(dir)' : '(file)'}`);
      if (stats.isDirectory()) {
        listDirectoryContents(itemPath, level + 1);
      }
    });
  } catch (err) {
    console.error(`${indent}Error reading directory ${dirPath}:`, err);
  }
}

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, recreate window when dock icon is clicked and no windows are open
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Clean up the backend when the app is about to quit
app.on('will-quit', () => {
  if (backendProcess) {
    if (os.platform() === 'win32') {
      // On Windows, we need to use taskkill to terminate the process tree
      spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
    } else {
      // On Unix-like systems, we can kill the process group
      backendProcess.kill();
    }
  }
});