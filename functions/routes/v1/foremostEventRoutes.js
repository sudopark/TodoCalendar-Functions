
const express = require('express');
const router = express.Router();

const ForemostEventController = require('../../controllers/foremostEventController');
const ForemostEventService = require('../../services/foremostEventService');
const ForemostEventIdRepository = require('../../repositories/foremostEventIdRepository');
const TodoRepository = require('../../repositories/todoRepository');
const ScheduleRepository = require('../../repositories/scheduleEventRepository');

const foremostEventController = new ForemostEventController(
    new ForemostEventService(
        new ForemostEventIdRepository(), 
        new TodoRepository(), 
        new ScheduleRepository()
    )
)

router.get('/event', async(req, res) => {
    await foremostEventController.getForemostEvent(req, res);
});

router.put('/event', async(req, res) => {
    await foremostEventController.updateForemostEvent(req, res);
});

router.delete('/event', async(req, res) => {
    await foremostEventController.removeForemostEvent(req, res);
});

module.exports = router;