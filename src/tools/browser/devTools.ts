import { BrowserSession } from '../../common/types.js';
import { Logger } from '../../utils/logger.js';

export async function devToolsTool(
    args: any,
    session: BrowserSession | null,
    logger: Logger
) {
    const {
        action = 'get_console_logs',
        clear = false,
        limit = 50,
        selector = null,
        key = null
    } = args;

    if (!session) return { success: false, message: 'Session not found' };

    try {
        const driver = session.driver;

        switch (action) {
            case 'get_console_logs': {
                // Get console logs using JavaScript
                const jsLogs = await driver.executeScript(`
                    // Return captured console logs if available
                    if (window.capturedConsoleLogs) {
                        return window.capturedConsoleLogs.slice(-${limit});
                    }
                    return [];
                `) as any[];

                // Also try to get logs from Selenium's logging API
                let seleniumLogs: any[] = [];
                try {
                    const logEntries = await driver.manage().logs().get('browser');
                    seleniumLogs = logEntries.slice(-limit).map((entry: any) => ({
                        level: entry.level.name,
                        message: entry.message,
                        timestamp: new Date(entry.timestamp).toISOString()
                    }));
                } catch (e) {
                    // Logging API may not be available
                }

                const logs = Array.isArray(jsLogs) ? jsLogs : [];

                // Clear logs if requested
                if (clear) {
                    await driver.executeScript(`
                        if (window.capturedConsoleLogs) {
                            window.capturedConsoleLogs = [];
                        }
                    `);
                }

                return {
                    success: true,
                    data: {
                        logs: logs.length > 0 ? logs : seleniumLogs,
                        count: logs.length + seleniumLogs.length,
                        source: logs.length > 0 ? 'javascript' : 'selenium'
                    }
                };
            }

            case 'get_network_requests': {
                // Enhanced network requests with full details
                const requests = await driver.executeScript(`
                    if (window.capturedNetworkLogs) {
                        return window.capturedNetworkLogs.slice(-${limit});
                    }
                    // Also capture from Performance API
                    const resourceEntries = performance.getEntriesByType('resource');
                    return resourceEntries.slice(-${limit}).map(entry => ({
                        url: entry.name,
                        type: entry.initiatorType,
                        duration: Math.round(entry.duration),
                        size: entry.transferSize || 0,
                        decodedSize: entry.decodedBodySize || 0,
                        startTime: Math.round(entry.startTime),
                        responseEnd: Math.round(entry.responseEnd || 0),
                        timestamp: new Date().toISOString()
                    }));
                `) as any[];

                const requestsArray = Array.isArray(requests) ? requests : [];

                // Clear if requested
                if (clear) {
                    await driver.executeScript(`
                        if (window.capturedNetworkLogs) {
                            window.capturedNetworkLogs = [];
                        }
                    `);
                }

                return {
                    success: true,
                    data: {
                        requests: requestsArray,
                        count: requestsArray.length
                    }
                };
            }

            case 'get_performance_metrics': {
                // Comprehensive performance metrics
                const metrics = await driver.executeScript(`
                    const navigation = performance.getEntriesByType('navigation')[0];
                    const paintEntries = performance.getEntriesByType('paint');
                    const resourceEntries = performance.getEntriesByType('resource');
                    const measureEntries = performance.getEntriesByType('measure');
                    const markEntries = performance.getEntriesByType('mark');
                    
                    const timing = navigation ? {
                        dns: Math.round(navigation.domainLookupEnd - navigation.domainLookupStart),
                        tcp: Math.round(navigation.connectEnd - navigation.connectStart),
                        ssl: navigation.secureConnectionStart > 0 
                            ? Math.round(navigation.connectEnd - navigation.secureConnectionStart) 
                            : 0,
                        ttfb: Math.round(navigation.responseStart - navigation.requestStart),
                        download: Math.round(navigation.responseEnd - navigation.responseStart),
                        domProcessing: Math.round(navigation.domComplete - navigation.domInteractive),
                        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
                        loadComplete: Math.round(navigation.loadEventEnd - navigation.fetchStart),
                        total: Math.round(navigation.loadEventEnd - navigation.fetchStart)
                    } : null;
                    
                    return {
                        timing: timing,
                        paint: {
                            firstPaint: paintEntries.find(e => e.name === 'first-paint') 
                                ? Math.round(paintEntries.find(e => e.name === 'first-paint').startTime) 
                                : null,
                            firstContentfulPaint: paintEntries.find(e => e.name === 'first-contentful-paint') 
                                ? Math.round(paintEntries.find(e => e.name === 'first-contentful-paint').startTime) 
                                : null,
                            largestContentfulPaint: performance.getEntriesByType('largest-contentful-paint')[0]
                                ? Math.round(performance.getEntriesByType('largest-contentful-paint')[0].renderTime || performance.getEntriesByType('largest-contentful-paint')[0].loadTime)
                                : null
                        },
                        resources: {
                            count: resourceEntries.length,
                            totalSize: resourceEntries.reduce((sum, e) => sum + (e.transferSize || 0), 0),
                            totalTime: resourceEntries.reduce((sum, e) => sum + e.duration, 0),
                            byType: resourceEntries.reduce((acc, e) => {
                                const type = e.initiatorType || 'other';
                                acc[type] = (acc[type] || 0) + 1;
                                return acc;
                            }, {})
                        },
                        memory: performance.memory ? {
                            usedJSHeapSize: performance.memory.usedJSHeapSize,
                            totalJSHeapSize: performance.memory.totalJSHeapSize,
                            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                            usedMB: Math.round(performance.memory.usedJSHeapSize / 1048576),
                            totalMB: Math.round(performance.memory.totalJSHeapSize / 1048576),
                            limitMB: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
                        } : null,
                        measures: measureEntries.length,
                        marks: markEntries.length
                    };
                `);

                return {
                    success: true,
                    data: metrics
                };
            }

            case 'get_storage': {
                // Get all storage types: localStorage, sessionStorage, cookies, IndexedDB
                const storage = await driver.executeScript(`
                    const result = {
                        localStorage: {},
                        sessionStorage: {},
                        cookies: document.cookie ? document.cookie.split(';').reduce((acc, cookie) => {
                            const [key, value] = cookie.trim().split('=');
                            if (key) acc[key] = value || '';
                            return acc;
                        }, {}) : {},
                        indexedDB: null
                    };
                    
                    // Get localStorage
                    try {
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key) result.localStorage[key] = localStorage.getItem(key);
                        }
                    } catch (e) {
                        result.localStorage = { error: e.message };
                    }
                    
                    // Get sessionStorage
                    try {
                        for (let i = 0; i < sessionStorage.length; i++) {
                            const key = sessionStorage.key(i);
                            if (key) result.sessionStorage[key] = sessionStorage.getItem(key);
                        }
                    } catch (e) {
                        result.sessionStorage = { error: e.message };
                    }
                    
                    // Get IndexedDB databases
                    try {
                        if (window.indexedDB && window.indexedDB.databases) {
                            const databases = await window.indexedDB.databases();
                            result.indexedDB = databases.map(db => ({
                                name: db.name,
                                version: db.version
                            }));
                        }
                    } catch (e) {
                        result.indexedDB = { error: 'Not available' };
                    }
                    
                    return result;
                `);

                return {
                    success: true,
                    data: storage
                };
            }

            case 'get_cookies': {
                // Get detailed cookie information
                const cookies = await driver.manage().getCookies();
                const cookieData = cookies.map(cookie => ({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path,
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly,
                    expiry: cookie.expiry ? new Date((cookie.expiry as number) * 1000).toISOString() : null
                }));

                return {
                    success: true,
                    data: {
                        cookies: cookieData,
                        count: cookieData.length
                    }
                };
            }

            case 'get_accessibility': {
                // Get accessibility tree
                const accessibility = await driver.executeScript(`
                    function getAccessibilityTree(node, depth = 0, maxDepth = 5) {
                        if (depth > maxDepth || !node) return null;
                        
                        const role = node.getAttribute('role') || node.tagName.toLowerCase();
                        const name = node.getAttribute('aria-label') || 
                                     node.getAttribute('aria-labelledby') ||
                                     node.textContent?.trim().slice(0, 100) || '';
                        const state = {
                            disabled: node.hasAttribute('disabled') || node.getAttribute('aria-disabled') === 'true',
                            hidden: node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true',
                            required: node.hasAttribute('required') || node.getAttribute('aria-required') === 'true',
                            checked: node.hasAttribute('checked') || node.getAttribute('aria-checked') === 'true',
                            expanded: node.getAttribute('aria-expanded') === 'true'
                        };
                        
                        const children = Array.from(node.children || [])
                            .map(child => getAccessibilityTree(child, depth + 1, maxDepth))
                            .filter(c => c !== null)
                            .slice(0, 20); // Limit children
                        
                        return {
                            role: role,
                            name: name,
                            state: state,
                            attributes: {
                                id: node.id || null,
                                class: node.className || null,
                                'aria-label': node.getAttribute('aria-label') || null,
                                'aria-labelledby': node.getAttribute('aria-labelledby') || null,
                                'aria-describedby': node.getAttribute('aria-describedby') || null
                            },
                            children: children
                        };
                    }
                    
                    return getAccessibilityTree(document.body || document.documentElement);
                `);

                return {
                    success: true,
                    data: accessibility
                };
            }

            case 'get_security': {
                // Get security information
                const security = await driver.executeScript(`
                    return {
                        protocol: window.location.protocol,
                        host: window.location.host,
                        origin: window.location.origin,
                        isSecure: window.location.protocol === 'https:',
                        isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
                        referrer: document.referrer || null,
                        userAgent: navigator.userAgent,
                        platform: navigator.platform,
                        language: navigator.language,
                        languages: navigator.languages || [],
                        cookieEnabled: navigator.cookieEnabled,
                        onLine: navigator.onLine,
                        hardwareConcurrency: navigator.hardwareConcurrency || null,
                        deviceMemory: navigator.deviceMemory || null,
                        connection: navigator.connection ? {
                            effectiveType: navigator.connection.effectiveType,
                            downlink: navigator.connection.downlink,
                            rtt: navigator.connection.rtt,
                            saveData: navigator.connection.saveData
                        } : null
                    };
                `);

                // Get page security state
                const url = await driver.getCurrentUrl();
                const isSecure = url.startsWith('https://');

                return {
                    success: true,
                    data: {
                        ...(security as any),
                        url: url,
                        isSecure: isSecure
                    }
                };
            }

            case 'get_manifest': {
                // Get web app manifest
                const manifest = await driver.executeScript(`
                    const manifestLink = document.querySelector('link[rel="manifest"]');
                    if (manifestLink) {
                        const href = manifestLink.getAttribute('href');
                        return { manifestUrl: href, found: true };
                    }
                    return { found: false };
                `);

                // Try to fetch manifest if found
                const manifestData = manifest as any;
                if (manifestData.found && manifestData.manifestUrl) {
                    try {
                        const manifestContent = await driver.executeScript(`
                            const manifestLink = document.querySelector('link[rel="manifest"]');
                            if (manifestLink) {
                                const href = manifestLink.getAttribute('href');
                                return fetch(href).then(r => r.json()).catch(() => null);
                            }
                            return null;
                        `);
                        manifestData.content = manifestContent;
                    } catch (e) {
                        manifestData.error = 'Could not fetch manifest';
                    }
                }

                return {
                    success: true,
                    data: manifestData
                };
            }

            case 'get_service_workers': {
                // Get service worker information
                const serviceWorkers = await driver.executeScript(`
                    if ('serviceWorker' in navigator) {
                        return navigator.serviceWorker.getRegistrations().then(registrations => {
                            return registrations.map(reg => ({
                                scope: reg.scope,
                                active: reg.active ? {
                                    scriptURL: reg.active.scriptURL,
                                    state: reg.active.state
                                } : null,
                                installing: reg.installing ? {
                                    scriptURL: reg.installing.scriptURL,
                                    state: reg.installing.state
                                } : null,
                                waiting: reg.waiting ? {
                                    scriptURL: reg.waiting.scriptURL,
                                    state: reg.waiting.state
                                } : null
                            }));
                        }).catch(() => []);
                    }
                    return [];
                `);

                return {
                    success: true,
                    data: {
                        serviceWorkers: Array.isArray(serviceWorkers) ? serviceWorkers : [],
                        available: 'serviceWorker' in (await driver.executeScript('return navigator;') as any)
                    }
                };
            }

            case 'get_memory': {
                // Detailed memory profiling
                const memory = await driver.executeScript(`
                    if (performance.memory) {
                        return {
                            usedJSHeapSize: performance.memory.usedJSHeapSize,
                            totalJSHeapSize: performance.memory.totalJSHeapSize,
                            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                            usedMB: Math.round(performance.memory.usedJSHeapSize / 1048576),
                            totalMB: Math.round(performance.memory.totalJSHeapSize / 1048576),
                            limitMB: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
                            usagePercent: Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100)
                        };
                    }
                    return { available: false };
                `);

                return {
                    success: true,
                    data: memory
                };
            }

            case 'get_layout': {
                // Get layout information for an element or page
                const layout = await driver.executeScript(`
                    const selector = arguments[0] || 'body';
                    const element = document.querySelector(selector) || document.body;
                    
                    if (!element) {
                        return { error: 'Element not found' };
                    }
                    
                    const rect = element.getBoundingClientRect();
                    const style = window.getComputedStyle(element);
                    const scrollInfo = {
                        scrollX: window.scrollX || window.pageXOffset,
                        scrollY: window.scrollY || window.pageYOffset,
                        scrollWidth: document.documentElement.scrollWidth,
                        scrollHeight: document.documentElement.scrollHeight,
                        clientWidth: document.documentElement.clientWidth,
                        clientHeight: document.documentElement.clientHeight
                    };
                    
                    return {
                        element: {
                            tag: element.tagName.toLowerCase(),
                            id: element.id || null,
                            classes: Array.from(element.classList || []),
                            selector: selector
                        },
                        position: {
                            x: Math.round(rect.x),
                            y: Math.round(rect.y),
                            width: Math.round(rect.width),
                            height: Math.round(rect.height),
                            top: Math.round(rect.top),
                            left: Math.round(rect.left),
                            bottom: Math.round(rect.bottom),
                            right: Math.round(rect.right)
                        },
                        style: {
                            display: style.display,
                            position: style.position,
                            visibility: style.visibility,
                            opacity: style.opacity,
                            zIndex: style.zIndex,
                            overflow: style.overflow,
                            margin: style.margin,
                            padding: style.padding,
                            border: style.border
                        },
                        scroll: scrollInfo,
                        viewport: {
                            width: window.innerWidth,
                            height: window.innerHeight
                        }
                    };
                `, selector);

                return {
                    success: true,
                    data: layout
                };
            }

            case 'get_computed_styles': {
                // Get computed styles for an element
                if (!selector) {
                    return { success: false, message: 'selector parameter required for get_computed_styles' };
                }

                const styles = await driver.executeScript(`
                    const selector = arguments[0];
                    const element = document.querySelector(selector);
                    
                    if (!element) {
                        return { error: 'Element not found' };
                    }
                    
                    const computed = window.getComputedStyle(element);
                    const allStyles = {};
                    for (let i = 0; i < computed.length; i++) {
                        const prop = computed[i];
                        allStyles[prop] = computed.getPropertyValue(prop);
                    }
                    
                    return {
                        selector: selector,
                        styles: allStyles,
                        important: Array.from(computed).filter(prop => {
                            const value = computed.getPropertyValue(prop);
                            const priority = computed.getPropertyPriority(prop);
                            return priority === 'important';
                        })
                    };
                `, selector);

                return {
                    success: true,
                    data: styles
                };
            }

            case 'get_event_listeners': {
                // Get event listeners (limited - browser security restrictions)
                const listeners = await driver.executeScript(`
                    const selector = arguments[0] || 'body';
                    const element = document.querySelector(selector) || document.body;
                    
                    // Note: getEventListeners is only available in Chrome DevTools console
                    // We can only detect inline and attribute-based listeners
                    const detected = {
                        inline: [],
                        attributes: []
                    };
                    
                    // Check for inline event handlers
                    const attrs = Array.from(element.attributes || []);
                    attrs.forEach(attr => {
                        if (attr.name.startsWith('on')) {
                            detected.attributes.push({
                                event: attr.name.substring(2),
                                handler: attr.value.substring(0, 100) // Truncate
                            });
                        }
                    });
                    
                    return {
                        element: selector,
                        detected: detected,
                        note: 'Only inline and attribute-based listeners can be detected due to browser security restrictions'
                    };
                `, selector);

                return {
                    success: true,
                    data: listeners
                };
            }

            case 'get_element_interactions': {
                // Track element interactions (clicks, inputs, focus, etc.)
                const interactions = await driver.executeScript(`
                    if (!window.capturedElementInteractions) {
                        window.capturedElementInteractions = [];
                    }
                    return window.capturedElementInteractions.slice(-${limit});
                `) as any[];

                return {
                    success: true,
                    data: {
                        interactions: Array.isArray(interactions) ? interactions : [],
                        count: Array.isArray(interactions) ? interactions.length : 0
                    }
                };
            }


            case 'get_css_property': {
                // Get CSS property value for an element
                if (!selector) {
                    return { success: false, message: 'selector parameter required' };
                }

                const css = await driver.executeScript(`
                    const selector = arguments[0];
                    const property = arguments[1] || null;
                    const element = document.querySelector(selector);
                    
                    if (!element) {
                        return { error: 'Element not found' };
                    }
                    
                    const computed = window.getComputedStyle(element);
                    
                    if (property) {
                        return {
                            selector: selector,
                            property: property,
                            value: computed.getPropertyValue(property),
                            important: computed.getPropertyPriority(property) === 'important'
                        };
                    } else {
                        // Return all CSS properties
                        const allProps = {};
                        for (let i = 0; i < computed.length; i++) {
                            const prop = computed[i];
                            allProps[prop] = {
                                value: computed.getPropertyValue(prop),
                                important: computed.getPropertyPriority(prop) === 'important'
                            };
                        }
                        return {
                            selector: selector,
                            properties: allProps
                        };
                    }
                `, selector, args.property || null);

                return {
                    success: true,
                    data: css
                };
            }

            case 'set_css_property': {
                // Set CSS property value for an element
                if (!selector || !args.property || args.value === undefined) {
                    return { success: false, message: 'selector, property, and value parameters required' };
                }

                const result = await driver.executeScript(`
                    const selector = arguments[0];
                    const property = arguments[1];
                    const value = arguments[2];
                    const important = arguments[3] || false;
                    
                    const element = document.querySelector(selector);
                    if (!element) {
                        return { error: 'Element not found' };
                    }
                    
                    const oldValue = window.getComputedStyle(element).getPropertyValue(property);
                    element.style.setProperty(property, value, important ? 'important' : '');
                    const newValue = window.getComputedStyle(element).getPropertyValue(property);
                    
                    return {
                        selector: selector,
                        property: property,
                        oldValue: oldValue,
                        newValue: newValue,
                        success: true
                    };
                `, selector, args.property, args.value, args.important || false);

                return {
                    success: true,
                    data: result
                };
            }

            case 'get_loaded_scripts': {
                // Get all loaded scripts (inline and external)
                const scripts = await driver.executeScript(`
                    const scripts = Array.from(document.querySelectorAll('script'));
                    return scripts.map((script, index) => {
                        return {
                            index: index,
                            src: script.src || null,
                            type: script.type || 'text/javascript',
                            async: script.async,
                            defer: script.defer,
                            inline: !script.src,
                            content: !script.src ? script.textContent?.substring(0, 1000) : null,
                            loaded: script.src ? true : null
                        };
                    });
                `);

                return {
                    success: true,
                    data: {
                        scripts: Array.isArray(scripts) ? scripts : [],
                        count: Array.isArray(scripts) ? scripts.length : 0
                    }
                };
            }

            case 'read_script': {
                // Read script content by index or src
                const scriptContent = await driver.executeScript(`
                    const index = arguments[0];
                    const src = arguments[1];
                    const scripts = Array.from(document.querySelectorAll('script'));
                    
                    let script = null;
                    if (index !== null && index !== undefined) {
                        script = scripts[index];
                    } else if (src) {
                        script = scripts.find(s => s.src === src || s.src.endsWith(src));
                    }
                    
                    if (!script) {
                        return { error: 'Script not found' };
                    }
                    
                    if (script.src) {
                        // External script - try to fetch
                        return fetch(script.src)
                            .then(r => r.text())
                            .then(content => ({
                                src: script.src,
                                type: script.type || 'text/javascript',
                                content: content,
                                size: content.length
                            }))
                            .catch(e => ({
                                src: script.src,
                                error: 'Could not fetch script: ' + e.message
                            }));
                    } else {
                        // Inline script
                        return {
                            inline: true,
                            type: script.type || 'text/javascript',
                            content: script.textContent || '',
                            size: (script.textContent || '').length
                        };
                    }
                `, args.index !== undefined ? args.index : null, args.src || null);

                return {
                    success: true,
                    data: scriptContent
                };
            }

            case 'clear_localStorage': {
                // Clear localStorage
                await driver.executeScript(`localStorage.clear();`);
                return {
                    success: true,
                    message: 'localStorage cleared'
                };
            }

            case 'set_localStorage': {
                // Set localStorage item
                if (!key || args.value === undefined) {
                    return { success: false, message: 'key and value parameters required' };
                }

                await driver.executeScript(`
                    localStorage.setItem(arguments[0], arguments[1]);
                `, key, args.value);

                return {
                    success: true,
                    message: `localStorage item '${key}' set`
                };
            }

            case 'remove_localStorage': {
                // Remove localStorage item
                if (!key) {
                    return { success: false, message: 'key parameter required' };
                }

                await driver.executeScript(`
                    localStorage.removeItem(arguments[0]);
                `, key);

                return {
                    success: true,
                    message: `localStorage item '${key}' removed`
                };
            }

            case 'clear_sessionStorage': {
                // Clear sessionStorage
                await driver.executeScript(`sessionStorage.clear();`);
                return {
                    success: true,
                    message: 'sessionStorage cleared'
                };
            }

            case 'set_sessionStorage': {
                // Set sessionStorage item
                if (!key || args.value === undefined) {
                    return { success: false, message: 'key and value parameters required' };
                }

                await driver.executeScript(`
                    sessionStorage.setItem(arguments[0], arguments[1]);
                `, key, args.value);

                return {
                    success: true,
                    message: `sessionStorage item '${key}' set`
                };
            }

            case 'clear_cookies': {
                // Clear all cookies
                await driver.manage().deleteAllCookies();
                return {
                    success: true,
                    message: 'All cookies cleared'
                };
            }

            case 'set_cookie': {
                // Set a cookie
                if (!key || args.value === undefined) {
                    return { success: false, message: 'key (name) and value parameters required' };
                }

                const cookieOptions: any = {
                    name: key,
                    value: args.value
                };

                if (args.domain) cookieOptions.domain = args.domain;
                if (args.path) cookieOptions.path = args.path;
                if (args.secure !== undefined) cookieOptions.secure = args.secure;
                if (args.httpOnly !== undefined) cookieOptions.httpOnly = args.httpOnly;
                if (args.expiry) cookieOptions.expiry = Math.floor(new Date(args.expiry).getTime() / 1000);

                await driver.manage().addCookie(cookieOptions);

                return {
                    success: true,
                    message: `Cookie '${key}' set`
                };
            }

            case 'remove_cookie': {
                // Remove a cookie
                if (!key) {
                    return { success: false, message: 'key (name) parameter required' };
                }

                await driver.manage().deleteCookie(key);

                return {
                    success: true,
                    message: `Cookie '${key}' removed`
                };
            }

            case 'get_performance_feedback': {
                // Comprehensive performance feedback for Cursor
                const feedback = await driver.executeScript(`
                    const navigation = performance.getEntriesByType('navigation')[0];
                    const paintEntries = performance.getEntriesByType('paint');
                    const resourceEntries = performance.getEntriesByType('resource');
                    const measureEntries = performance.getEntriesByType('measure');
                    
                    // Calculate performance scores
                    const timing = navigation ? {
                        dns: Math.round(navigation.domainLookupEnd - navigation.domainLookupStart),
                        tcp: Math.round(navigation.connectEnd - navigation.connectStart),
                        ssl: navigation.secureConnectionStart > 0 
                            ? Math.round(navigation.connectEnd - navigation.secureConnectionStart) 
                            : 0,
                        ttfb: Math.round(navigation.responseStart - navigation.requestStart),
                        download: Math.round(navigation.responseEnd - navigation.responseStart),
                        domProcessing: Math.round(navigation.domComplete - navigation.domInteractive),
                        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
                        loadComplete: Math.round(navigation.loadEventEnd - navigation.fetchStart),
                        total: Math.round(navigation.loadEventEnd - navigation.fetchStart)
                    } : null;
                    
                    const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');
                    const fp = paintEntries.find(e => e.name === 'first-paint');
                    const lcp = performance.getEntriesByType('largest-contentful-paint')[0];
                    
                    // Performance insights
                    const insights = [];
                    if (timing) {
                        if (timing.ttfb > 600) insights.push({ type: 'warning', message: 'Slow TTFB (>600ms) - server response time is high' });
                        if (timing.domContentLoaded > 3000) insights.push({ type: 'warning', message: 'Slow DOMContentLoaded (>3s) - consider optimizing initial HTML' });
                        if (timing.loadComplete > 5000) insights.push({ type: 'warning', message: 'Slow page load (>5s) - consider code splitting and lazy loading' });
                    }
                    
                    if (fcp && fcp.startTime > 2000) insights.push({ type: 'warning', message: 'Slow First Contentful Paint (>2s)' });
                    if (lcp && lcp.renderTime > 2500) insights.push({ type: 'warning', message: 'Slow Largest Contentful Paint (>2.5s)' });
                    
                    const resourceCount = resourceEntries.length;
                    const totalSize = resourceEntries.reduce((sum, e) => sum + (e.transferSize || 0), 0);
                    const totalTime = resourceEntries.reduce((sum, e) => sum + e.duration, 0);
                    
                    if (totalSize > 5 * 1024 * 1024) insights.push({ type: 'warning', message: 'Large total resource size (>5MB) - consider compression' });
                    if (resourceCount > 100) insights.push({ type: 'info', message: 'High number of resources (>100) - consider bundling' });
                    
                    const memory = performance.memory;
                    if (memory) {
                        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
                        if (usagePercent > 80) insights.push({ type: 'warning', message: 'High memory usage (>80%) - potential memory leak' });
                    }
                    
                    return {
                        url: window.location.href,
                        timestamp: new Date().toISOString(),
                        timing: timing,
                        paint: {
                            firstPaint: fp ? Math.round(fp.startTime) : null,
                            firstContentfulPaint: fcp ? Math.round(fcp.startTime) : null,
                            largestContentfulPaint: lcp ? Math.round(lcp.renderTime || lcp.loadTime) : null
                        },
                        resources: {
                            count: resourceCount,
                            totalSize: totalSize,
                            totalSizeMB: Math.round(totalSize / 1048576),
                            totalTime: Math.round(totalTime),
                            byType: resourceEntries.reduce((acc, e) => {
                                const type = e.initiatorType || 'other';
                                if (!acc[type]) acc[type] = { count: 0, size: 0 };
                                acc[type].count++;
                                acc[type].size += (e.transferSize || 0);
                                return acc;
                            }, {})
                        },
                        memory: memory ? {
                            usedMB: Math.round(memory.usedJSHeapSize / 1048576),
                            totalMB: Math.round(memory.totalJSHeapSize / 1048576),
                            limitMB: Math.round(memory.jsHeapSizeLimit / 1048576),
                            usagePercent: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
                        } : null,
                        insights: insights,
                        score: {
                            timing: timing && timing.total < 2000 ? 'good' : timing && timing.total < 4000 ? 'needs-improvement' : 'poor',
                            paint: fcp && fcp.startTime < 1800 ? 'good' : fcp && fcp.startTime < 3000 ? 'needs-improvement' : 'poor',
                            resources: totalSize < 2 * 1024 * 1024 ? 'good' : totalSize < 5 * 1024 * 1024 ? 'needs-improvement' : 'poor'
                        }
                    };
                `);

                return {
                    success: true,
                    data: feedback
                };
            }

            case 'get_all': {
                // Get comprehensive developer tools data (all-in-one)
                const allData = await driver.executeScript(`
                    // This is a comprehensive data collection
                    const navigation = performance.getEntriesByType('navigation')[0];
                    const paintEntries = performance.getEntriesByType('paint');
                    const resourceEntries = performance.getEntriesByType('resource');
                    
                    return {
                        url: window.location.href,
                        title: document.title,
                        console: window.capturedConsoleLogs ? window.capturedConsoleLogs.slice(-20) : [],
                        network: window.capturedNetworkLogs ? window.capturedNetworkLogs.slice(-20) : [],
                        interactions: window.capturedElementInteractions ? window.capturedElementInteractions.slice(-20) : [],
                        performance: {
                            timing: navigation ? {
                                loadTime: Math.round(navigation.loadEventEnd - navigation.fetchStart),
                                domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart)
                            } : null,
                            firstPaint: paintEntries.find(e => e.name === 'first-paint') 
                                ? Math.round(paintEntries.find(e => e.name === 'first-paint').startTime) 
                                : null
                        },
                        storage: {
                            localStorage: Object.keys(localStorage).length,
                            sessionStorage: Object.keys(sessionStorage).length,
                            cookies: document.cookie ? document.cookie.split(';').length : 0
                        },
                        memory: performance.memory ? {
                            usedMB: Math.round(performance.memory.usedJSHeapSize / 1048576),
                            totalMB: Math.round(performance.memory.totalJSHeapSize / 1048576)
                        } : null,
                        resources: resourceEntries.length,
                        scripts: document.querySelectorAll('script').length,
                        security: {
                            protocol: window.location.protocol,
                            isSecure: window.location.protocol === 'https:'
                        }
                    };
                `);

                return {
                    success: true,
                    data: allData
                };
            }

            case 'enable_dev_tools': {
                // Enable all dev tools features automatically: console capture, network monitoring, element tracking
                await driver.executeScript(`
                    // Initialize capture arrays
                    if (!window.capturedConsoleLogs) {
                        window.capturedConsoleLogs = [];
                    }
                    if (!window.capturedNetworkLogs) {
                        window.capturedNetworkLogs = [];
                    }
                    if (!window.capturedElementInteractions) {
                        window.capturedElementInteractions = [];
                    }
                    
                    // ===== CONSOLE CAPTURE =====
                    const methods = ['log', 'error', 'warn', 'info', 'debug', 'trace', 'table', 'group', 'groupEnd', 'time', 'timeEnd'];
                    const originals = {};
                    
                    methods.forEach(method => {
                        if (console[method] && !window._originalConsoleMethods) {
                            originals[method] = console[method];
                            console[method] = function(...args) {
                                window.capturedConsoleLogs.push({
                                    level: method,
                                    message: args.map(a => {
                                        if (typeof a === 'object') {
                                            try {
                                                return JSON.stringify(a).substring(0, 500);
                                            } catch {
                                                return String(a).substring(0, 500);
                                            }
                                        }
                                        return String(a);
                                    }).join(' '),
                                    timestamp: new Date().toISOString(),
                                    stack: method === 'error' || method === 'trace' 
                                        ? new Error().stack?.split('\\n').slice(0, 5).join('\\n') 
                                        : null
                                });
                                return originals[method].apply(console, args);
                            };
                        }
                    });
                    
                    if (!window._originalConsoleMethods) {
                        window._originalConsoleMethods = originals;
                    }
                    
                    // ===== NETWORK MONITORING =====
                    // Capture fetch requests
                    if (!window._originalFetch) {
                        window._originalFetch = window.fetch;
                        window.fetch = function(...args) {
                            const startTime = performance.now();
                            const url = args[0];
                            const options = args[1] || {};
                            
                            return window._originalFetch.apply(this, args)
                                .then(async response => {
                                    const endTime = performance.now();
                                    const clonedResponse = response.clone();
                                    let body = null;
                                    try {
                                        body = await clonedResponse.text();
                                    } catch (e) {
                                        // Body may not be readable
                                    }
                                    
                                    window.capturedNetworkLogs.push({
                                        url: url.toString(),
                                        method: options.method || 'GET',
                                        status: response.status,
                                        statusText: response.statusText,
                                        responseTime: Math.round(endTime - startTime),
                                        timestamp: new Date().toISOString(),
                                        type: 'fetch',
                                        headers: Object.fromEntries(response.headers.entries()),
                                        bodySize: body ? body.length : 0,
                                        body: body && body.length < 1000 ? body.substring(0, 1000) : null
                                    });
                                    return response;
                                })
                                .catch(error => {
                                    const endTime = performance.now();
                                    window.capturedNetworkLogs.push({
                                        url: url.toString(),
                                        method: options.method || 'GET',
                                        status: 0,
                                        error: error.message,
                                        responseTime: Math.round(endTime - startTime),
                                        timestamp: new Date().toISOString(),
                                        type: 'fetch'
                                    });
                                    throw error;
                                });
                        };
                    }
                    
                    // Capture XMLHttpRequest
                    if (!window._originalXHROpen) {
                        window._originalXHROpen = XMLHttpRequest.prototype.open;
                        window._originalXHRSend = XMLHttpRequest.prototype.send;
                        
                        XMLHttpRequest.prototype.open = function(method, url, ...args) {
                            this._method = method;
                            this._url = url;
                            this._startTime = performance.now();
                            return window._originalXHROpen.apply(this, [method, url, ...args]);
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
                                    type: 'xhr',
                                    responseText: xhr.responseText && xhr.responseText.length < 1000 
                                        ? xhr.responseText.substring(0, 1000) 
                                        : null
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
                            
                            return window._originalXHRSend.apply(this, args);
                        };
                    }
                    
                    // ===== ELEMENT INTERACTION TRACKING =====
                    // Track clicks
                    document.addEventListener('click', function(e) {
                        const target = e.target;
                        window.capturedElementInteractions.push({
                            type: 'click',
                            timestamp: new Date().toISOString(),
                            element: {
                                tag: target.tagName.toLowerCase(),
                                id: target.id || null,
                                classes: Array.from(target.classList || []),
                                text: (target.textContent || '').trim().slice(0, 100),
                                selector: target.id ? '#' + target.id : 
                                         target.className ? '.' + Array.from(target.classList)[0] : 
                                         target.tagName.toLowerCase()
                            },
                            position: { x: e.clientX, y: e.clientY }
                        });
                    }, true);
                    
                    // Track input changes
                    document.addEventListener('input', function(e) {
                        const target = e.target;
                        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                            window.capturedElementInteractions.push({
                                type: 'input',
                                timestamp: new Date().toISOString(),
                                element: {
                                    tag: target.tagName.toLowerCase(),
                                    id: target.id || null,
                                    name: target.name || null,
                                    type: target.type || null,
                                    selector: target.id ? '#' + target.id : 
                                             target.name ? '[name="' + target.name + '"]' : 
                                             target.tagName.toLowerCase()
                                },
                                value: target.value ? target.value.substring(0, 200) : ''
                            });
                        }
                    }, true);
                    
                    // Track focus/blur
                    document.addEventListener('focus', function(e) {
                        const target = e.target;
                        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
                            window.capturedElementInteractions.push({
                                type: 'focus',
                                timestamp: new Date().toISOString(),
                                element: {
                                    tag: target.tagName.toLowerCase(),
                                    id: target.id || null,
                                    name: target.name || null,
                                    selector: target.id ? '#' + target.id : 
                                             target.name ? '[name="' + target.name + '"]' : 
                                             target.tagName.toLowerCase()
                                }
                            });
                        }
                    }, true);
                    
                    // Track form submissions
                    document.addEventListener('submit', function(e) {
                        const target = e.target;
                        window.capturedElementInteractions.push({
                            type: 'submit',
                            timestamp: new Date().toISOString(),
                            element: {
                                tag: target.tagName.toLowerCase(),
                                id: target.id || null,
                                action: target.action || null,
                                method: target.method || null
                            }
                        });
                    }, true);
                    
                    // Mark dev tools as enabled
                    window._mcpDevToolsEnabled = true;
                `);

                return {
                    success: true,
                    message: 'Dev tools enabled: console capture, network monitoring, and element tracking are now active'
                };
            }

            case 'set_viewport_size': {
                // Set viewport size for mobile device emulation
                const width = args.width;
                const height = args.height;
                const deviceScaleFactor = args.deviceScaleFactor || 1;
                const mobile = args.mobile !== undefined ? args.mobile : (width && width < 768);

                if (!width || !height) {
                    return { success: false, message: 'width and height parameters required' };
                }

                // Set window size
                await driver.manage().window().setRect({
                    width: width,
                    height: height
                });

                // Set viewport via JavaScript (for responsive design testing)
                await driver.executeScript(`
                    // Set viewport meta tag if it exists, or create one
                    let viewport = document.querySelector('meta[name="viewport"]');
                    if (!viewport) {
                        viewport = document.createElement('meta');
                        viewport.name = 'viewport';
                        document.head.appendChild(viewport);
                    }
                    viewport.content = 'width=' + arguments[0] + ', initial-scale=' + arguments[2] + ', user-scalable=no';
                    
                    // Store viewport info for reference
                    window._mcpViewport = {
                        width: arguments[0],
                        height: arguments[1],
                        deviceScaleFactor: arguments[2],
                        mobile: arguments[3],
                        timestamp: new Date().toISOString()
                    };
                `, width, height, deviceScaleFactor, mobile);

                // Set user agent if mobile
                if (mobile) {
                    try {
                        await driver.executeScript(`
                            Object.defineProperty(navigator, 'userAgent', {
                                get: function() {
                                    return 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';
                                },
                                configurable: true
                            });
                        `);
                    } catch (e) {
                        // User agent override may not work in all browsers
                        logger.debug('Could not override user agent', { error: e instanceof Error ? e.message : String(e) });
                    }
                }

                return {
                    success: true,
                    message: `Viewport set to ${width}x${height}${mobile ? ' (mobile mode)' : ''}`,
                    data: {
                        width,
                        height,
                        deviceScaleFactor,
                        mobile
                    }
                };
            }

            case 'get_viewport_size': {
                // Get current viewport size
                const viewport = await driver.executeScript(`
                    return {
                        window: {
                            innerWidth: window.innerWidth,
                            innerHeight: window.innerHeight,
                            outerWidth: window.outerWidth,
                            outerHeight: window.outerHeight
                        },
                        screen: {
                            width: screen.width,
                            height: screen.height,
                            availWidth: screen.availWidth,
                            availHeight: screen.availHeight
                        },
                        devicePixelRatio: window.devicePixelRatio || 1,
                        viewport: window._mcpViewport || null,
                        userAgent: navigator.userAgent,
                        isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)
                    };
                `);

                // Also get window rect from Selenium
                try {
                    const rect = await driver.manage().window().getRect();
                    (viewport as any).selenium = {
                        width: rect.width,
                        height: rect.height,
                        x: rect.x,
                        y: rect.y
                    };
                } catch (e) {
                    // Window rect may not be available
                }

                return {
                    success: true,
                    data: viewport
                };
            }

            case 'set_device_preset': {
                // Set viewport to a preset device size
                const devicePresets: Record<string, { width: number; height: number; mobile: boolean; userAgent?: string }> = {
                    'iphone-se': { width: 375, height: 667, mobile: true },
                    'iphone-12': { width: 390, height: 844, mobile: true },
                    'iphone-12-pro': { width: 390, height: 844, mobile: true },
                    'iphone-14': { width: 390, height: 844, mobile: true },
                    'iphone-14-pro-max': { width: 430, height: 932, mobile: true },
                    'ipad': { width: 768, height: 1024, mobile: true },
                    'ipad-pro': { width: 1024, height: 1366, mobile: true },
                    'galaxy-s20': { width: 360, height: 800, mobile: true },
                    'galaxy-s21': { width: 384, height: 854, mobile: true },
                    'pixel-5': { width: 393, height: 851, mobile: true },
                    'desktop': { width: 1920, height: 1080, mobile: false },
                    'desktop-hd': { width: 1366, height: 768, mobile: false },
                    'tablet': { width: 768, height: 1024, mobile: true }
                };

                const preset = args.preset || 'iphone-12';
                const device = devicePresets[preset];

                if (!device) {
                    return {
                        success: false,
                        message: `Unknown device preset: ${preset}. Available: ${Object.keys(devicePresets).join(', ')}`
                    };
                }

                // Set window size
                await driver.manage().window().setRect({
                    width: device.width,
                    height: device.height
                });

                // Set viewport meta tag
                await driver.executeScript(`
                    let viewport = document.querySelector('meta[name="viewport"]');
                    if (!viewport) {
                        viewport = document.createElement('meta');
                        viewport.name = 'viewport';
                        document.head.appendChild(viewport);
                    }
                    viewport.content = 'width=' + arguments[0] + ', initial-scale=1, user-scalable=no';
                    
                    window._mcpViewport = {
                        width: arguments[0],
                        height: arguments[1],
                        mobile: arguments[2],
                        preset: arguments[3],
                        timestamp: new Date().toISOString()
                    };
                `, device.width, device.height, device.mobile, preset);

                // Set mobile user agent if needed
                if (device.mobile) {
                    try {
                        await driver.executeScript(`
                            Object.defineProperty(navigator, 'userAgent', {
                                get: function() {
                                    return 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';
                                },
                                configurable: true
                            });
                        `);
                    } catch (e) {
                        logger.debug('Could not override user agent');
                    }
                }

                return {
                    success: true,
                    message: `Device preset '${preset}' applied (${device.width}x${device.height})`,
                    data: {
                        preset,
                        width: device.width,
                        height: device.height,
                        mobile: device.mobile
                    }
                };
            }

            case 'reset_viewport': {
                // Reset viewport to default desktop size
                await driver.manage().window().setRect({
                    width: 1920,
                    height: 1080
                });

                await driver.executeScript(`
                    let viewport = document.querySelector('meta[name="viewport"]');
                    if (viewport) {
                        viewport.content = 'width=device-width, initial-scale=1';
                    }
                    window._mcpViewport = null;
                `);

                return {
                    success: true,
                    message: 'Viewport reset to default desktop size'
                };
            }

            default:
                return {
                    success: false,
                    message: `Unknown action: ${action}. Available actions: enable_dev_tools, get_console_logs, get_network_requests, get_performance_metrics, get_performance_feedback, get_storage, get_cookies, get_accessibility, get_security, get_manifest, get_service_workers, get_memory, get_layout, get_computed_styles, get_event_listeners, get_element_interactions, get_css_property, set_css_property, get_loaded_scripts, read_script, clear_localStorage, set_localStorage, remove_localStorage, clear_sessionStorage, set_sessionStorage, clear_cookies, set_cookie, remove_cookie, get_all, set_viewport_size, get_viewport_size, set_device_preset, reset_viewport`
                };
        }
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('DevTools operation failed', {
            sessionId: session.sessionId,
            browserId: session.browserId,
            action,
            error: msg
        });
        return {
            success: false,
            message: `DevTools operation failed: ${msg}`
        };
    }
}
