const fs = require('fs');
const path = require('path');
const https = require('https');

// Path to the icon
const iconDir = path.join(__dirname, '../assets/icons');
const iconPath = path.join(iconDir, 'icon.png');

// Create icon directory if it doesn't exist
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
  console.log(`Created directory: ${iconDir}`);
}

// Check if icon already exists
if (fs.existsSync(iconPath)) {
  const stats = fs.statSync(iconPath);
  console.log(`Icon already exists at: ${iconPath}`);
  console.log(`Icon size: ${stats.size} bytes`);
  
  // If the icon is too small, it might be corrupted
  if (stats.size < 100) {
    console.log('Icon file seems too small, will recreate it');
  } else {
    process.exit(0);
  }
}

// Create a simple colored square as an icon (works without external dependencies)
function createSimpleIcon() {
  console.log('Creating a simple colored square icon...');
  
  // Simple PNG header (1x1 pixel, blue color)
  const header = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
    0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59, 0xE7, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  
  try {
    fs.writeFileSync(iconPath, header);
    console.log(`Created simple icon at: ${iconPath}`);
    return true;
  } catch (error) {
    console.error('Error creating simple icon:', error);
    return false;
  }
}

// URL for a sample Kubernetes icon
const iconUrl = 'https://raw.githubusercontent.com/kubernetes/kubernetes/master/logo/logo.png';

// Download the icon
console.log(`Downloading icon from: ${iconUrl}`);
https.get(iconUrl, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download icon: Status code ${response.statusCode}`);
    createSimpleIcon();
    process.exit(1);
  }
  
  const fileStream = fs.createWriteStream(iconPath);
  response.pipe(fileStream);
  
  fileStream.on('finish', () => {
    fileStream.close();
    console.log(`Icon downloaded successfully to: ${iconPath}`);
  });
  
  fileStream.on('error', (err) => {
    fs.unlinkSync(iconPath);
    console.error(`Error saving icon: ${err.message}`);
    createSimpleIcon();
    process.exit(1);
  });
}).on('error', (err) => {
  console.error(`Error downloading icon: ${err.message}`);
  createSimpleIcon();
  process.exit(1);
});