'use strict';

const { logger } = require('../config/logger');
const prisma = require('../config/prisma');
const { runMappingPipeline } = require('../services/MappingService');

/**
 * Handler: batch_map_9anime
 * Triggered by admin "Batch Map 9Anime" button.
 * Runs MappingService pipeline to auto-map unmapped anime to 9anime.
 */
async function handleBatchMap(payload) {
    logger.info(`[BatchMap] Starting for Admin: ${payload.adminId || 'System'}`);

    try {
        const stats = await runMappingPipeline();

        logger.info(`[BatchMap] Finished. Mapped: ${stats.mapped}, Candidate: ${stats.candidate}, Pending: ${stats.pending}, Failed: ${stats.failed}`);

        if (payload.adminId) {
            await prisma.adminAuditLog.create({
                data: {
                    adminId: payload.adminId,
                    action: 'BATCH_MAPPING_SUCCESS',
                    entityType: 'System',
                    entityId: null,
                    changes: {
                        message: 'Batch mapping pipeline completed',
                        stats: {
                            total: stats.total,
                            mapped: stats.mapped,
                            candidate: stats.candidate,
                            pending: stats.pending,
                            failed: stats.failed,
                        }
                    },
                    createdAt: new Date()
                }
            });
        }
    } catch (error) {
        logger.error(`[BatchMap] Error: ${error.message}`);
        if (payload.adminId) {
            try {
                await prisma.adminAuditLog.create({
                    data: {
                        adminId: payload.adminId,
                        action: 'BATCH_MAPPING_FAILED',
                        entityType: 'System',
                        entityId: null,
                        changes: { error: error.message },
                        createdAt: new Date()
                    }
                });
            } catch (auditErr) {
                logger.error(`[BatchMap] Audit log error: ${auditErr.message}`);
            }
        }
    }
}

module.exports = { handleBatchMap };
