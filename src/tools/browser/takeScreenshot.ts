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
    if (!session) return { success: false, message: 'Session not found' };
    try {
        const image = await session.driver.takeScreenshot();
        const screenshotsDir = path.join(process.cwd(), 'screenshots');
        if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
        
        const filePath = filename 
            ? path.join(screenshotsDir, filename)
            : path.join(screenshotsDir, `screenshot-${Date.now()}.png`);
        await fs.promises.writeFile(filePath, image, 'base64');
        
        return { success: true, data: { filePath: path.relative(process.cwd(), filePath) } };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
}
