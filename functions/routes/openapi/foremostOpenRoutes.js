
const express = require('express');
const router = express.Router();

const ForemostOpenController = require('../../controllers/openapi/foremostOpenController');
const ForemostEventService = require('../../services/foremostEventService');
const ForemostEventIdRepository = require('../../repositories/foremostEventIdRepository');
const TodoRepository = require('../../repositories/todoRepository');
const ScheduleRepository = require('../../repositories/scheduleEventRepository');
const requireScope = require('../../middlewares/openapi/requireScope');

const controller = new ForemostOpenController(
    new ForemostEventService(
        new ForemostEventIdRepository(),
        new TodoRepository(),
        new ScheduleRepository()
    )
);

const READ = requireScope(['read:calendar']);
const WRITE = requireScope(['write:calendar']);

router.get('/event', READ, async (req, res) => {
    await controller.getForemostEvent(req, res);
});

router.put('/event', WRITE, async (req, res) => {
    await controller.updateForemostEvent(req, res);
});

router.delete('/event', WRITE, async (req, res) => {
    await controller.removeForemostEvent(req, res);
});

module.exports = router;
