#!/bin/bash

echo "🚀 Installing MCP Selenium Server with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Please install Docker from the official Docker documentation"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Please install Docker Compose from the official Docker documentation"
    exit 1
fi

# Build and start the container
echo "🐳 Building and starting MCP Selenium container..."
cd /home/robertocpaes/Projects/Pessoal/mcp-selenium
docker-compose up -d --build

# Check if container is running
echo "📊 Checking container status..."
docker-compose ps

echo ""
echo "✅ Installation complete!"
echo ""
echo "📋 Docker Management Commands:"
echo "  docker-compose up -d        # Start service"
echo "  docker-compose down         # Stop service"
echo "  docker-compose restart      # Restart service"
echo "  docker-compose logs -f      # View logs"
echo "  docker-compose ps           # Check status"
echo ""
echo "🎯 The MCP server will now start automatically when your computer boots!"
