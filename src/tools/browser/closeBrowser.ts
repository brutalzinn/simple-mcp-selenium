import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function closeBrowserTool(
    args: any,
    getSession: (sessionId: string) => Promise<BrowserSession | null>,
    browserSessions: Map<string, BrowserSession>,
    logger: Logger,
    getSessionByBrowserId?: (browserId: string) => BrowserSession | null
) {
    const { sessionId, browserId } = args;

    let session: BrowserSession | null = null;

    // Try to get session by browserId first (more direct)
    if (browserId) {
        if (getSessionByBrowserId) {
            session = getSessionByBrowserId(browserId);
        } else {
            session = browserSessions.get(browserId) || null;
        }
    }

    // Fallback to sessionId
    if (!session && sessionId) {
        session = await getSession(sessionId);
    }

    if (!session) return { success: false, message: 'Browser not found' };

    try {
        await session.driver.quit();
        session.isActive = false;
        browserSessions.delete(session.browserId);
        return { success: true };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
}
