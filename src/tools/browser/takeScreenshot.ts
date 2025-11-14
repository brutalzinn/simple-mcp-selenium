import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';

export async function takeScreenshotTool(
    args: any,
    getSession: (sessionId: string) => Promise<BrowserSession | null>,
    logger: Logger
) {
    const { sessionId, filename } = args;
    const session = await getSession(sessionId);
    if (!session) return { success: false, message: `Session '${sessionId}' not found` };
    try {
        const image = await session.driver.takeScreenshot();
        let filePath = '';
        if (filename) {
            const saveDir = path.join(process.cwd(), 'screenshots');
            if (!fs.existsSync(saveDir)) {
                fs.mkdirSync(saveDir, { recursive: true });
            }
            filePath = path.join(saveDir, filename);
            await fs.promises.writeFile(filePath, image, 'base64');
        }
        return { success: true, message: 'Screenshot taken', data: { image: filename ? undefined : image, filePath } };
    } catch (error) {
        return { success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` };
    }
}
