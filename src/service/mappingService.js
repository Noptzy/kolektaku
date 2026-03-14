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

        // Approve the candidate
        await mappingRepository.approveCandidate(candidateId);

        // Connect the mapping if koleksi exists
        if (mapping.koleksiId) {
            await mappingRepository.connectMapping(mapping.koleksiId, candidate.targetAnilistId);
        }

        // Update status
        await mappingRepository.updateStatus(mappingId, 'resolved');

        await auditLogRepository.createLog({
            adminId,
            action: 'APPROVE_MAPPING',
            entityType: 'PendingMapping',
            entityId: mappingId,
            changes: { candidateId, targetAnilistId: candidate.targetAnilistId, targetTitle: candidate.targetTitle },
        });

        return { mappingId, candidateId, status: 'resolved' };
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

    async manualConnect(adminId, mappingId, koleksiId) {
        await mappingRepository.updateStatus(mappingId, 'resolved', koleksiId);

        await auditLogRepository.createLog({
            adminId,
            action: 'MANUAL_MAPPING',
            entityType: 'PendingMapping',
            entityId: mappingId,
            changes: { koleksiId },
        });

        return { mappingId, koleksiId, status: 'resolved' };
    }

    async connectAnime(adminId, koleksiId, data) {
        const mapping = await mappingRepository.connectMapping(koleksiId, data.anilistId, data.nineanimeId);

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
