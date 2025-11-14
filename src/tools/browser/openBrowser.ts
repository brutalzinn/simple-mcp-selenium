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
    };

    session.sessionId = await driver.getSession().then((s: Session) => s.getId());
    browserSessions.set(browserId, session);

    // Set window size and position if specified (after driver is created)
    if (width && height) {
      try {
        await driver.manage().window().setSize(width, height);
      } catch (error) {
        logger.warn('Failed to set window size', { browserId, error: error instanceof Error ? error.message : String(error) });
      }
    }

    if (x !== undefined && y !== undefined) {
      try {
        await driver.manage().window().setPosition(x, y);
      } catch (error) {
        logger.warn('Failed to set window position', { browserId, error: error instanceof Error ? error.message : String(error) });
      }
    } else if (monitor) {
      // Use monitor preset
      const monitorPos = getMonitorPosition(monitor);
      try {
        await driver.manage().window().setPosition(monitorPos.x, monitorPos.y);
      } catch (error) {
        logger.warn('Failed to set window position from monitor', { browserId, monitor, error: error instanceof Error ? error.message : String(error) });
      }
    }

    // Console log capture is enabled via logging preferences in ChromeDriverManager
    // Selenium's logging API will automatically capture browser console logs

    if (url) {
      await driver.get(url);
    }

    if (badge) {
      await setBadge({ sessionId: session.sessionId, badge });
    }

    logger.info('Browser opened successfully', { browserId, sessionId: session.sessionId, headless });
    return { success: true, message: 'Browser opened', data: { browserId, sessionId: session.sessionId } };
  } catch (error) {
    logger.error('Failed to open browser', { browserId, error: error instanceof Error ? error.message : String(error) });
    return { success: false, message: `Failed to open browser: ${error instanceof Error ? error.message : String(error)}` };
  }
}
