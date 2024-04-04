
const express = require('express');
const router = express.Router();
const ScheduleEventController = require('../../controllers/scheduleEventController');
const ScheduleEventService = require('../../services/scheduleEventService');
const EventTimeRangeService = require('../../services/eventTimeRangeService');
const ScheduleRepository = require('../../repositories/scheduleEventRepository');
const EventTimeRepository = require('../../repositories/eventTimeRangeRepository');

const scheduleRepository = new ScheduleRepository();
const eventTimeRangeService = new EventTimeRangeService(new EventTimeRepository());
const scheduleEventService = new ScheduleEventService(scheduleRepository, eventTimeRangeService);
const scheduleEventController = new ScheduleEventController(scheduleEventService);


router.get('/', async (req, res) => {
    scheduleEventController.getEvents(req, res);
});

router.get('/schedule/:id', async (req, res) => {
    scheduleEventController.getEvent(req, res);
});

router.post("/schedule", async (req, res) => {
    scheduleEventController.makeEvent(req, res);
});

router.put('/schedule/:id', async (req, res) => {
    scheduleEventController.putEvent(req, res);
});

router.patch('/schedule/:id', async (req, res) => {
    scheduleEventController.patchEvent(req, res);
});

router.post('/schedule/:id/exclude', async (req, res) => {
    scheduleEventController.excludeRepeatingTime(req, res);
});

router.delete('/schedule/:id', async (req, res) => {
    scheduleEventController.removeEvent(req, res);
});

module.exports = router;