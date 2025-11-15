import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function getPageDebugInfoTool(
    args: any,
    getSession: (sessionId: string) => Promise<BrowserSession | null>,
    getInteractiveElements: (args: any) => Promise<any>,
    logger: Logger
) {
    try {
        const { 
            sessionId, 
            includeConsole = true, 
            includeElements = true, 
            includeNetwork = true,
            includePerformance = true,
            elementLimit = 50, 
            logLimit = 20,
            networkLimit = 50
        } = args;
        const session = await getSession(sessionId);
        if (!session) return { success: false, message: `Session '${sessionId}' not found` };

        const url = await session.driver.getCurrentUrl();
        const title = await session.driver.getTitle();
        let consoleLogs: any[] = [];
        let networkLogs: any[] = [];
        let performanceMetrics: any = null;
        let elements: any[] = [];

        // Capture console logs from Selenium logging API
        if (includeConsole) {
            try {
                const logs = await session.driver.manage().logs().get('browser');
                consoleLogs = logs.slice(-logLimit).map((log: any) => {
                    const message = log.message || '';
                    // Parse console log format: "console-api 2:32 \"message\""
                    const consoleMatch = message.match(/console-api\s+(\d+):(\d+)\s+"(.+?)"/);
                    const networkMatch = message.match(/(.+?)\s+-\s+Failed to load resource/);
                    const errorMatch = message.match(/SEVERE\s+-\s+(.+)/);
                    
                    return {
                        level: log.level?.name?.toLowerCase() || 'log',
                        message: consoleMatch ? consoleMatch[3] : (networkMatch ? networkMatch[0] : (errorMatch ? errorMatch[1] : message)),
                        timestamp: new Date(log.timestamp).toISOString(),
                        source: consoleMatch ? `line ${consoleMatch[1]}:${consoleMatch[2]}` : undefined,
                        raw: message
                    };
                });
            } catch (error) {
                logger.warn('Failed to get console logs', { error: error instanceof Error ? error.message : String(error) });
            }
        }

        // Capture network logs using JavaScript injection
        if (includeNetwork) {
            try {
                const networkData = await session.driver.executeScript(`
                    // Initialize network logs array if not exists
                    if (!window.capturedNetworkLogs) {
                        window.capturedNetworkLogs = [];
                        
                        // Capture fetch requests
                        const originalFetch = window.fetch;
                        window.fetch = function(...args) {
                            const startTime = performance.now();
                            const url = args[0];
                            const options = args[1] || {};
                            
                            return originalFetch.apply(this, args)
                                .then(response => {
                                    const endTime = performance.now();
                                    window.capturedNetworkLogs.push({
                                        url: url.toString(),
                                        method: options.method || 'GET',
                                        status: response.status,
                                        statusText: response.statusText,
                                        responseTime: Math.round(endTime - startTime),
                                        timestamp: new Date().toISOString(),
                                        type: 'fetch',
                                        headers: Object.fromEntries(response.headers.entries())
                                    });
                                    return response;
                                })
                                .catch(error => {
                                    const endTime = performance.now();
                                    window.capturedNetworkLogs.push({
                                        url: url.toString(),
                                        method: options.method || 'GET',
                                        status: 0,
                                        statusText: 'Error',
                                        responseTime: Math.round(endTime - startTime),
                                        timestamp: new Date().toISOString(),
                                        type: 'fetch',
                                        error: error.message
                                    });
                                    throw error;
                                });
                        };
                        
                        // Capture XMLHttpRequest
                        const originalXHROpen = XMLHttpRequest.prototype.open;
                        const originalXHRSend = XMLHttpRequest.prototype.send;
                        
                        XMLHttpRequest.prototype.open = function(method, url, ...args) {
                            this._method = method;
                            this._url = url;
                            this._startTime = performance.now();
                            return originalXHROpen.apply(this, [method, url, ...args]);
                        };
                        
                        XMLHttpRequest.prototype.send = function(...args) {
                            const xhr = this;
                            const originalOnLoad = xhr.onload;
                            const originalOnError = xhr.onerror;
                            
                            xhr.onload = function() {
                                const endTime = performance.now();
                                window.capturedNetworkLogs.push({
                                    url: xhr._url,
                                    method: xhr._method,
                                    status: xhr.status,
                                    statusText: xhr.statusText,
                                    responseTime: Math.round(endTime - xhr._startTime),
                                    timestamp: new Date().toISOString(),
                                    type: 'xhr'
                                });
                                if (originalOnLoad) originalOnLoad.apply(this, arguments);
                            };
                            
                            xhr.onerror = function() {
                                const endTime = performance.now();
                                window.capturedNetworkLogs.push({
                                    url: xhr._url,
                                    method: xhr._method,
                                    status: 0,
                                    statusText: 'Error',
                                    responseTime: Math.round(endTime - xhr._startTime),
                                    timestamp: new Date().toISOString(),
                                    type: 'xhr',
                                    error: 'Network error'
                                });
                                if (originalOnError) originalOnError.apply(this, arguments);
                            };
                            
                            return originalXHRSend.apply(this, args);
                        };
                    }
                    
                    // Return captured network logs
                    return (window.capturedNetworkLogs || []).slice(-${networkLimit});
                `);
                networkLogs = (networkData as any[]) || [];
            } catch (error) {
                logger.warn('Failed to get network logs', { error: error instanceof Error ? error.message : String(error) });
            }
        }

        // Capture performance metrics
        if (includePerformance) {
            try {
                const perfData = await session.driver.executeScript(`
                    const navigation = performance.getEntriesByType('navigation')[0];
                    const paintEntries = performance.getEntriesByType('paint');
                    const resourceEntries = performance.getEntriesByType('resource');
                    
                    return {
                        loadTime: navigation ? Math.round(navigation.loadEventEnd - navigation.fetchStart) : null,
                        domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart) : null,
                        firstPaint: paintEntries.find(e => e.name === 'first-paint') ? Math.round(paintEntries.find(e => e.name === 'first-paint').startTime) : null,
                        firstContentfulPaint: paintEntries.find(e => e.name === 'first-contentful-paint') ? Math.round(paintEntries.find(e => e.name === 'first-contentful-paint').startTime) : null,
                        networkRequests: resourceEntries.length,
                        totalTransferSize: resourceEntries.reduce((total, entry) => total + (entry.transferSize || 0), 0),
                        resources: resourceEntries.slice(0, 20).map(entry => ({
                            name: entry.name,
                            type: entry.initiatorType,
                            duration: Math.round(entry.duration),
                            size: entry.transferSize || 0,
                            startTime: Math.round(entry.startTime)
                        }))
                    };
                `);
                performanceMetrics = perfData;
            } catch (error) {
                logger.warn('Failed to get performance metrics', { error: error instanceof Error ? error.message : String(error) });
            }
        }

        // Get performance logs from Selenium
        let performanceLogs: any[] = [];
        if (includePerformance) {
            try {
                const perfLogs = await session.driver.manage().logs().get('performance');
                performanceLogs = perfLogs.slice(-logLimit).map((log: any) => ({
                    message: log.message,
                    timestamp: new Date(log.timestamp).toISOString()
                }));
            } catch (error) {
                // Performance logs may not be available
            }
        }

        if (includeElements) {
            elements = (await getInteractiveElements({ sessionId, elementLimit })).data?.elements || [];
        }

        // Compact format - only essential data
        return { 
            success: true, 
            data: { 
                url, 
                title, 
                console: consoleLogs.slice(-10), // Last 10 only
                network: networkLogs.slice(-20), // Last 20 only
                perf: performanceMetrics ? {
                    load: performanceMetrics.loadTime,
                    domReady: performanceMetrics.domContentLoaded,
                    fcp: performanceMetrics.firstContentfulPaint,
                    requests: performanceMetrics.networkRequests
                } : null,
                elements: elements.length
            } 
        };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
}

