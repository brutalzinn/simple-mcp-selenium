import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function executeScriptTool(
    args: any,
    getSession: (sessionId: string) => Promise<BrowserSession | null>,
    logger: Logger
) {
    const { sessionId, script, args: scriptArgs = [] } = args;
    const session = await getSession(sessionId);
    if (!session) return { success: false, message: `Session '${sessionId}' not found` };
    try {
        const result = await session.driver.executeScript(script, ...scriptArgs);
        return { success: true, message: 'Script executed', data: { result } };
    } catch (error) {
        return { success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` };
    }
}
