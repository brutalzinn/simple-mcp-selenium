import { WebDriver, Session } from 'selenium-webdriver';
import { BrowserSession } from '../../common/types.js';
import { ChromeDriverManager } from '../../utils/chromeDriverManager.js';
import { Logger } from '../../utils/logger.js';

function getMonitorPosition(monitor: string): { x: number; y: number } {
  switch (monitor) {
    case 'primary':
      return { x: 0, y: 0 };
    case 'secondary':
      return { x: 1920, y: 0 }; // Assuming 1920px width for primary monitor
    case 'auto':
    default:
      return { x: 0, y: 0 };
  }
}

export async function openBrowserTool(
  args: any,
  browserSessions: Map<string, BrowserSession>,
  chromeDriverManager: ChromeDriverManager,
  logger: Logger,
  setBadge: (args: any) => Promise<any> // Pass setBadge as a dependency
) {
  const { browserId, headless = false, width = 1920, height = 1080, badge, url, x, y, monitor } = args;

  if (browserSessions.has(browserId)) {
    return {
      success: false,
      message: `Browser with ID '${browserId}' already open.`,
    };
  }

  try {
    const driver = await chromeDriverManager.getDriver(browserId, headless, width, height, x, y, monitor);

    const session: BrowserSession = {
      browserId,
      sessionId: await driver.getSession().then((s: Session) => s.getId()),
      driver,
      isActive: true,
      createdAt: new Date(),
      lastUsed: new Date(),
      badge: badge || undefined, // Store badge text in session
    };

    session.sessionId = await driver.getSession().then((s: Session) => s.getId());
    browserSessions.set(browserId, session);

    // Set window size and position if specified (after driver is created)
    // Use setRect to set both size and position together
    try {
      const currentRect = await driver.manage().window().getRect();
      const finalX = x !== undefined ? x : (monitor ? getMonitorPosition(monitor).x : currentRect.x);
      const finalY = y !== undefined ? y : (monitor ? getMonitorPosition(monitor).y : currentRect.y);
      const finalWidth = width || currentRect.width;
      const finalHeight = height || currentRect.height;
      
      await driver.manage().window().setRect({
        x: finalX,
        y: finalY,
        width: finalWidth,
        height: finalHeight,
      });
    } catch (error) {
      logger.warn('Failed to set window size/position', { browserId, error: error instanceof Error ? error.message : String(error) });
    }

    // Console log capture is enabled via logging preferences in ChromeDriverManager
    // Selenium's logging API will automatically capture browser console logs

    // Set up network and performance monitoring before navigating
    try {
      await driver.executeScript(`
        // Initialize network logs array
        window.capturedNetworkLogs = [];
        
        // Capture fetch requests
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
          const startTime = performance.now();
          const url = args[0];
          const options = args[1] || {};
          
          return originalFetch.apply(this, args)
            .then(response => {
              const endTime = performance.now();
              window.capturedNetworkLogs.push({
                url: url.toString(),
                method: options.method || 'GET',
                status: response.status,
                statusText: response.statusText,
                responseTime: Math.round(endTime - startTime),
                timestamp: new Date().toISOString(),
                type: 'fetch',
                headers: Object.fromEntries(response.headers.entries())
              });
              return response;
            })
            .catch(error => {
              const endTime = performance.now();
              window.capturedNetworkLogs.push({
                url: url.toString(),
                method: options.method || 'GET',
                status: 0,
                statusText: 'Error',
                responseTime: Math.round(endTime - startTime),
                timestamp: new Date().toISOString(),
                type: 'fetch',
                error: error.message
              });
              throw error;
            });
        };
        
        // Capture XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
          this._method = method;
          this._url = url;
          this._startTime = performance.now();
          return originalXHROpen.apply(this, [method, url, ...args]);
        };
        
        XMLHttpRequest.prototype.send = function(...args) {
          const xhr = this;
          const originalOnLoad = xhr.onload;
          const originalOnError = xhr.onerror;
          
          xhr.onload = function() {
            const endTime = performance.now();
            window.capturedNetworkLogs.push({
              url: xhr._url,
              method: xhr._method,
              status: xhr.status,
              statusText: xhr.statusText,
              responseTime: Math.round(endTime - xhr._startTime),
              timestamp: new Date().toISOString(),
              type: 'xhr'
            });
            if (originalOnLoad) originalOnLoad.apply(this, arguments);
          };
          
          xhr.onerror = function() {
            const endTime = performance.now();
            window.capturedNetworkLogs.push({
              url: xhr._url,
              method: xhr._method,
              status: 0,
              statusText: 'Error',
              responseTime: Math.round(endTime - xhr._startTime),
              timestamp: new Date().toISOString(),
              type: 'xhr',
              error: 'Network error'
            });
            if (originalOnError) originalOnError.apply(this, arguments);
          };
          
          return originalXHRSend.apply(this, args);
        };
      `);
    } catch (error) {
      logger.warn('Failed to setup network monitoring', { browserId, error: error instanceof Error ? error.message : String(error) });
    }

    if (url) {
      await driver.get(url);
      
      // Re-inject network monitoring after navigation (in case page reloaded)
      try {
        await driver.executeScript(`
          if (!window.capturedNetworkLogs) {
            window.capturedNetworkLogs = [];
          }
        `);
      } catch (error) {
        // Ignore
      }
    }

    // Set badge if provided - this will be stored in session and persist across navigations
    if (badge) {
      session.badge = badge; // Store in session for persistence
      await setBadge({ sessionId: session.sessionId, badge });
    }

    logger.info('Browser opened', { browserId, sessionId: session.sessionId });
    return { success: true, data: { browserId, sessionId: session.sessionId } };
  } catch (error) {
    logger.error('Failed to open browser', { browserId, error: error instanceof Error ? error.message : String(error) });
    return { success: false, message: error instanceof Error ? error.message : String(error) };
  }
}
