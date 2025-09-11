# MCP Selenium Server

> **Powerful browser automation for Cursor IDE with multi-browser instance support**

[![Documentation](https://img.shields.io/badge/docs-latest-blue)](https://robertocpaes.github.io/mcp-selenium/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![GitHub](https://img.shields.io/badge/github-mcp--selenium-black)](https://github.com/robertocpaes/mcp-selenium)

## 🚀 What is this?

MCP Selenium Server lets you control browsers using **natural language** in Cursor IDE. Perfect for testing, automation, and multi-user scenarios.

**Example:** Just tell Cursor "Open a browser, go to Google, search for 'hello world', and take a screenshot" - and it happens!

## ⚡ Quick Start

### 1. Install (Docker - Recommended)

```bash
git clone https://github.com/robertocpaes/mcp-selenium.git
cd mcp-selenium
./scripts/install-simple.sh
```

### 2. Configure Cursor IDE

Add to Cursor settings:

```json
{
  "mcp.servers": {
    "selenium-browser": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "mcp-selenium-server",
        "node",
        "/app/dist/index.js"
      ]
    }
  }
}
```

### 3. Use it!

Restart Cursor and start talking to your browser:

- "Open a browser and go to example.com"
- "Click the login button"
- "Type 'admin@example.com' in the email field"
- "Take a screenshot"

## 🎯 Key Features

- **🤖 Natural Language Control** - Tell Cursor what to do in plain English
- **🌐 Multi-Browser Support** - Manage multiple browser instances with unique IDs
- **🔌 Plugin System** - Extend functionality with custom plugins
- **📸 Screenshots** - Capture page states automatically
- **🔄 Drag & Drop** - Full interaction support
- **⚡ Fast** - Optimized for speed (3-second timeouts)

## 📚 Documentation

**Complete documentation:** [https://robertocpaes.github.io/mcp-selenium/](https://robertocpaes.github.io/mcp-selenium/)

- [Getting Started](https://robertocpaes.github.io/mcp-selenium/getting-started/)
- [API Reference](https://robertocpaes.github.io/mcp-selenium/api-reference/)
- [Examples](https://robertocpaes.github.io/mcp-selenium/examples/)
- [Plugin Development](https://robertocpaes.github.io/mcp-selenium/plugins/)

## 🛠️ Available Tools

| Tool              | What it does   | Example                              |
| ----------------- | -------------- | ------------------------------------ |
| `open_browser`    | Start browser  | "Open a browser"                     |
| `navigate_to`     | Go to URL      | "Go to google.com"                   |
| `click_element`   | Click things   | "Click the login button"             |
| `type_text`       | Type text      | "Type 'hello' in the search box"     |
| `drag_and_drop`   | Move elements  | "Drag the menu to the workflow area" |
| `take_screenshot` | Capture page   | "Take a screenshot"                  |
| `execute_script`  | Run JavaScript | "Execute some JavaScript"            |

## 🌐 Multi-Browser Mode

Perfect for testing multiple users or scenarios:

```bash
# User 1
"Open a browser with ID 'user1' and go to site1.com"

# User 2
"Open a browser with ID 'user2' and go to site2.com"

# Use specific browsers
"Click the button in browser 'user1'"
"Fill the form in browser 'user2'"
```

## 🔌 Plugins

Extend functionality with plugins:

- **CAPTCHA Solver** - Handle CAPTCHAs automatically
- **Data Extractor** - Extract data from tables and forms
- **Google Search** - Built-in Google search
- **Performance Monitor** - Track page performance

[View all plugins →](https://robertocpaes.github.io/mcp-selenium/plugins/)

## 🐳 Docker Commands

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# View logs
docker-compose logs -f
```

## 🤝 Contributing

1. Fork the repo
2. Create your feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Need Help?

- 📖 [Full Documentation](https://robertocpaes.github.io/mcp-selenium/)
- 💬 [GitHub Discussions](https://github.com/robertocpaes/mcp-selenium/discussions)
- 🐛 [Report Issues](https://github.com/robertocpaes/mcp-selenium/issues)

---

**Made with ❤️ for the Cursor IDE community**

**Made with 😠 for other alternatives i found that uses internal proxies to somewhere i dont know**
