import { BrowserSession, ScenarioStep } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function navigateToTool(
    args: any,
    getSession: (sessionId: string) => Promise<BrowserSession | null>,
    activeRecordings: Map<string, { sessionId: string; steps: ScenarioStep[]; startTime: Date; } | null>,
    logger: Logger
) {
    const { sessionId, url } = args;
    const session = await getSession(sessionId);

    if (!session) return { success: false, message: `Session '${sessionId}' not found` };

    try {
        if (activeRecordings.has(session.sessionId)) {
            const recording = activeRecordings.get(session.sessionId);
            recording?.steps.push({ action: 'navigate', url, timestamp: Date.now() });
        }
        await session.driver.get(url);
        logger.info('Navigated to URL', { sessionId, url });
        return { success: true, message: 'Navigated successfully', data: { url } };
    } catch (error) {
        logger.error('Failed to navigate', { sessionId, url, error: error instanceof Error ? error.message : String(error) });
        return { success: false, message: `Failed to navigate: ${error instanceof Error ? error.message : String(error)}` };
    }
}
