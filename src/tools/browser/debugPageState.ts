import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function debugPageStateTool(
    args: any,
    getSession: (sessionId: string) => Promise<BrowserSession | null>,
    logger: Logger
) {
    const { sessionId } = args;
    const session = await getSession(sessionId);
    if (!session) return { success: false, message: `Session '${sessionId}' not found` };
    try {
        const url = await session.driver.getCurrentUrl();
        const title = await session.driver.getTitle();
        const pageSource = await session.driver.getPageSource();
        logger.info('Debug page state retrieved', { sessionId, url, title });
        return { success: true, message: 'Page state debug info', data: { url, title, pageSource: pageSource.substring(0, 500) + '...' } };
    } catch (error) {
        logger.error('Failed to debug page state', { sessionId, error: error instanceof Error ? error.message : String(error) });
        return { success: false, message: `Failed to get page debug info: ${error instanceof Error ? error.message : String(error)}` };
    }
}
