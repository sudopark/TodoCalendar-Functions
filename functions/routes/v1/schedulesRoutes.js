
const express = require('express');
const router = express.Router();
const ScheduleEventController = require('../../controllers/scheduleEventController');
const ScheduleEventService = require('../../services/scheduleEventService');
const EventTimeRangeService = require('../../services/eventTimeRangeService');
const ScheduleRepository = require('../../repositories/scheduleEventRepository');
const EventTimeRepository = require('../../repositories/eventTimeRangeRepository');
const SyncTimeRepository = require('../../repositories/syncTimestampRepository');
const ChangeLogRepository = require('../../repositories/dataChangeLogRepository');
const ChangeLogRecordService = require('../../services/dataChangeLogRecordService');

const scheduleRepository = new ScheduleRepository();
const eventTimeRangeService = new EventTimeRangeService(new EventTimeRepository());
const changeLogRecordService = new ChangeLogRecordService(
    new SyncTimeRepository(),  
    new ChangeLogRepository()
)
const scheduleEventService = new ScheduleEventService(scheduleRepository, eventTimeRangeService, changeLogRecordService);
const scheduleEventController = new ScheduleEventController(scheduleEventService);


router.get('/', async (req, res) => {
    await scheduleEventController.getEvents(req, res);
});

router.get('/schedule/:id', async (req, res) => {
    await scheduleEventController.getEvent(req, res);
});

router.post("/schedule", async (req, res) => {
    await scheduleEventController.makeEvent(req, res);
});

router.put('/schedule/:id', async (req, res) => {
    await scheduleEventController.putEvent(req, res);
});

router.patch('/schedule/:id', async (req, res) => {
    await scheduleEventController.patchEvent(req, res);
});

router.post('/schedule/:id/exclude', async (req, res) => {
    await scheduleEventController.makeNewEventWithExcludeFromRepeating(req, res);
});

router.post('/schedule/:id/branch_repeating', async (req, res) => {
    await scheduleEventController.branchRepeatingEvent(req, res);
});

router.patch('/schedule/:id/exclude', async (req, res) => {
    await scheduleEventController.excludeRepeatingTime(req, res);
});

router.delete('/schedule/:id', async (req, res) => {
    await scheduleEventController.removeEvent(req, res);
});

module.exports = router;