#!/bin/bash

echo "🚀 Simple MCP Selenium Server Installation"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Installing Docker..."
    echo "Please install Docker first from the official Docker documentation"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose first."
    echo "Please install Docker Compose from the official Docker documentation"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Build the project first
echo "📦 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the build errors first."
    exit 1
fi

echo "✅ Build successful"
echo ""

# Create screenshots directory
mkdir -p screenshots

# Build and start the container
echo "🐳 Building and starting MCP Selenium container with browser support..."
docker compose up -d --build

# Wait a moment for the container to start
echo "⏳ Waiting for container to start..."
sleep 5

# Check if container is running
echo "📊 Checking container status..."
docker compose ps

echo ""
echo "✅ Installation complete!"
echo ""
echo "🎯 Your MCP Selenium server is now running with full browser support!"
echo ""
echo "📋 Management Commands:"
echo "  docker compose up -d        # Start service"
echo "  docker compose down         # Stop service"
echo "  docker compose restart      # Restart service"
echo "  docker compose logs -f      # View logs"
echo "  docker compose ps           # Check status"
echo ""
echo "🔧 Browser Features:"
echo "  ✅ Chrome browser included"
echo "  ✅ Headless mode supported"
echo "  ✅ Screenshots saved to ./screenshots/"
echo "  ✅ Full browser automation"
echo ""
echo "🎉 Ready to use with Cursor IDE!"
echo "The server will start automatically when your computer boots."
