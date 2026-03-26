const mappingRepository = require('../repository/mappingRepository');
const auditLogRepository = require('../repository/auditLogRepository');

class MappingService {
    async getAllPending(page = 1, limit = 20, status = 'pending', query = '') {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            mappingRepository.findAllPending({ skip, take: limit, status, query }),
            mappingRepository.countPending({ status, query }),
        ]);
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async getById(id) {
        return mappingRepository.findById(id);
    }

    async approve(adminId, mappingId, candidateId) {
        const mapping = await mappingRepository.findById(mappingId);
        if (!mapping) throw { status: 404, message: 'Pending mapping not found' };

        const candidate = mapping.candidates.find((c) => c.id === candidateId);
        if (!candidate) throw { status: 404, message: 'Candidate not found' };

        await mappingRepository.approveCandidate(candidateId);

        let targetKoleksiId = mapping.koleksiId;

        // If no koleksiId on pending mapping, try to find one by anilistId
        if (!targetKoleksiId && candidate.targetAnilistId) {
            const existing = await mappingRepository.findKoleksiMappingByAnilistId(candidate.targetAnilistId);
            if (existing) {
                targetKoleksiId = existing.koleksiId;
                // Update the pending mapping record with this koleksiId for future reference
                await mappingRepository.updateStatus(mappingId, 'resolved', targetKoleksiId);
            }
        }

        if (targetKoleksiId) {
            const nineanimeId = mapping.sourceIdOrSlug || null;
            await mappingRepository.connectMapping(targetKoleksiId, candidate.targetAnilistId, nineanimeId);

            // Trigger episode scraping in background
            if (nineanimeId) {
                this._triggerEpisodeScrapeBackground(targetKoleksiId, nineanimeId);
            }
            
            await mappingRepository.updateStatus(mappingId, 'resolved', targetKoleksiId);
        } else {
            // Still no koleksiId? We resolve it but it won't be linked until manual connection
            await mappingRepository.updateStatus(mappingId, 'resolved');
        }

        await auditLogRepository.createLog({
            adminId,
            action: 'APPROVE_MAPPING',
            entityType: 'PendingMapping',
            entityId: mappingId,
            changes: { 
                candidateId, 
                targetAnilistId: candidate.targetAnilistId, 
                targetTitle: candidate.targetTitle, 
                nineanimeId: mapping.sourceIdOrSlug,
                koleksiId: targetKoleksiId 
            },
        });

        return { mappingId, candidateId, status: 'resolved', koleksiId: targetKoleksiId };
    }

    /**
     * Triggers episode scraping in the background (fire & forget).
     * Spawns a child process so it doesn't block the API response.
     */
    _triggerEpisodeScrapeBackground(koleksiId, nineanimeId) {
        const { publishMessage } = require('../queues/rabbitmq');

        try {
            publishMessage('scraping_tasks', {
                action: 'trigger_scrape',
                animeId: koleksiId,
                type: 'episodes'
            });
            console.log(`[MappingService] Published episode scrape task for ${koleksiId} to RabbitMQ`);
        } catch (error) {
            console.error(`[MappingService] Failed to publish episode scrape task for ${koleksiId}: ${error.message}`);
        }
    }

    async ignore(adminId, mappingId) {
        await mappingRepository.updateStatus(mappingId, 'ignored');

        await auditLogRepository.createLog({
            adminId,
            action: 'IGNORE_MAPPING',
            entityType: 'PendingMapping',
            entityId: mappingId,
            changes: null,
        });

        return { mappingId, status: 'ignored' };
    }

    async bulkApprove(adminId, items) {
        // items: [{ mappingId, candidateId }]
        const results = [];
        for (const item of items) {
            try {
                const res = await this.approve(adminId, item.mappingId, item.candidateId);
                results.push(res);
            } catch (error) {
                console.error(`[MappingService] Bulk approve failed for mapping ${item.mappingId}: ${error.message}`);
                // Continue with other items
            }
        }
        return results;
    }

    async bulkIgnore(adminId, mappingIds) {
        await mappingRepository.bulkIgnore(mappingIds);

        await auditLogRepository.createLog({
            adminId,
            action: 'BULK_IGNORE_MAPPING',
            entityType: 'PendingMapping',
            entityId: null, // Bulk action
            changes: { mappingIds },
        });

        return { mappingIds, status: 'ignored' };
    }

    async manualConnect(adminId, mappingId, koleksiId) {
        const mapping = await mappingRepository.findById(mappingId);
        if (!mapping) throw { status: 404, message: 'Pending mapping not found' };

        await mappingRepository.updateStatus(mappingId, 'resolved', koleksiId);

        // Fetch nineanimeId from pending mapping source
        const nineanimeId = mapping.sourceIdOrSlug;
        
        // Try to find an anilistId to associate with this connection
        // Pick the best candidate's anilistId if available
        let anilistId = null;
        
        // Pick the best candidate's anilistId if available
        if (mapping.candidates && mapping.candidates.length > 0) {
            anilistId = mapping.candidates[0].targetAnilistId;
        }

        if (koleksiId) {
            await mappingRepository.connectMapping(koleksiId, anilistId, nineanimeId);

            if (nineanimeId) {
                this._triggerEpisodeScrapeBackground(koleksiId, nineanimeId);
            }
        }

        await auditLogRepository.createLog({
            adminId,
            action: 'MANUAL_MAPPING',
            entityType: 'PendingMapping',
            entityId: mappingId,
            changes: { koleksiId, nineanimeId, anilistId },
        });

        return { mappingId, koleksiId, status: 'resolved' };
    }

    async connectAnime(adminId, koleksiId, data) {
        const mapping = await mappingRepository.connectMapping(koleksiId, data.anilistId, data.nineanimeId);

        // Trigger scrape if nineanimeId provided
        if (data.nineanimeId) {
            this._triggerEpisodeScrapeBackground(koleksiId, data.nineanimeId);
        }

        await auditLogRepository.createLog({
            adminId,
            action: 'CONNECT_ANIME',
            entityType: 'KoleksiMapping',
            entityId: koleksiId,
            changes: data,
        });

        return mapping;
    }

    async disconnectAnime(adminId, koleksiId) {
        await mappingRepository.disconnectMapping(koleksiId);

        await auditLogRepository.createLog({
            adminId,
            action: 'DISCONNECT_ANIME',
            entityType: 'KoleksiMapping',
            entityId: koleksiId,
            changes: null,
        });

        return { koleksiId, disconnected: true };
    }
}

module.exports = new MappingService();
