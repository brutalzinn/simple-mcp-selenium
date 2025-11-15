import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function navigateToTool(
    args: any,
    getSession: (sessionId: string) => Promise<BrowserSession | null>,
    logger: Logger,
    injectBadge?: (driver: any) => Promise<any>
) {
    const { sessionId, url } = args;
    const session = await getSession(sessionId);

    if (!session) return { success: false, message: 'Session not found' };

    try {
        await session.driver.get(url);
        
        // Re-inject badge after navigation if badge exists in session
        if (session.badge && injectBadge) {
            try {
                await session.driver.executeScript(`localStorage.setItem('mcp-debug-badge', '${session.badge}');`);
                await injectBadge(session.driver);
            } catch (error) {
                logger.warn('Badge re-inject failed', { sessionId });
            }
        }
        
        return { success: true, data: { url } };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
}
