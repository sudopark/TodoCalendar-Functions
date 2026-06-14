
const Errors = require('../../models/Errors');
const { detectLangFromAcceptLanguage } = require('../../services/ai/language');

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

        const lang = detectLangFromAcceptLanguage(req.header('accept-language'));
        const userId = req.auth.uid;
        const jobId = await this.jobService.createJob({ userId, deviceId, commandText, timezone, lang });
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

        // confirm path body:
        //  - parent_job_id: 1차 command job 의 jobId. 서버가 그걸로 parent 의 commandText 를
        //    load 해 confirm job 에 복사 (#238). confirmToken 에는 jobId 가 bind 되지 않아
        //    클라가 명시.
        //  - command_text: 클라가 보내지 않음. parent 의 commandText 가 진실의 source.
        //  - timezone: optional — runConfirm 본체에서 사용 X. 박혀 오면 형식만 검증.

        const parentJobId = req.body.parent_job_id;
        if (!parentJobId || typeof parentJobId !== 'string') {
            throw new Errors.BadRequest('parent_job_id is required');
        }

        const timezone = req.body.timezone;
        if (timezone !== undefined && timezone !== null && !isValidTimezone(timezone)) {
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

        const lang = detectLangFromAcceptLanguage(req.header('accept-language'));
        const userId = req.auth.uid;
        const jobId = await this.jobService.createConfirmJob({
            userId,
            deviceId,
            parentJobId,
            timezone: timezone ?? null,
            lang,
            confirmPayload: { tool, args, confirmToken }
        });
        res.status(202).send({ job_id: jobId });
    }

    async postCommandReject(req, res) {
        const deviceId = req.header('device_id');
        if (!deviceId) {
            throw new Errors.BadRequest('device_id header is required');
        }

        // reject path body:
        //  - job_id: confirm 대기 중인 1차 command job 의 jobId (confirm path 의
        //    parent_job_id 와 같은 대상). 그 job 을 REJECTED 로 종결시킨다.
        const jobId = req.body.job_id;
        if (!jobId || typeof jobId !== 'string') {
            throw new Errors.BadRequest('job_id is required');
        }

        const userId = req.auth.uid;
        // 클라가 fire-and-forget 으로 호출 — 전이 성공/no-op 여부와 무관하게 204.
        await this.jobService.rejectConfirm({ userId, jobId });
        res.status(204).send();
    }

    async getUsage(req, res) {
        const userId = req.auth.uid;
        const [usage, dailyLimit] = await Promise.all([
            this.aiUsageService.getTodayUsage(userId),
            this.aiUsageService.getDailyLimit(userId)
        ]);
        const resetsAt = this.aiUsageService.getResetAt();
        res.status(200).send({ ...usage.toJSON(), daily_limit: dailyLimit, resets_at: resetsAt });
    }
}

module.exports = AiController;
