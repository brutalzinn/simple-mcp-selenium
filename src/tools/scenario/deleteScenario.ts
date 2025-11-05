import { Logger } from '../../utils/logger.js';
import * as path from 'path';
import * as fs from 'fs';

export async function deleteScenarioTool(
    args: any,
    scenarios: Map<string, any>,
    scenarioStoragePath: string,
    logger: Logger
) {
    const { scenarioName, confirm = false } = args;
    const scenarioEntry = Array.from(scenarios.entries()).find(([, s]) => s.name === scenarioName);

    if (!scenarioEntry) {
        return { success: false, message: `Scenario '${scenarioName}' not found.` };
    }
    const [scenarioId, scenario] = scenarioEntry;

    if (!confirm) {
        return { success: false, message: `Confirmation required to delete scenario '${scenarioName}'. Set 'confirm: true' in arguments.` };
    }

    try {
        const filePath = path.join(scenarioStoragePath, `${scenarioId}.json`);
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
        scenarios.delete(scenarioId);
        logger.info('Scenario deleted', { scenarioName, scenarioId });
        return { success: true, message: `Scenario '${scenarioName}' deleted successfully` };
    } catch (error) {
        logger.error('Error deleting scenario:', { scenarioName, error: error instanceof Error ? error.message : String(error) });
        return { success: false, message: `Failed to delete scenario '${scenarioName}': ${error instanceof Error ? error.message : String(error)}` };
    }
}

