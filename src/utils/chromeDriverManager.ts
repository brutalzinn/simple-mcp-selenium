import { Builder, WebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome.js';
import { ServiceBuilder } from 'selenium-webdriver/chrome.js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Logger } from './logger.js'; // Assuming Logger is also in utils

export class ChromeDriverManager {
    private logger: Logger;
    private chromedriverPath: string | null = null;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    async getChromeVersion(): Promise<string> {
        try {
            let output: string;
            const isWindows = process.platform === 'win32';

            if (isWindows) {
                // Windows: Try different Chrome installation paths
                const chromePaths = [
                    'reg query "HKEY_CURRENT_USER\\Software\\Google\\Chrome\\BLBeacon" /v version',
                    '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --version',
                    '"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" --version',
                    'chrome --version'
                ];

                for (const cmd of chromePaths) {
                    try {
                        if (cmd.startsWith('reg query')) {
                            // Registry query returns version directly
                            output = execSync(cmd, { encoding: 'utf8', shell: true } as any);
                            const match = output.match(/version\s+REG_SZ\s+(\d+\.\d+\.\d+\.\d+)/i);
                            if (match) {
                                return match[1];
                            }
                        } else {
                            output = execSync(cmd, { encoding: 'utf8', shell: true } as any);
                            const match = output.match(/(\d+\.\d+\.\d+\.\d+)/);
                            if (match) {
                                return match[1];
                            }
                        }
                    } catch (e) {
                        // Try next path
                        continue;
                    }
                }
                throw new Error('Could not find Chrome installation');
            } else {
                // Linux/Mac
                output = execSync('google-chrome --version', { encoding: 'utf8' });
                const match = output.match(/(\d+\.\d+\.\d+\.\d+)/);
                if (match) {
                    return match[1];
                }
                throw new Error('Could not parse Chrome version');
            }
        } catch (error) {
            this.logger.error('Failed to get Chrome version', { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }

    async getCompatibleChromeDriverPath(): Promise<string> {
        if (this.chromedriverPath) {
            return this.chromedriverPath;
        }

        try {
            const chromeVersion = await this.getChromeVersion();
            const majorVersion = chromeVersion.split('.')[0];

            this.logger.info('Detected Chrome version', { chromeVersion, majorVersion });

            // Check for downloaded ChromeDriver first
            const isWindows = process.platform === 'win32';
            const platformDir = isWindows
                ? (process.arch === 'x64' ? 'chromedriver-win64' : 'chromedriver-win32')
                : (process.arch === 'arm64' ? 'chromedriver-mac-arm64' : 'chromedriver-linux64');
            const executableName = isWindows ? 'chromedriver.exe' : 'chromedriver';
            const downloadedChromeDriver = path.join(process.cwd(), 'chromedriver', platformDir, executableName);
            if (fs.existsSync(downloadedChromeDriver)) {
                try {
                    const downloadedVersion = execSync(`"${downloadedChromeDriver}" --version`, { encoding: 'utf8' });
                    const downloadedMajorVersion = downloadedVersion.match(/ChromeDriver (\d+)/)?.[1];

                    if (downloadedMajorVersion && Math.abs(parseInt(downloadedMajorVersion) - parseInt(majorVersion)) <= 1) {
                        this.logger.info('Using downloaded ChromeDriver', { downloadedVersion: downloadedVersion.trim() });
                        this.chromedriverPath = downloadedChromeDriver;
                        return this.chromedriverPath;
                    } else {
                        this.logger.warn('Downloaded ChromeDriver version mismatch', {
                            chromeMajor: majorVersion,
                            driverMajor: downloadedMajorVersion || 'unknown',
                            difference: downloadedMajorVersion ? Math.abs(parseInt(downloadedMajorVersion) - parseInt(majorVersion)) : 'unknown'
                        });
                    }
                } catch (error) {
                    this.logger.warn('Downloaded ChromeDriver not working', { error: error instanceof Error ? error.message : String(error) });
                }
            }

            // Try to use system chromedriver
            try {
                const findCommand = isWindows ? 'where chromedriver' : 'which chromedriver';
                const execOptions = isWindows ? { encoding: 'utf8', shell: true } as any : { encoding: 'utf8' };
                const systemChromeDriver = execSync(findCommand, execOptions).trim().split('\n')[0];
                const systemVersion = execSync('chromedriver --version', execOptions);
                const systemMajorVersion = systemVersion.match(/ChromeDriver (\d+)/)?.[1];

                if (systemMajorVersion && Math.abs(parseInt(systemMajorVersion) - parseInt(majorVersion)) <= 1) {
                    this.logger.info('Using system ChromeDriver', { systemVersion: systemVersion.trim() });
                    this.chromedriverPath = systemChromeDriver;
                    return this.chromedriverPath;
                } else {
                    this.logger.warn('System ChromeDriver version mismatch', {
                        chromeMajor: majorVersion,
                        driverMajor: systemMajorVersion || 'unknown',
                        difference: systemMajorVersion ? Math.abs(parseInt(systemMajorVersion) - parseInt(majorVersion)) : 'unknown'
                    });
                }
            }
            catch (error) {
                this.logger.warn('System ChromeDriver not compatible', { error: error instanceof Error ? error.message : String(error) });
            }

            // Use selenium-webdriver's built-in ChromeDriver as last resort
            this.logger.info('Using selenium-webdriver built-in ChromeDriver');
            this.chromedriverPath = 'selenium-webdriver';
            return this.chromedriverPath;

        } catch (error) {
            this.logger.error('Failed to setup ChromeDriver', { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }

    async getDriver(browserId: string, headless: boolean, width?: number, height?: number, x?: number, y?: number, monitor?: string): Promise<WebDriver> {
        const chromeDriverPath = await this.getCompatibleChromeDriverPath();

        const chromeOptions = new chrome.Options();
        const windowWidth = width || 1920;
        const windowHeight = height || 1080;

        if (headless) {
            chromeOptions.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-web-security', '--remote-debugging-port=0', `--window-size=${windowWidth},${windowHeight}`, '--disable-extensions', '--disable-plugins', '--disable-images', '--disable-default-apps', '--disable-sync', '--disable-translate', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--enable-automation', '--password-store=basic', '--use-mock-keychain');
        } else {
            chromeOptions.addArguments('--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-web-security', '--remote-debugging-port=0', `--window-size=${windowWidth},${windowHeight}`);

            // Set window position if specified
            if (x !== undefined && y !== undefined) {
                chromeOptions.addArguments(`--window-position=${x},${y}`);
            } else if (monitor) {
                const monitorPos = this.getMonitorPosition(monitor);
                chromeOptions.addArguments(`--window-position=${monitorPos.x},${monitorPos.y}`);
            }
        }

        const loggingPrefs = {
            browser: 'ALL',
            driver: 'ALL',
            performance: 'ALL',
        };

        let driver: WebDriver;
        if (chromeDriverPath === 'selenium-webdriver') {
            driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).setLoggingPrefs(loggingPrefs as any).build();
        } else {
            const service = new ServiceBuilder(chromeDriverPath);
            driver = await new Builder().forBrowser('chrome').setChromeService(service).setChromeOptions(chromeOptions).setLoggingPrefs(loggingPrefs as any).build();
        }
        return driver;
    }

    private getMonitorPosition(monitor: string): { x: number; y: number } {
        switch (monitor) {
            case 'primary':
                return { x: 0, y: 0 };
            case 'secondary':
                return { x: 1920, y: 0 }; // Assuming 1920px width for primary monitor
            case 'auto':
            default:
                return { x: 0, y: 0 };
        }
    }
}
