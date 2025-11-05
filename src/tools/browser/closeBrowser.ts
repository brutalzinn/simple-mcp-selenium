import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function closeBrowserTool(
    args: any,
    getSession: (sessionId: string) => Promise<BrowserSession | null>,
    browserSessions: Map<string, BrowserSession>,
    logger: Logger
) {
    const { sessionId } = args;
    const session = await getSession(sessionId);
    if (!session) return { success: false, message: `Session '${sessionId}' not found` };
    try {
        await session.driver.quit();
        session.isActive = false;
        browserSessions.delete(session.browserId);
        logger.info('Browser session closed successfully', { sessionId, browserId: session.browserId });
        return { success: true, message: 'Browser closed' };
    } catch (error) {
        logger.error('Failed to close browser', { sessionId, error: error instanceof Error ? error.message : String(error) });
        return { success: false, message: `Failed to close browser: ${error instanceof Error ? error.message : String(error)}` };
    }
}
