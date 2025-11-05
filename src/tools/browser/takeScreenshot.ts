import { BrowserSession, ScenarioStep } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';

export async function takeScreenshotTool(
    args: any,
    getSession: (sessionId: string) => Promise<BrowserSession | null>,
    activeRecordings: Map<string, { sessionId: string; steps: ScenarioStep[]; startTime: Date; } | null>,
    logger: Logger,
    scenarioStoragePath: string
) {
    const { sessionId, filename } = args;
    const session = await getSession(sessionId);
    if (!session) return { success: false, message: `Session '${sessionId}' not found` };
    try {
        const image = await session.driver.takeScreenshot();
        let filePath = '';
        if (filename) {
            const saveDir = scenarioStoragePath;
            if (!fs.existsSync(saveDir)) {
                fs.mkdirSync(saveDir, { recursive: true });
            }
            filePath = path.join(saveDir, filename);
            await fs.promises.writeFile(filePath, image, 'base64');
            logger.info('Screenshot saved', { sessionId, filePath });
        }

        if (activeRecordings.has(session.sessionId)) {
            const recording = activeRecordings.get(session.sessionId);
            recording?.steps.push({ action: 'screenshot', timestamp: Date.now(), filename: filePath });
        }
        return { success: true, message: 'Screenshot taken', data: { image: filename ? undefined : image, filePath } };
    } catch (error) {
        logger.error('Failed to take screenshot', { sessionId, filename, error: error instanceof Error ? error.message : String(error) });
        return { success: false, message: `Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}` };
    }
}
