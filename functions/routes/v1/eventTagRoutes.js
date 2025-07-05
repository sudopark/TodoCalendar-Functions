
const express = require('express');
const router = express.Router();

const EventTagRepository = require('../../repositories/eventTagRepository');
const EventTagService = require('../../services/eventTagService');
const EventTagController = require('../../controllers/eventTagController');
const EventTimeService = require('../../services/eventTimeRangeService');
const EventTimeRepository = require('../../repositories/eventTimeRangeRepository');
const TodoService = require('../../services/todoEventService');
const TodoRepository = require('../../repositories/todoRepository');
const ScheduleService = require('../../services/scheduleEventService');
const ScheduleRepository = require('../../repositories/scheduleEventRepository');
const DoneTodoEventRepository = require('../../repositories/doneTodoEventRepository');
const SyncTimestampRepository = require('../../repositories/syncTimestampRepository');
const ChangeLogRepository = require('../../repositories/dataChangeLogRepository');
const ChangeLogRecordService = require('../../services/dataChangeLogRecordService');

const todoRepository = new TodoRepository();
const eventTimeRepository = new EventTimeRepository();
const eventTimeRangeService = new EventTimeService(eventTimeRepository);
const doneTodoRepository = new DoneTodoEventRepository();
const scheduleRepository = new ScheduleRepository();
const changeLogRecordService = new ChangeLogRecordService(
    new SyncTimestampRepository(), 
    new ChangeLogRepository()
)

const controller = new EventTagController(
    new EventTagService(
        new EventTagRepository(), 
        changeLogRecordService
    ), 
    new TodoService({todoRepository, eventTimeRangeService, doneTodoRepository, changeLogRecordService}), 
    new ScheduleService(scheduleRepository, eventTimeRangeService, changeLogRecordService)
)

router.post('/tag', async (req, res) => {
    await controller.postEventTag(req, res);
});

router.put('/tag/:id', async (req, res) => {
    await controller.putEventTag(req, res);
});

router.delete('/tag/:id', async (req, res) => {
    await controller.deleteTag(req, res);
});

router.delete('/tag_and_events/:id', async (req, res) => {
    await controller.deleteTagAndEvents(req, res);
})

router.get('/all', async (req, res) => {
    await controller.getAllTags(req, res);
});

router.get('/', async (req, res) => {
    await controller.getTags(req, res);
});

module.exports = router;