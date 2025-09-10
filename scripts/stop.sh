#!/bin/bash

echo "🛑 Stopping MCP Selenium Server..."
echo "=================================="
echo ""

# Stop the container
docker compose down

echo ""
echo "✅ MCP Selenium Server stopped!"
echo ""
echo "📋 To start again, run: ./start.sh"
