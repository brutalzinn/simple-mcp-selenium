---
title: "MCP Selenium Server"
description: "MCP Server for browser automation using Selenium WebDriver"
---

# MCP Selenium Server

A powerful Model Context Protocol (MCP) server that provides browser automation capabilities using Selenium WebDriver.

## Features

- **Chrome Browser Support**: Full Chrome browser automation
- **Custom Browser IDs**: LLM clients can specify custom browser IDs for session management
- **Persistent Sessions**: Browsers stay open until explicitly closed
- **Comprehensive Tools**: Navigation, clicking, typing, screenshots, and more
- **Plugin System**: Extensible architecture for custom tools
- **Console Logging**: Capture and read browser console output
- **Docker Support**: Easy deployment with Docker Compose
- **Multi-instance Management**: Handle multiple browser instances simultaneously
- **State Persistence**: Browsers maintain their state and URL between operations

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/brutalzinn/simple-mcp-selenium.git
cd simple-mcp-selenium

# Start with Docker Compose
docker compose up --build
```

### Option 2: Local Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

### Using with MCP Clients

1. Configure your MCP client to connect to the server
2. Use the available tools for browser automation
3. Manage multiple browser instances with custom IDs

## Documentation

- [Installation Guide](getting-started/installation/)
- [Cursor Integration](getting-started/cursor-setup/)
- [API Reference](api-reference/)
- [Examples](examples/)
- [Plugin Development](plugins/)

## Repository

[GitHub Repository](https://github.com/brutalzinn/simple-mcp-selenium)

## Credits

Created and maintained by [@brutalzinn](https://github.com/brutalzinn)

---

**Contributing**: Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests to help improve this project.
