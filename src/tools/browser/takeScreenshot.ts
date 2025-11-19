import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';

export async function takeScreenshotTool(
    args: any,
    getSession: (sessionId: string) => Promise<BrowserSession | null>,
    logger: Logger
) {
    const { sessionId, filename, projectDir: providedProjectDir } = args;
    const session = await getSession(sessionId);
    if (!session) return { success: false, message: 'Session not found' };
    try {
        const image = await session.driver.takeScreenshot();
        // Save to 'images' directory in the user's current project directory (where Cursor is running)
        // Priority: 1. Provided projectDir, 2. Environment variables, 3. process.cwd()
        const projectDir = providedProjectDir ||
                          process.env.CURSOR_PROJECT_DIR || 
                          process.env.CURSOR_WORKSPACE_ROOT || 
                          process.env.WORKSPACE_ROOT ||
                          process.env.PWD ||
                          process.cwd();
        const imagesDir = path.join(projectDir, 'images');
        
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }
        
        // Generate filename with timestamp if not provided
        const finalFilename = filename 
            ? (filename.endsWith('.png') ? filename : `${filename}.png`)
            : `screenshot-${Date.now()}.png`;
        
        const filePath = path.join(imagesDir, finalFilename);
        await fs.promises.writeFile(filePath, image, 'base64');
        
        // Return relative path from project directory for easier access
        const relativePath = path.relative(projectDir, filePath);
        logger.info('Screenshot saved', { 
            filePath: relativePath, 
            fullPath: filePath,
            projectDir: projectDir,
            cwd: process.cwd(),
            envVars: {
                CURSOR_PROJECT_DIR: process.env.CURSOR_PROJECT_DIR,
                CURSOR_WORKSPACE_ROOT: process.env.CURSOR_WORKSPACE_ROOT,
                WORKSPACE_ROOT: process.env.WORKSPACE_ROOT,
                PWD: process.env.PWD
            }
        });
        
        return { success: true, data: { filePath: relativePath, fullPath: filePath } };
    } catch (error) {
        logger.error('Failed to take screenshot', { 
            error: error instanceof Error ? error.message : String(error),
            sessionId,
            projectDir: process.cwd()
        });
        return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
}
