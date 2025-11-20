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
    // Dev tools (console capture, network monitoring, element tracking) should be enabled explicitly via enable_dev_tools action

    if (url) {
      await driver.get(url);
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
