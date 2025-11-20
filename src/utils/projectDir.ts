import * as path from 'path';

/**
 * Get the project directory where Cursor is running.
 * This is used to save logs and screenshots in the user's project directory.
 * 
 * Priority order:
 * 1. Provided projectDir parameter
 * 2. CURSOR_PROJECT_DIR environment variable
 * 3. CURSOR_WORKSPACE_ROOT environment variable
 * 4. WORKSPACE_ROOT environment variable
 * 5. PWD environment variable
 * 6. process.cwd() as fallback
 * 
 * IMPORTANT: This ensures screenshots and logs are saved in the user's project
 * directory, not in random locations. The images/ and logs/ folders will be
 * created in the detected project directory.
 */
export function getProjectDir(providedProjectDir?: string): string {
  if (providedProjectDir) {
    return path.resolve(providedProjectDir);
  }
  
  const detected = process.env.CURSOR_PROJECT_DIR || 
                   process.env.CURSOR_WORKSPACE_ROOT || 
                   process.env.WORKSPACE_ROOT ||
                   process.env.PWD ||
                   process.cwd();
  
  // Always resolve to absolute path to avoid issues
  return path.resolve(detected);
}

/**
 * Get the logs directory path in the project directory
 */
export function getLogsDir(providedProjectDir?: string): string {
  return path.join(getProjectDir(providedProjectDir), 'logs');
}

/**
 * Get the images directory path in the project directory
 */
export function getImagesDir(providedProjectDir?: string): string {
  return path.join(getProjectDir(providedProjectDir), 'images');
}

