const prisma = require('../config/prisma');

function sanitizeWorkerId(value) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    return null;
}

function createScrapeSession({ sourceName, workerId, context = {} }) {
    return {
        sourceName,
        workerId: sanitizeWorkerId(workerId),
        startedAt: new Date().toISOString(),
        context,
        successIds: [],
        failedIds: [],
        warningIds: [],
        warnings: [],
        extras: {},
    };
}

function addSuccessId(session, id) {
    if (!session || id === null || id === undefined) return;
    session.successIds.push(String(id));
}

function addFailureId(session, id, reason = null) {
    if (!session || id === null || id === undefined) return;
    session.failedIds.push(String(id));
    if (reason) {
        session.warnings.push({
            type: 'failure',
            id: String(id),
            reason,
        });
    }
}

function addWarning(session, warning) {
    if (!session || !warning) return;
    session.warnings.push(warning);
}

function addWarningId(session, id) {
    if (!session || id === null || id === undefined) return;
    session.warningIds.push(String(id));
}

function mergeSessionExtras(session, extras = {}) {
    if (!session) return;
    session.extras = {
        ...session.extras,
        ...extras,
    };
}

function resolveStatus(session, errorMessage) {
    if (errorMessage || (session?.failedIds?.length ?? 0) > 0) return 'error';
    if ((session?.warnings?.length ?? 0) > 0 || (session?.warningIds?.length ?? 0) > 0) return 'warning';
    return 'success';
}

async function flushScrapeSession(session, { errorMessage = null, forceStatus = null } = {}) {
    if (!session || !session.sourceName) return;

    const status = forceStatus || resolveStatus(session, errorMessage);
    const details = {
        startedAt: session.startedAt,
        finishedAt: new Date().toISOString(),
        context: session.context,
        successIds: session.successIds,
        failedIds: session.failedIds,
        warningIds: session.warningIds,
        warnings: session.warnings,
        extras: session.extras,
    };

    const uniqueCount = new Set([
        ...session.successIds,
        ...session.failedIds,
        ...session.warningIds,
    ]).size;

    await prisma.scrapeLog.create({
        data: {
            sourceName: session.sourceName,
            workerId: session.workerId,
            status,
            itemsProcessed: uniqueCount,
            details,
            errorMessage: errorMessage ? String(errorMessage) : null,
        },
    });
}

module.exports = {
    createScrapeSession,
    addSuccessId,
    addFailureId,
    addWarning,
    addWarningId,
    mergeSessionExtras,
    flushScrapeSession,
};
