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
            try {
                const logs = await session.driver.manage().logs().get('browser');
                consoleLogs = logs.slice(-logLimit).map((log: any) => ({
                    level: log.level?.name?.toLowerCase() || 'log',
                    message: log.message || '',
                    timestamp: new Date(log.timestamp).toISOString()
                }));
            } catch (error) {
                // Silently fail - console logs are optional
            }
        }

        if (includeElements) {
            elements = (await getInteractiveElements({ sessionId, elementLimit })).data?.elements || [];
        }

        return { success: true, message: 'Page debug info retrieved', data: { url, title, consoleLogs, elements } };
    } catch (error) {
        return { success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` };
    }
}

