
const express = require('express');
const JobRepository = require('../../repositories/ai/jobRepository');
const JobService = require('../../services/ai/jobService');
const AiController = require('../../controllers/ai/aiController');

const jobRepository = new JobRepository();
const jobService = new JobService(jobRepository);
const controller = new AiController(jobService);

const router = express.Router();
router.post('/command', (req, res) => controller.postCommand(req, res));
router.get('/jobs/:id', (req, res) => controller.getJob(req, res));

module.exports = router;
