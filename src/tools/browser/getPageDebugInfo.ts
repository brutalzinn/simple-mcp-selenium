import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function getPageDebugInfoTool(
    args: any,
    getSession: (sessionId: string) => Promise<BrowserSession | null>,
    getInteractiveElements: (args: any) => Promise<any>,
    logger: Logger
) {
    try {
        const { sessionId, includeConsole = true, includeElements = true, elementLimit = 50, logLimit = 20 } = args;
        const session = await getSession(sessionId);
        if (!session) return { success: false, message: `Session '${sessionId}' not found` };

        const url = await session.driver.getCurrentUrl();
        const title = await session.driver.getTitle();
        let consoleLogs: any[] = [];
        let elements: any[] = [];

        if (includeConsole) {
            // This part needs Chrome DevTools Protocol or similar for real console logs
            consoleLogs.push({ level: 'warn', message: 'Console logs capture not fully implemented via Selenium WebDriver. Requires Chrome DevTools Protocol.' });
        }

        if (includeElements) {
            elements = (await getInteractiveElements({ sessionId, elementLimit })).data?.elements || [];
        }

        return { success: true, message: 'Page debug info retrieved', data: { url, title, consoleLogs, elements } };
    } catch (error) {
        logger.error('Failed to get page debug info', { sessionId: args.sessionId, error: error instanceof Error ? error.message : String(error) });
        return { success: false, message: `Failed to get page debug info: ${error instanceof Error ? error.message : String(error)}` };
    }
}

