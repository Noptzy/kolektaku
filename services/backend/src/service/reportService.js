const reportRepo = require('../repository/reportRepository');
const prisma = require('../config/prisma');

class ReportService {
    async submitReport(userId, episodeId, { category, message }) {
        if (!category) {
            throw new Error('Category is required');
        }
        
        // Ensure episode exists
        const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
        if (!episode) {
            throw new Error('Episode not found');
        }

        return reportRepo.createReport({ 
            userId, 
            episodeId, 
            category, 
            message: message?.trim() || null 
        });
    }

    async getUserReports(userId) {
        return reportRepo.findByUser(userId);
    }

    async getReports({ status, page = 1, limit = 20 }) {
        const skip = (page - 1) * limit;
        const [reports, total] = await Promise.all([
            reportRepo.findAll({ status, skip, take: parseInt(limit) }),
            reportRepo.countAll({ status })
        ]);

        return {
            reports,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        };
    }

    async resolveReport(id) {
        return reportRepo.updateStatus(id, 'resolved');
    }

    async dismissReport(id) {
        return reportRepo.updateStatus(id, 'dismissed');
    }

    async deleteReport(id) {
        return reportRepo.deleteReport(id);
    }
}

module.exports = new ReportService();
