import { Logger } from '../../utils/logger.js';
import * as path from 'path';
import * as fs from 'fs';

export async function stopRecordingScenarioTool(
    args: any,
    scenarios: Map<string, any>,
    activeRecordings: Map<string, { sessionId: string; steps: any[]; startTime: Date; } | null>,
    scenarioStoragePath: string,
    logger: Logger
) {
    const { scenarioName, saveScenario = true } = args;
    const scenarioEntry = Array.from(scenarios.entries()).find(([, s]) => s.name === scenarioName);

    if (!scenarioEntry) {
        return { success: false, message: `Scenario '${scenarioName}' not found.` };
    }

    const [scenarioId, scenario] = scenarioEntry;
    const activeRecording = activeRecordings.get(scenario.sessionId);

    if (!activeRecording) {
        return { success: false, message: `No active recording found for scenario '${scenarioName}'.` };
    }

    scenario.steps = activeRecording.steps;
    scenario.metadata.totalSteps = activeRecording.steps.length;
    scenario.metadata.duration = (new Date().getTime() - activeRecording.startTime.getTime()) / 1000;
    scenario.metadata.lastModified = new Date().toISOString();

    if (saveScenario) {
        try {
            const filePath = path.join(scenarioStoragePath, `${scenarioId}.json`);
            await fs.promises.writeFile(filePath, JSON.stringify(scenario, null, 2), 'utf-8');
            logger.info('Scenario saved:', { name: scenario.name, id: scenario.scenarioId, path: filePath });
        } catch (error) {
            logger.error('Error saving scenario:', { name: scenario.name, error: error instanceof Error ? error.message : String(error) });
            throw new Error(`Failed to save scenario ${scenario.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    activeRecordings.delete(activeRecording.sessionId);
    logger.info('Scenario recording stopped', { scenarioName, scenarioId, totalSteps: scenario.metadata.totalSteps });
    return { success: true, message: `Recording stopped for scenario '${scenarioName}'`, data: { scenarioId, scenarioName, totalSteps: scenario.metadata.totalSteps, duration: scenario.metadata.duration } };
}

