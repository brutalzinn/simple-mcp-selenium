#!/bin/bash

echo "🚀 Starting MCP Selenium Server with Docker..."
echo "=============================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q 'mcp-selenium-server'; then
    echo "📦 Container exists, starting..."
    docker compose up -d
else
    echo "🔨 Building and starting container for the first time..."
    docker compose up -d --build
fi

echo ""
echo "⏳ Waiting for container to start..."
sleep 3

echo ""
echo "📊 Container Status:"
docker compose ps

echo ""
echo "✅ MCP Selenium Server is running!"
echo ""
echo "🎯 Available Commands:"
echo "  docker compose logs -f      # View logs"
echo "  docker compose down         # Stop server"
echo "  docker compose restart      # Restart server"
echo ""
echo "🎉 Ready to use with Cursor IDE!"
