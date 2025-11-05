export async function listScenariosTool(
    args: any,
    scenarios: Map<string, any>
) {
    const { filter, limit = 50 } = args;
    let scenariosList = Array.from(scenarios.values());

    if (filter) {
        const lowerCaseFilter = filter.toLowerCase();
        scenariosList = scenariosList.filter(s =>
            s.name.toLowerCase().includes(lowerCaseFilter) ||
            s.description?.toLowerCase().includes(lowerCaseFilter)
        );
    }

    const sortedScenarios = scenariosList.sort((a, b) => new Date(b.metadata.lastModified).getTime() - new Date(a.metadata.lastModified).getTime());
    const limitedScenarios = sortedScenarios.slice(0, limit);

    return {
        success: true,
        message: `Found ${limitedScenarios.length} scenarios`,
        data: {
            scenarios: limitedScenarios.map(s => ({
                scenarioId: s.scenarioId,
                name: s.name,
                description: s.description,
                totalSteps: s.metadata.totalSteps,
                duration: s.metadata.duration,
                createdAt: s.metadata.createdAt,
                lastModified: s.metadata.lastModified,
                lastUsed: s.metadata.lastUsed,
            })),
        },
    };
}

