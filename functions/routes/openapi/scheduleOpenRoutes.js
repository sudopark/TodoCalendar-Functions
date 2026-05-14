
const express = require('express');
const router = express.Router();

const ScheduleOpenController = require('../../controllers/openapi/scheduleOpenController');
const ScheduleEventService = require('../../services/scheduleEventService');
const EventTimeRangeService = require('../../services/eventTimeRangeService');
const ScheduleRepository = require('../../repositories/scheduleEventRepository');
const EventTimeRepository = require('../../repositories/eventTimeRangeRepository');
const SyncTimeRepository = require('../../repositories/syncTimestampRepository');
const ChangeLogRepository = require('../../repositories/dataChangeLogRepository');
const ChangeLogRecordService = require('../../services/dataChangeLogRecordService');
const EventDetailRepository = require('../../repositories/eventDetailRepository');
const EventDetailService = require('../../services/eventDetailService');
const requireScope = require('../../middlewares/openapi/requireScope');

const scheduleRepository = new ScheduleRepository();
const eventTimeRangeService = new EventTimeRangeService(new EventTimeRepository());
const changeLogRecordService = new ChangeLogRecordService(
    new SyncTimeRepository(),
    new ChangeLogRepository()
);
const eventDetailService = new EventDetailService(
    new EventDetailRepository(false),
    new EventDetailRepository(true)
);
const scheduleEventService = new ScheduleEventService(
    scheduleRepository,
    eventTimeRangeService,
    changeLogRecordService,
    eventDetailService
);
const controller = new ScheduleOpenController(scheduleEventService);

const READ = requireScope(['read:calendar']);
const WRITE = requireScope(['write:calendar']);

router.get('/', READ, async (req, res) => {
    await controller.getEvents(req, res);
});

router.get('/:id', READ, async (req, res) => {
    await controller.getEvent(req, res);
});

router.post('/', WRITE, async (req, res) => {
    await controller.makeEvent(req, res);
});

router.put('/:id', WRITE, async (req, res) => {
    await controller.putEvent(req, res);
});

router.patch('/:id/exclude', WRITE, async (req, res) => {
    await controller.excludeRepeatingTime(req, res);
});

router.patch('/:id', WRITE, async (req, res) => {
    await controller.patchEvent(req, res);
});

router.delete('/:id', WRITE, async (req, res) => {
    await controller.removeEvent(req, res);
});

router.post('/:id/exclude', WRITE, async (req, res) => {
    await controller.makeNewEventWithExcludeFromRepeating(req, res);
});

router.post('/:id/branch_repeating', WRITE, async (req, res) => {
    await controller.branchRepeatingEvent(req, res);
});

module.exports = router;
