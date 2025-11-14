import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function navigateToTool(
    args: any,
    getSession: (sessionId: string) => Promise<BrowserSession | null>,
    logger: Logger
) {
    const { sessionId, url } = args;
    const session = await getSession(sessionId);

    if (!session) return { success: false, message: `Session '${sessionId}' not found` };

    try {
        await session.driver.get(url);
        return { success: true, message: 'Navigated', data: { url } };
    } catch (error) {
        return { success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` };
    }
}
