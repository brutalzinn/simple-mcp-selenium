import * as fs from 'fs';
import * as path from 'path';
import { getLogsDir } from './projectDir.js';

export class Logger {
    private logDir: string;
    private logFile: string;

    constructor() {
        // Use centralized project directory detection
        // This ensures logs are saved in the user's project directory where Cursor is running
        this.logDir = getLogsDir();
        this.logFile = path.join(this.logDir, `mcp-server-${new Date().toISOString().split('T')[0]}.log`);

        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    private formatMessage(level: string, message: string, data?: any): string {
        const timestamp = new Date().toISOString();
        const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
        return `[${timestamp}] [${level}] ${message}${dataStr}`;
    }

    private writeToFile(message: string) {
        try {
            fs.appendFileSync(this.logFile, message + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    info(message: string, data?: any) {
        const formatted = this.formatMessage('INFO', message, data);
        console.log(formatted);
        this.writeToFile(formatted);
    }

    error(message: string, data?: any) {
        const formatted = this.formatMessage('ERROR', message, data);
        console.error(formatted);
        this.writeToFile(formatted);
    }

    warn(message: string, data?: any) {
        const formatted = this.formatMessage('WARN', message, data);
        console.warn(formatted);
        this.writeToFile(formatted);
    }

    debug(message: string, data?: any) {
        const formatted = this.formatMessage('DEBUG', message, data);
        console.log(formatted);
        this.writeToFile(formatted);
    }
}
