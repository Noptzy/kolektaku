const reportService = require('../service/reportService');
const resHandler = require('../utils/resHandler');

class ReportController {
    async submitReport(req, res) {
        try {
            const { episodeId } = req.params;
            const userId = req.user.id;
            const { category, message } = req.body;

            await reportService.submitReport(userId, episodeId, { category, message });

            return res.status(201).json(resHandler.success('Report submitted successfully'));
        } catch (error) {
            console.error('Submit report error:', error);
            if (error.message === 'Category is required' || error.message === 'Episode not found') {
                return res.status(400).json(resHandler.error(error.message));
            }
            return res.status(500).json(resHandler.error('Internal server error'));
        }
    }

    async getUserReports(req, res) {
        try {
            const userId = req.user.id;
            const reports = await reportService.getUserReports(userId);
            return res.status(200).json(resHandler.success('User reports retrieved', reports));
        } catch (error) {
            console.error('Get user reports error:', error);
            return res.status(500).json(resHandler.error('Internal server error'));
        }
    }

    async getReports(req, res) {
        try {
            const { status, page, limit } = req.query;
            const data = await reportService.getReports({ status, page, limit });

            return res.status(200).json(resHandler.success('Reports retrieved locally', data));
        } catch (error) {
            console.error('Get reports error:', error);
            return res.status(500).json(resHandler.error('Internal server error'));
        }
    }

    async resolveReport(req, res) {
        try {
            const { id } = req.params;
            await reportService.resolveReport(id);

            return res.status(200).json(resHandler.success('Report marked as resolved'));
        } catch (error) {
            console.error('Resolve report error:', error);
            return res.status(500).json(resHandler.error('Internal server error'));
        }
    }

    async dismissReport(req, res) {
        try {
            const { id } = req.params;
            await reportService.dismissReport(id);

            return res.status(200).json(resHandler.success('Report marked as dismissed'));
        } catch (error) {
            console.error('Dismiss report error:', error);
            return res.status(500).json(resHandler.error('Internal server error'));
        }
    }

    async deleteReport(req, res) {
        try {
            const { id } = req.params;
            await reportService.deleteReport(id);

            return res.status(200).json(resHandler.success('Report deleted successfully'));
        } catch (error) {
            console.error('Delete report error:', error);
            return res.status(500).json(resHandler.error('Internal server error'));
        }
    }
}

module.exports = new ReportController();
