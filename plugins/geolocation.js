/**
 * Geolocation Plugin for MCP Selenium Server
 * Allows setting browser location using latitude and longitude
 */

export default {
    name: 'geolocation',
    version: '1.0.0',
    description: 'Plugin for setting browser geolocation using latitude and longitude coordinates',

    tools: [
        {
            name: 'set_location',
            description: 'Set the browser location using latitude and longitude coordinates',
            inputSchema: {
                type: 'object',
                properties: {
                    sessionId: {
                        type: 'string',
                        description: 'Session ID of the browser to control',
                    },
                    latitude: {
                        type: 'number',
                        description: 'Latitude coordinate (-90 to 90)',
                        minimum: -90,
                        maximum: 90,
                    },
                    longitude: {
                        type: 'number',
                        description: 'Longitude coordinate (-180 to 180)',
                        minimum: -180,
                        maximum: 180,
                    },
                    accuracy: {
                        type: 'number',
                        description: 'Accuracy in meters (default: 100)',
                        default: 100,
                        minimum: 0,
                    },
                    reloadPage: {
                        type: 'boolean',
                        description: 'Reload the page after setting location (default: true)',
                        default: true,
                    },
                },
                required: ['sessionId', 'latitude', 'longitude'],
            },
        },
        {
            name: 'get_location',
            description: 'Get the current browser location',
            inputSchema: {
                type: 'object',
                properties: {
                    sessionId: {
                        type: 'string',
                        description: 'Session ID of the browser to control',
                    },
                },
                required: ['sessionId'],
            },
        },
    ],

    handlers: {
        async set_location(args, context) {
            try {
                const { sessionId, latitude, longitude, accuracy = 100, reloadPage = true } = args;

                // Validate coordinates
                if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: false,
                                    message: 'Invalid latitude. Must be a number between -90 and 90.',
                                }, null, 2),
                            },
                        ],
                    };
                }

                if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: false,
                                    message: 'Invalid longitude. Must be a number between -180 and 180.',
                                }, null, 2),
                            },
                        ],
                    };
                }

                // Get browser session
                if (!context || !context.getSession) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: false,
                                    message: 'Plugin context not available. Cannot access browser sessions.',
                                }, null, 2),
                            },
                        ],
                    };
                }

                const session = await context.getSession(sessionId);
                if (!session) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: false,
                                    message: `Session '${sessionId}' not found`,
                                }, null, 2),
                            },
                        ],
                    };
                }

                const driver = session.driver;
                const currentUrl = await driver.getCurrentUrl();
                let origin;
                try {
                    origin = new URL(currentUrl).origin;
                } catch (e) {
                    origin = currentUrl.split('/').slice(0, 3).join('/');
                }

                // Use Chrome DevTools Protocol to set geolocation
                // Set geolocation override using executeCdpCommand
                await driver.executeCdpCommand('Emulation.setGeolocationOverride', {
                    latitude: latitude,
                    longitude: longitude,
                    accuracy: accuracy,
                });

                // Grant geolocation permission for multiple origins (including Google Maps domains)
                const originsToGrant = [
                    origin,
                    'https://www.google.com',
                    'https://maps.google.com',
                    'https://www.google.com/maps',
                    'https://maps.googleapis.com',
                ];

                for (const originToGrant of originsToGrant) {
                    try {
                        await driver.executeCdpCommand('Browser.setPermission', {
                            origin: originToGrant,
                            permission: { name: 'geolocation' },
                            setting: 'granted',
                        });
                    } catch (permError) {
                        // Permission setting might fail for some origins, continue
                        console.warn(`Failed to set geolocation permission for ${originToGrant}:`, permError);
                    }
                }

                // If on Google Maps, try to trigger location update
                if (currentUrl.includes('google.com/maps') || currentUrl.includes('maps.google.com')) {
                    try {
                        // Execute script to trigger geolocation API
                        await driver.executeScript(`
                            if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition(
                                    (position) => {
                                        console.log('Location updated:', position.coords.latitude, position.coords.longitude);
                                        // Dispatch a custom event that Maps might listen to
                                        window.dispatchEvent(new Event('geolocationupdate'));
                                    },
                                    (error) => {
                                        console.error('Geolocation error:', error);
                                    },
                                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                                );
                            }
                        `);
                        // Wait a bit for the location to be processed
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (scriptError) {
                        console.warn('Failed to trigger geolocation update:', scriptError);
                    }
                }

                // Reload page if requested (default: true)
                if (reloadPage) {
                    await driver.navigate().refresh();
                    // Wait for page to load
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                message: 'Location set successfully',
                                data: {
                                    latitude,
                                    longitude,
                                    accuracy,
                                },
                            }, null, 2),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: false,
                                message: `Failed to set location: ${error instanceof Error ? error.message : String(error)}`,
                            }, null, 2),
                        },
                    ],
                };
            }
        },

        async get_location(args, context) {
            try {
                const { sessionId } = args;

                // Get browser session
                if (!context || !context.getSession) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: false,
                                    message: 'Plugin context not available. Cannot access browser sessions.',
                                }, null, 2),
                            },
                        ],
                    };
                }

                const session = await context.getSession(sessionId);
                if (!session) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: false,
                                    message: `Session '${sessionId}' not found`,
                                }, null, 2),
                            },
                        ],
                    };
                }

                const driver = session.driver;

                // Try to get geolocation using JavaScript
                const location = await driver.executeScript(`
          return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
              reject(new Error('Geolocation is not supported by this browser'));
              return;
            }
            
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  altitude: position.coords.altitude,
                  altitudeAccuracy: position.coords.altitudeAccuracy,
                  heading: position.coords.heading,
                  speed: position.coords.speed,
                });
              },
              (error) => {
                reject(new Error(error.message));
              },
              { timeout: 5000, enableHighAccuracy: true }
            );
          });
        `);

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                message: 'Location retrieved successfully',
                                data: location,
                            }, null, 2),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: false,
                                message: `Failed to get location: ${error instanceof Error ? error.message : String(error)}`,
                            }, null, 2),
                        },
                    ],
                };
            }
        },
    },
};

