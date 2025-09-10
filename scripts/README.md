# 📜 Scripts Directory

This directory contains utility scripts for the MCP Selenium Server.

## 🚀 Available Scripts

### **Installation & Setup**

#### `install-simple.sh`

**Purpose**: Simple Docker installation and setup
**Usage**: `./scripts/install-simple.sh`
**What it does**:

- Checks for Docker and Docker Compose
- Builds the project
- Creates screenshots directory
- Starts the MCP server with Docker
- Provides management commands

#### `download-chromedriver.js`

**Purpose**: Downloads Chrome driver automatically
**Usage**: `node scripts/download-chromedriver.js`
**What it does**:

- Uses `npx chromedriver --version` to download Chrome driver
- Ensures Chrome driver is available for Selenium
- Called automatically during npm install

### **Server Management**

#### `start.sh`

**Purpose**: Start the MCP Selenium server
**Usage**: `./scripts/start.sh`
**What it does**:

- Checks if Docker is running
- Starts or builds the container
- Shows container status
- Provides management commands

#### `stop.sh`

**Purpose**: Stop the MCP Selenium server
**Usage**: `./scripts/stop.sh`
**What it does**:

- Stops the Docker container
- Confirms server is stopped
- Shows how to start again

### **Testing & Development**

#### `test-docker-browser.js`

**Purpose**: Test Docker browser functionality
**Usage**: `node scripts/test-docker-browser.js`
**What it does**:

- Verifies Docker container is running
- Tests browser automation capabilities
- Checks if Chrome browser works in container
- Provides detailed test results

## 🔧 Usage Examples

### **Complete Setup**

```bash
# Install and start everything
./scripts/install-simple.sh

# Check if everything is working
node scripts/test-docker-browser.js
```

### **Daily Usage**

```bash
# Start the server
./scripts/start.sh

# Stop the server
./scripts/stop.sh
```

### **Development**

```bash
# Test browser functionality
node scripts/test-docker-browser.js

# Check server logs
docker compose logs -f
```

## 📋 Script Requirements

### **Prerequisites**

- **Docker** - For containerized deployment
- **Docker Compose** - For multi-container management
- **Node.js** - For JavaScript scripts
- **npm** - For package management

### **Permissions**

Make sure scripts are executable:

```bash
chmod +x scripts/*.sh
```

## 🎯 Quick Reference

| Script                     | Purpose             | When to Use             |
| -------------------------- | ------------------- | ----------------------- |
| `install-simple.sh`        | Complete setup      | First time installation |
| `start.sh`                 | Start server        | Daily usage             |
| `stop.sh`                  | Stop server         | When done working       |
| `test-docker-browser.js`   | Test functionality  | Troubleshooting         |
| `download-chromedriver.js` | Chrome driver setup | Automatic (npm install) |

## 🚀 Ready to Use!

All scripts are designed to be simple and self-explanatory. Start with `install-simple.sh` for a complete setup, then use `start.sh` and `stop.sh` for daily operations!
