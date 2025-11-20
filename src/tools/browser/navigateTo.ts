import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function navigateToTool(
    args: any,
    session: BrowserSession | null,
    logger: Logger,
    injectBadge?: (driver: any) => Promise<any>
) {
    const { url } = args;

    if (!session) return { success: false, message: 'Session not found' };

    try {
        await session.driver.get(url);
        
        // Re-inject badge after navigation if badge exists in session
        if (session.badge && injectBadge) {
            try {
                await session.driver.executeScript(`localStorage.setItem('mcp-debug-badge', '${session.badge}');`);
                await injectBadge(session.driver);
            } catch (error) {
                logger.warn('Badge re-inject failed', { sessionId: session.sessionId, browserId: session.browserId });
            }
        }
        
        return { success: true, data: { url } };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
}
