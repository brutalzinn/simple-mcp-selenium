import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function executeScriptTool(
    args: any,
    getSession: (sessionId: string) => Promise<BrowserSession | null>,
    logger: Logger
) {
    const { sessionId, script, args: scriptArgs = [] } = args;
    
    if (!script || typeof script !== 'string' || script.trim().length === 0) {
        return { success: false, message: 'Script required' };
    }
    
    const session = await getSession(sessionId);
    if (!session) return { success: false, message: 'Session not found' };
    
    try {
        const result = await session.driver.executeScript(script, ...scriptArgs);
        return { success: true, data: { result } };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('Script failed', { sessionId, error: msg });
        return { success: false, message: msg };
    }
}
