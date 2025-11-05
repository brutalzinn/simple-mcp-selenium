import { WebDriver, Session } from 'selenium-webdriver';
import { BrowserSession } from '../../common/types.js';
import { ChromeDriverManager } from '../../utils/chromeDriverManager.js';
import { Logger } from '../../utils/logger.js';

export async function openBrowserTool(
  args: any,
  browserSessions: Map<string, BrowserSession>,
  chromeDriverManager: ChromeDriverManager,
  logger: Logger,
  setBadge: (args: any) => Promise<any> // Pass setBadge as a dependency
) {
  const { browserId, headless = false, width = 1920, height = 1080, badge, url } = args;

  if (browserSessions.has(browserId)) {
    return {
      success: false,
      message: `Browser with ID '${browserId}' already open.`,
    };
  }

  try {
    const driver = await chromeDriverManager.getDriver(browserId, headless);

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
