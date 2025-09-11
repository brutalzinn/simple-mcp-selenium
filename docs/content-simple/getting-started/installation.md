---
title: "Installation"
description: "How to install the MCP Selenium Server"
---

# Installation

## Prerequisites

- Node.js 18+
- Chrome browser (for Chrome automation)
- ChromeDriver (automatically downloaded)

## Install via npm

```bash
npm install -g mcp-selenium-server
```

## Install from source

```bash
git clone https://github.com/brutalzinn/simple-mcp-selenium.git
cd simple-mcp-selenium
npm install
npm run build
```

## Docker Installation

```bash
docker-compose up -d
```

## Verify Installation

```bash
mcp-selenium-server --version
```
