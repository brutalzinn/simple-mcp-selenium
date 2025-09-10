FROM node:20-alpine

# Install Chrome and dependencies for headless browser automation
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    xvfb \
    dbus \
    ttf-dejavu \
    ttf-liberation \
    font-noto \
    mesa-dri-gallium \
    mesa-gl

# Set Chrome path and headless mode
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/bin/chromium-browser
ENV DISPLAY=:99
ENV CHROME_DEVEL_SANDBOX=/usr/lib/chromium/chrome-sandbox

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001 -G nodejs

# Make sure the user can run Chrome
RUN chown -R mcp:nodejs /usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skip postinstall script since we have Chrome in container)
RUN npm ci --only=production --ignore-scripts

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create screenshots directory
RUN mkdir -p screenshots && chown -R mcp:nodejs screenshots

# Switch to non-root user
USER mcp

# Expose port (if needed)
EXPOSE 3000

# Start Xvfb and the application
CMD ["sh", "-c", "rm -f /tmp/.X99-lock && Xvfb :99 -screen 0 1280x720x24 -ac +extension GLX +render -noreset & sleep 2 && node dist/simple-mcp-server.js"]
