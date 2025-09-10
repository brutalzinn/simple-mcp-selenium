# 🚀 Docker Installation Guide - Keep MCP Server Running

This guide shows you how to install the MCP Selenium server using Docker and Docker Compose so it runs automatically when your computer starts.

## 🐳 **Docker Installation (Recommended)**

**Best for**: All platforms, isolated environments, easy deployment

```bash
# Run the simple installation script
./scripts/install-simple.sh
```

**What it does:**

- Creates a Docker container with Chrome browser
- Installs all dependencies automatically
- Sets up automatic restart
- Provides full browser automation support
- Isolates the service completely

**Docker Management:**

```bash
docker-compose up -d        # Start service
docker-compose down         # Stop service
docker-compose restart      # Restart service
docker-compose logs -f      # View logs
docker-compose ps           # Check status
```

## 🔧 **Manual Docker Installation (Advanced)**

### **Docker (Manual)**

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

### **Docker Compose (Manual)**

1. **Start the service:**

```bash
docker-compose up -d --build
```

2. **Check status:**

```bash
docker-compose ps
```

## ✅ **Verification**

After installation, verify the service is running:

### **Check Status**

```bash
# Check Docker container status
docker-compose ps

# Check container logs
docker-compose logs -f

# Check if browser is working
node scripts/test-docker-browser.js
```

### **Test MCP Server**

```bash
# Test if the server responds
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | docker exec -i mcp-selenium-server node -e "process.stdin.pipe(process.stdout)"
```

## 🔧 **Troubleshooting**

### **Docker Issues**

- Check logs: `docker-compose logs -f`
- Rebuild container: `docker-compose down && docker-compose up -d --build`
- Check Docker status: `docker ps`
- Check browser support: `node scripts/test-docker-browser.js`

### **Browser Not Working**

- Ensure Xvfb is running: `docker exec mcp-selenium-server ps aux | grep Xvfb`
- Check Chrome installation: `docker exec mcp-selenium-server which chromium-browser`
- Verify display: `docker exec mcp-selenium-server echo $DISPLAY`

## 🎯 **Why Docker?**

**Docker is the best choice because:**

- ✅ Complete isolation from your system
- ✅ Includes Chrome browser and all dependencies
- ✅ Works on any platform (Linux, macOS, Windows)
- ✅ Automatic restart on failure
- ✅ Easy to manage and update
- ✅ No system dependencies to install
- ✅ Consistent environment

## 🚀 **Ready to Go!**

Once installed, your MCP Selenium server will:

- ✅ Start automatically when your computer boots
- ✅ Restart automatically if it crashes
- ✅ Run in the background with full browser support
- ✅ Be available for Cursor IDE to use
- ✅ Take screenshots and save them to your local folder

**No more manual starting required!** 🎉
