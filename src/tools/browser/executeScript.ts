import { BrowserSession, ScenarioStep } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function executeScriptTool(
    args: any,
    getSession: (sessionId: string) => Promise<BrowserSession | null>,
    activeRecordings: Map<string, { sessionId: string; steps: ScenarioStep[]; startTime: Date; } | null>,
    logger: Logger
) {
    const { sessionId, script, args: scriptArgs = [] } = args;
    const session = await getSession(sessionId);
    if (!session) return { success: false, message: `Session '${sessionId}' not found` };
    try {
        if (activeRecordings.has(session.sessionId)) {
            const recording = activeRecordings.get(session.sessionId);
            recording?.steps.push({ action: 'execute_script', script, args: scriptArgs, timestamp: Date.now() });
        }
        const result = await session.driver.executeScript(script, ...scriptArgs);
        logger.info('Script executed', { sessionId, script: script ? script.substring(0, 100) + '...' : '[EMPTY SCRIPT]' });
        return { success: true, message: 'Script executed successfully', data: { result } };
    } catch (error) {
        logger.error('Failed to execute script', { sessionId, error: error instanceof Error ? error.message : String(error) });
        return { success: false, message: `Failed to execute script: ${error instanceof Error ? error.message : String(error)}` };
    }
}
