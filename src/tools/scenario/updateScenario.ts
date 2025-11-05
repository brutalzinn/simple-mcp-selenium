import { Logger } from '../../utils/logger.js';
import * as path from 'path';
import * as fs from 'fs';

export async function updateScenarioTool(
    args: any,
    scenarios: Map<string, any>,
    scenarioStoragePath: string,
    logger: Logger
) {
    const { scenarioName, newName, description, steps, variables } = args;
    let scenario = scenarios.get(scenarioName) || Array.from(scenarios.values()).find(s => s.name === scenarioName);

    if (!scenario) {
        return { success: false, message: `Scenario '${scenarioName}' not found.` };
    }

    if (newName) scenario.name = newName;
    if (description) scenario.description = description;
    if (steps) {
        scenario.steps = steps;
        scenario.metadata.totalSteps = steps.length;
    }
    if (variables) scenario.variables = { ...scenario.variables, ...variables };

    scenario.metadata.lastModified = new Date().toISOString();

    try {
        const filePath = path.join(scenarioStoragePath, `${scenario.scenarioId}.json`);
        await fs.promises.writeFile(filePath, JSON.stringify(scenario, null, 2), 'utf-8');
        logger.info('Scenario saved:', { name: scenario.name, id: scenario.scenarioId, path: filePath });
    } catch (error) {
        logger.error('Error saving scenario:', { name: scenario.name, error: error instanceof Error ? error.message : String(error) });
        throw new Error(`Failed to save scenario ${scenario.name}: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
        success: true,
        message: `Scenario '${scenarioName}' updated successfully`,
        data: { scenarioId: scenario.scenarioId, updated: { steps: steps ? steps.length : 0, variables: variables ? Object.keys(variables) : [] } },
    };
}

