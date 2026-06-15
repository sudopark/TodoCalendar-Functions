
const express = require('express');
const JobRepository = require('../../repositories/ai/jobRepository');
const JobService = require('../../services/ai/jobService');
const AiUsageRepository = require('../../repositories/ai/aiUsageRepository');
const AiUsageService = require('../../services/ai/aiUsageService');
const AiController = require('../../controllers/ai/aiController');

const jobRepository = new JobRepository();
const aiUsageRepository = new AiUsageRepository();
const aiUsageService = new AiUsageService({ repository: aiUsageRepository });
const jobService = new JobService(jobRepository, aiUsageService);
const controller = new AiController(jobService, aiUsageService);

const router = express.Router();
router.post('/command', (req, res) => controller.postCommand(req, res));
router.post('/command/confirm', (req, res) => controller.postCommandConfirm(req, res));
router.post('/command/reject', (req, res) => controller.postCommandReject(req, res));
router.post('/command/cancel', (req, res) => controller.postCommandCancel(req, res));
router.get('/jobs/:id', (req, res) => controller.getJob(req, res));
router.get('/usage', (req, res) => controller.getUsage(req, res));

module.exports = router;
