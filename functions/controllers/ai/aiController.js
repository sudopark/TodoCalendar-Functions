
const Errors = require('../../models/Errors');

function isValidTimezone(tz) {
    if (typeof tz !== 'string' || !tz) return false;
    try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
    } catch {
        return false;
    }
}

class AiController {

    constructor(jobService, aiUsageService) {
        this.jobService = jobService;
        this.aiUsageService = aiUsageService;
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

        const timezone = req.body.timezone;
        if (!timezone) {
            throw new Errors.BadRequest('timezone is required');
        }
        if (!isValidTimezone(timezone)) {
            throw new Errors.BadRequest('timezone is invalid (must be a valid IANA timezone name)');
        }

        const userId = req.auth.uid;
        const jobId = await this.jobService.createJob({ userId, deviceId, commandText, timezone });
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

    async postCommandConfirm(req, res) {
        const deviceId = req.header('device_id');
        if (!deviceId) {
            throw new Errors.BadRequest('device_id header is required');
        }

        const rawCommandText = req.body.command_text;
        if (!rawCommandText || !rawCommandText.trim()) {
            throw new Errors.BadRequest('command_text is required');
        }
        const commandText = rawCommandText.trim();

        const timezone = req.body.timezone;
        if (!timezone) {
            throw new Errors.BadRequest('timezone is required');
        }
        if (!isValidTimezone(timezone)) {
            throw new Errors.BadRequest('timezone is invalid (must be a valid IANA timezone name)');
        }

        const tool = req.body.tool;
        if (!tool || typeof tool !== 'string') {
            throw new Errors.BadRequest('tool is required');
        }

        const args = req.body.args;
        if (!args || typeof args !== 'object' || Array.isArray(args)) {
            throw new Errors.BadRequest('args is required (object)');
        }

        const confirmToken = req.body.confirm_token;
        if (!confirmToken || typeof confirmToken !== 'string') {
            throw new Errors.BadRequest('confirm_token is required');
        }

        const userId = req.auth.uid;
        const jobId = await this.jobService.createConfirmJob({
            userId,
            deviceId,
            commandText,
            timezone,
            confirmPayload: { tool, args, confirmToken }
        });
        res.status(202).send({ job_id: jobId });
    }

    async getUsage(req, res) {
        const usage = await this.aiUsageService.getTodayUsage(req.auth.uid);
        res.status(200).send(usage.toJSON());
    }
}

module.exports = AiController;
