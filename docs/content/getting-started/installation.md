---
title: "Installation"
linkTitle: "Installation"
weight: 10
description: "Install MCP Selenium Server using Docker or local installation"
---

## Installation Options

### Option 1: Docker (Recommended)

The easiest way to get started with full browser support:

```bash
# Clone the repository
git clone https://github.com/robertocpaes/mcp-selenium.git
cd mcp-selenium

# Run the simple installation script
./scripts/install-simple.sh
```

This will:

- ✅ Create a Docker container with Chrome browser
- ✅ Install all dependencies automatically
- ✅ Set up automatic restart
- ✅ Provide full browser automation support

### Option 2: Local Installation

For development or custom setups:

```bash
# Clone the repository
git clone https://github.com/robertocpaes/mcp-selenium.git
cd mcp-selenium

# Install dependencies
npm install

# Build the project
npm run build
```

## Docker Management

### Start/Stop Services

```bash
# Start the service
docker-compose up -d

# Stop the service
docker-compose down

# Restart the service
docker-compose restart

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Manual Docker Installation

1. **Build the image:**

```bash
docker build -t mcp-selenium .
```

2. **Run the container:**

```bash
docker run -d \
  --name mcp-selenium-server \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/screenshots:/app/screenshots \
  -e DISPLAY=:99 \
  mcp-selenium
```

## Verification

After installation, verify the service is running:

### Check Status

```bash
# Check Docker container status
docker-compose ps

# Check container logs
docker-compose logs -f

# Check if browser is working
node scripts/test-docker-browser.js
```

### Test MCP Server

```bash
# Test if the server responds
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | docker exec -i mcp-selenium-server node -e "process.stdin.pipe(process.stdout)"
```

## Troubleshooting

### Docker Issues

- Check logs: `docker-compose logs -f`
- Rebuild container: `docker-compose down && docker-compose up -d --build`
- Check Docker status: `docker ps`
- Check browser support: `node scripts/test-docker-browser.js`

### Browser Not Working

- Ensure Xvfb is running: `docker exec mcp-selenium-server ps aux | grep Xvfb`
- Check Chrome installation: `docker exec mcp-selenium-server which chromium-browser`
- Verify display: `docker exec mcp-selenium-server echo $DISPLAY`

## Why Docker?

**Docker is the best choice because:**

- ✅ Complete isolation from your system
- ✅ Includes Chrome browser and all dependencies
- ✅ Works on any platform (Linux, macOS, Windows)
- ✅ Automatic restart on failure
- ✅ Easy to manage and update
- ✅ No system dependencies to install
- ✅ Consistent environment

## Ready to Go!

Once installed, your MCP Selenium server will:

- ✅ Start automatically when your computer boots
- ✅ Restart automatically if it crashes
- ✅ Run in the background with full browser support
- ✅ Be available for Cursor IDE to use
- ✅ Take screenshots and save them to your local folder

**No more manual starting required!** 🎉
