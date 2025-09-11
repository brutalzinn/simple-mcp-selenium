# MCP Selenium Server Makefile
# Provides easy commands for project setup, development, and documentation

.PHONY: help install build test clean dev docs docs-local docs-build docs-serve lint format

# Default target
help: ## Show this help message
	@echo "MCP Selenium Server - Available Commands:"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  install          Install all dependencies"
	@echo "  install-docs     Install Hugo for documentation"
	@echo "  build            Build the TypeScript project"
	@echo "  clean            Clean build artifacts and dependencies"
	@echo ""
	@echo "Development:"
	@echo "  dev              Start development server"
	@echo "  test             Run tests"
	@echo "  lint             Run ESLint"
	@echo "  format           Format code with Prettier"
	@echo ""
	@echo "Documentation:"
	@echo "  docs             Build and serve documentation locally"
	@echo "  docs-local       Serve documentation at http://localhost:1313/"
	@echo "  docs-build       Build documentation for production"
	@echo "  docs-serve       Serve built documentation"
	@echo ""
	@echo "Docker:"
	@echo "  docker-build     Build Docker image"
	@echo "  docker-run       Run Docker container"
	@echo "  docker-stop      Stop Docker container"
	@echo ""
	@echo "Utilities:"
	@echo "  check-deps       Check if all dependencies are installed"
	@echo "  update-deps      Update all dependencies"

# Setup & Installation
install: ## Install all dependencies
	@echo "📦 Installing Node.js dependencies..."
	npm install
	@echo "✅ Node.js dependencies installed"
	@echo ""
	@echo "📦 Installing Hugo for documentation..."
	@if command -v hugo >/dev/null 2>&1; then \
		echo "✅ Hugo is already installed: $$(hugo version)"; \
	else \
		echo "❌ Hugo not found. Please install Hugo:"; \
		echo "   - Ubuntu/Debian: sudo apt install hugo"; \
		echo "   - macOS: brew install hugo"; \
		echo "   - Windows: choco install hugo"; \
		echo "   - Or download from: https://github.com/gohugoio/hugo/releases"; \
	fi

install-docs: ## Install Hugo for documentation
	@echo "📦 Installing Hugo for documentation..."
	@if command -v hugo >/dev/null 2>&1; then \
		echo "✅ Hugo is already installed: $$(hugo version)"; \
	else \
		echo "❌ Hugo not found. Please install Hugo:"; \
		echo "   - Ubuntu/Debian: sudo apt install hugo"; \
		echo "   - macOS: brew install hugo"; \
		echo "   - Windows: choco install hugo"; \
		echo "   - Or download from: https://github.com/gohugoio/hugo/releases"; \
	fi

build: ## Build the TypeScript project
	@echo "🔨 Building TypeScript project..."
	npm run build
	@echo "✅ Build completed"

clean: ## Clean build artifacts and dependencies
	@echo "🧹 Cleaning build artifacts..."
	rm -rf dist/
	rm -rf node_modules/
	rm -rf docs/public/
	rm -rf docs/resources/
	@echo "✅ Clean completed"

# Development
dev: build ## Start development server
	@echo "🚀 Starting MCP Selenium Server..."
	@echo "   Server will be available via MCP protocol"
	@echo "   Press Ctrl+C to stop"
	node dist/index.js

test: build ## Run tests
	@echo "🧪 Running tests..."
	npm test
	@echo "✅ Tests completed"

test-scenarios: build ## Run test scenarios
	@echo "🧪 Running test scenarios..."
	@echo "   Available scenarios:"
	@echo "   - test/scripts/test-simple-mcp.js"
	@echo "   - test/scripts/test-browser-state-persistence.js"
	@echo "   - test/scripts/test-multi-browser-scenario.js"
	@echo "   - test/scripts/debug-browser-sessions.js"
	@echo ""
	@echo "   Example: node test/scripts/test-simple-mcp.js"
	@echo "✅ Test scenarios available"

lint: ## Run ESLint
	@echo "🔍 Running ESLint..."
	npm run lint
	@echo "✅ Linting completed"

format: ## Format code with Prettier
	@echo "✨ Formatting code..."
	npx prettier --write "src/**/*.{ts,js,json}"
	npx prettier --write "test/**/*.{ts,js,json}"
	npx prettier --write "scripts/**/*.{ts,js,json}"
	@echo "✅ Formatting completed"

