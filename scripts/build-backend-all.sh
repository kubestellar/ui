#!/bin/bash

set -e

# Get script directory and paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
BIN_DIR="$BACKEND_DIR/bin"

# Print header
echo "======================================================"
echo "🚀 KubeStellar Complete Build Script"
echo "======================================================"
echo "Building backend and frontend components..."
echo "Project root: $PROJECT_ROOT"

# Create bin directory if missing
mkdir -p "$BIN_DIR"

# PART 1: BACKEND BUILD
echo -e "\n📦 BUILDING BACKEND"
echo "------------------------------------------------------"

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go and retry."
    exit 1
fi

echo "✅ Go is installed: $(go version)"

# Check if main.go exists
if [ ! -f "$BACKEND_DIR/main.go" ]; then
    echo "❌ main.go not found at $BACKEND_DIR/main.go"
    exit 1
fi

# Detect OS and architecture for local build
GOOS=$(go env GOOS)
GOARCH=$(go env GOARCH)
EXT=""

if [ "$GOOS" == "windows" ]; then
    EXT=".exe"
fi

OUTFILE="$BIN_DIR/kubestellar-backend-${GOOS}-${GOARCH}${EXT}"
echo "🔧 Building for your system: $GOOS/$GOARCH → $OUTFILE"

pushd "$BACKEND_DIR" > /dev/null
GOOS=$GOOS GOARCH=$GOARCH CGO_ENABLED=0 go build -o "$OUTFILE" ./main.go
# Also create a non-architecture specific binary for easier reference
cp "$OUTFILE" "$BIN_DIR/kubestellar-backend${EXT}"
popd > /dev/null

echo "✅ Backend build complete. Binary located at: $OUTFILE"

# PART 2: FRONTEND BUILD
echo -e "\n📦 BUILDING FRONTEND"
echo "------------------------------------------------------"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js and retry."
    exit 1
fi

echo "✅ Node.js is installed: $(node -v)"
echo "✅ npm is installed: $(npm -v)"

# Check for package.json
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo "❌ package.json not found at $PROJECT_ROOT/package.json"
    exit 1
fi

# Install dependencies if needed
echo "🔧 Installing dependencies..."
pushd "$PROJECT_ROOT" > /dev/null
npm install
echo "✅ Dependencies installed"

# Check icon directories
echo "🔧 Checking icon directories..."
mkdir -p "$PROJECT_ROOT/assets/icons"
if [ ! -f "$PROJECT_ROOT/assets/icons/icon.png" ]; then
    echo "⚠️ Icon file not found at assets/icons/icon.png"
    
    # Try to find icon elsewhere and copy it
    ICON_FOUND=false
    
    # Possible icon locations
    ICON_PATHS=(
        "$PROJECT_ROOT/KubeStellar.png"
        "$PROJECT_ROOT/dist/KubeStellar.png"
        "$PROJECT_ROOT/src/assets/KubeStellar.png"
        "$PROJECT_ROOT/public/KubeStellar.png"
        "$PROJECT_ROOT/public/icon.png"
        "$PROJECT_ROOT/src/assets/icon.png"
    )
    
    for ICON_PATH in "${ICON_PATHS[@]}"; do
        if [ -f "$ICON_PATH" ]; then
            echo "Found icon at $ICON_PATH, copying to assets/icons/icon.png"
            cp "$ICON_PATH" "$PROJECT_ROOT/assets/icons/icon.png"
            ICON_FOUND=true
            break
        fi
    done
    
    if [ "$ICON_FOUND" = false ]; then
        echo "⚠️ Could not find icon file. You may need to create one at assets/icons/icon.png"
    fi
fi

# Build frontend
echo "🔧 Building frontend..."
npm run build

echo "✅ Frontend build complete."

# PART 3: PACKAGE APPLICATION (if requested)
if [ "$1" == "--package" ] || [ "$1" == "-p" ]; then
    echo -e "\n📦 PACKAGING APPLICATION"
    echo "------------------------------------------------------"
    
    # Check if electron.cjs has the path fix
    if ! grep -q "app.getAppPath()" "$PROJECT_ROOT/electron.cjs"; then
        echo "⚠️ electron.cjs might need the path fix. Consider updating it."
    fi
    
    echo "🔧 Packaging application..."
    
    # Create environment file if it doesn't exist
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        echo "Creating .env file with default settings..."
        cat > "$PROJECT_ROOT/.env" << EOF
VITE_API_BASE_URL=http://localhost:4000
VITE_REDIS_HOST=127.0.0.1
VITE_REDIS_PORT=6379
REDIS_ENABLED=false
EOF
    fi
    
    # Package based on OS
    case "$GOOS" in
        "darwin")
            npm run electron:build:mac
            ;;
        "windows")
            npm run electron:build:win
            ;;
        "linux")
            npm run electron:build:linux
            ;;
        *)
            echo "⚠️ Unknown OS: $GOOS. Using default packaging."
            npm run electron:build
            ;;
    esac
    
    echo "✅ Packaging complete. Check the release directory."
else
    echo -e "\n💡 TIP: Run with --package or -p flag to also package the application."
fi

popd > /dev/null

echo -e "\n======================================================"
echo "✅ BUILD PROCESS COMPLETED SUCCESSFULLY"
echo "======================================================"
echo "Backend binary: $OUTFILE"
echo "Frontend build: $PROJECT_ROOT/dist"
echo "Run with --package or -p flag to also package the application."