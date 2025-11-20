import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';
import { getImagesDir, getProjectDir } from '../../utils/projectDir.js';
import * as fs from 'fs';
import * as path from 'path';

export async function takeScreenshotTool(
    args: any,
    session: BrowserSession | null,
    logger: Logger
) {
    const { filename, projectDir: providedProjectDir } = args;
    if (!session) return { success: false, message: 'Session not found' };
    try {
        const image = await session.driver.takeScreenshot();
        // Save to 'images' directory in the user's current project directory (where Cursor is running)
        // Uses centralized project directory detection
        const projectDir = getProjectDir(providedProjectDir);
        const imagesDir = getImagesDir(providedProjectDir);
        
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
        
        // Log with clear indication of where screenshot was saved
        logger.info('Screenshot saved to project directory', { 
            relativePath: relativePath, 
            fullPath: filePath,
            projectDir: projectDir,
            imagesDir: imagesDir,
            detectedFrom: providedProjectDir ? 'provided' : 
                          process.env.CURSOR_PROJECT_DIR ? 'CURSOR_PROJECT_DIR' :
                          process.env.CURSOR_WORKSPACE_ROOT ? 'CURSOR_WORKSPACE_ROOT' :
                          process.env.WORKSPACE_ROOT ? 'WORKSPACE_ROOT' :
                          process.env.PWD ? 'PWD' : 'process.cwd()'
        });
        
        return { success: true, data: { filePath: relativePath, fullPath: filePath } };
    } catch (error) {
        logger.error('Failed to take screenshot', { 
            error: error instanceof Error ? error.message : String(error),
            sessionId: session?.sessionId,
            browserId: session?.browserId,
            projectDir: process.cwd()
        });
        return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
}