# Documentation
docs: docs-build docs-serve ## Build and serve documentation locally

docs-local: ## Serve documentation at http://localhost:1313/
	@echo "📚 Starting Hugo documentation server..."
	@echo "   Documentation will be available at: http://localhost:1313/"
	@echo "   Press Ctrl+C to stop"
	cd docs && hugo server --config hugo-local.toml --contentDir content-simple --bind 0.0.0.0 --port 1313 --buildDrafts

docs-build: ## Build documentation for production
	@echo "📚 Building documentation..."
	cd docs && hugo --config hugo-minimal.toml --contentDir content-simple --minify --buildDrafts --buildFuture
	@echo "✅ Documentation built in docs/public/"

docs-serve: docs-build ## Serve built documentation
	@echo "📚 Serving built documentation..."
	@echo "   Documentation available at: http://localhost:8080/"
	@echo "   Press Ctrl+C to stop"
	cd docs/public && python3 -m http.server 8080

# Docker
docker-build: ## Build Docker image
	@echo "🐳 Building Docker image..."
	docker build -t mcp-selenium-server .
	@echo "✅ Docker image built"

docker-run: ## Run Docker container
	@echo "🐳 Starting Docker container..."
	docker-compose up -d
	@echo "✅ Docker container started"

docker-stop: ## Stop Docker container
	@echo "🐳 Stopping Docker container..."
	docker-compose down
	@echo "✅ Docker container stopped"

# Utilities
check-deps: ## Check if all dependencies are installed
	@echo "🔍 Checking dependencies..."
	@echo ""
	@echo "Node.js:"
	@if command -v node >/dev/null 2>&1; then \
		echo "  ✅ Node.js: $$(node --version)"; \
	else \
		echo "  ❌ Node.js not found"; \
	fi
	@echo ""
	@echo "npm:"
	@if command -v npm >/dev/null 2>&1; then \
		echo "  ✅ npm: $$(npm --version)"; \
	else \
		echo "  ❌ npm not found"; \
	fi
	@echo ""
	@echo "Hugo:"
	@if command -v hugo >/dev/null 2>&1; then \
		echo "  ✅ Hugo: $$(hugo version | head -1)"; \
	else \
		echo "  ❌ Hugo not found"; \
	fi
	@echo ""
	@echo "Docker:"
	@if command -v docker >/dev/null 2>&1; then \
		echo "  ✅ Docker: $$(docker --version)"; \
	else \
		echo "  ❌ Docker not found"; \
	fi
	@echo ""
	@echo "Docker Compose:"
	@if command -v docker-compose >/dev/null 2>&1; then \
		echo "  ✅ Docker Compose: $$(docker-compose --version)"; \
	else \
		echo "  ❌ Docker Compose not found"; \
	fi

update-deps: ## Update all dependencies
	@echo "🔄 Updating dependencies..."
	npm update
	@echo "✅ Dependencies updated"

# Quick start commands
quick-start: install build docs-build ## Quick start: install, build, and prepare documentation
	@echo ""
	@echo "🎉 Quick start completed!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Start the MCP server:    make dev"
	@echo "  2. View documentation:      make docs-local"
	@echo "  3. Run tests:               make test"
	@echo ""

# Development workflow
dev-setup: install build docs-build ## Complete development setup
	@echo ""
	@echo "🚀 Development setup completed!"
	@echo ""
	@echo "Available commands:"
	@echo "  make dev          - Start MCP server"
	@echo "  make docs-local    - Start documentation server"
	@echo "  make test          - Run tests"
	@echo "  make lint          - Run linting"
	@echo "  make format        - Format code"
	@echo ""

# Show project info
info: ## Show project information
	@echo "MCP Selenium Server"
	@echo "=================="
	@echo "Version: 1.0.0"
	@echo "Description: MCP Server for browser automation using Selenium WebDriver"
	@echo "Repository: https://github.com/brutalzinn/simple-mcp-selenium"
	@echo "Documentation: https://brutalzinn.github.io/simple-mcp-selenium/"
	@echo ""
	@echo "Features:"
	@echo "  • Multi-browser support (Chrome, Firefox, DuckDuckGo)"
	@echo "  • Custom browser ID management"
	@echo "  • Persistent browser sessions"
	@echo "  • Comprehensive automation tools"
	@echo "  • Plugin system for extensibility"
	@echo "  • Console logging and monitoring"
	@echo "  • Docker support"
	@echo "  • Complete documentation"
