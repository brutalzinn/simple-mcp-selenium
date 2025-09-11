---
title: "Installation"
description: "How to install the MCP Selenium Server"
---

# Installation

## Prerequisites

### For Local Installation

- Node.js 18+
- Chrome browser
- ChromeDriver (automatically downloaded)

### For Docker Installation

- Docker and Docker Compose
- No additional browser installation required (Chrome included in container)

## Installation Methods

### Method 1: Docker Compose (Recommended)

The easiest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/brutalzinn/simple-mcp-selenium.git
cd simple-mcp-selenium

# Start with Docker Compose
docker compose up --build

# Run in background
docker compose up -d --build
```

**Benefits of Docker:**

- No need to install Chrome or ChromeDriver
- Consistent environment across different systems
- Easy to manage and update
- Isolated from your system

### Method 2: Local Installation

#### Install from source

```bash
# Clone the repository
git clone https://github.com/brutalzinn/simple-mcp-selenium.git
cd simple-mcp-selenium

# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

#### Using Makefile (if available)

```bash
# Install dependencies and build
make install

# Start development server
make dev

# Run tests
make test
```

## Verify Installation

### Docker Installation

```bash
# Check if container is running
docker ps | grep mcp-selenium

# Test MCP communication
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | docker exec -i <container_name> node dist/index.js
```

### Local Installation

```bash
# Test MCP communication
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node dist/index.js
```

## Configuration

The MCP server runs on stdio by default and is ready to accept connections from MCP clients. No additional configuration is required for basic usage.

### Environment Variables

- `NODE_ENV`: Set to `production` for production builds
- `DISPLAY`: X11 display (automatically set in Docker)
