import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function recordScenarioTool(
    args: any,
    getSession: (sessionId: string) => Promise<BrowserSession | null>,
    activeRecordings: Map<string, { sessionId: string; steps: any[]; startTime: Date; } | null>,
    scenarios: Map<string, any>,
    logger: Logger
) {
    const { sessionId, scenarioName, description } = args;
    const session = await getSession(sessionId);
    if (!session) return { success: false, message: `Session '${sessionId}' not found` };

    if (activeRecordings.has(sessionId)) {
        return { success: false, message: `Recording already in progress for session '${sessionId}'` };
    }

    const scenarioId = `scenario-${Date.now()}`;
    activeRecordings.set(sessionId, {
        sessionId,
        steps: [],
        startTime: new Date(),
    });

    const newScenario = {
        scenarioId,
        name: scenarioName,
        sessionId: sessionId,
        description,
        steps: [],
        metadata: {
            totalSteps: 0,
            duration: 0,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            variablesUsed: [],
        },
    };
    scenarios.set(scenarioId, newScenario);

    logger.info('Scenario recording started', { sessionId, scenarioName, scenarioId });
    return { success: true, message: `Recording started for scenario '${scenarioName}'`, data: { scenarioId, scenarioName } };
}

