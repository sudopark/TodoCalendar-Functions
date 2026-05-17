
const Errors = require('../../models/Errors');


class AiController {

    constructor(jobService) {
        this.jobService = jobService;
    }

    async postCommand(req, res) {
        const deviceId = req.header('device_id');
        if (!deviceId) {
            throw new Errors.BadRequest('device_id header is required');
        }

        const rawCommandText = req.body.command_text;
        if (!rawCommandText || !rawCommandText.trim()) {
            throw new Errors.BadRequest('command_text is required');
        }
        const commandText = rawCommandText.trim();

        const userId = req.auth.uid;
        const jobId = await this.jobService.createJob({ userId, deviceId, commandText });
        res.status(202).send({ job_id: jobId });
    }

    async getJob(req, res) {
        const job = await this.jobService.loadJob(req.params.id);
        if (!job) {
            throw new Errors.NotFound('job not found');
        }

        if (job.userId !== req.auth.uid) {
            throw new Errors.Base(403, 'Forbidden', 'forbidden');
        }

        res.status(200).send(job.toJSON());
    }
}

module.exports = AiController;
