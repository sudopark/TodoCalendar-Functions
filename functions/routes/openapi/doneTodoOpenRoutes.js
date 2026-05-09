
const express = require('express');
const router = express.Router();

const DoneTodoOpenController = require('../../controllers/openapi/doneTodoOpenController');
const DoneTodoRepository = require('../../repositories/doneTodoEventRepository');
const DoneTodoService = require('../../services/doneTodoService');
const TodoService = require('../../services/todoEventService');
const TodoRepository = require('../../repositories/todoRepository');
const EventTimeRangeService = require('../../services/eventTimeRangeService');
const EventTimeRepository = require('../../repositories/eventTimeRangeRepository');
const SyncTimeRepository = require('../../repositories/syncTimestampRepository');
const ChangeLogRepository = require('../../repositories/dataChangeLogRepository');
const ChangeLogRecordService = require('../../services/dataChangeLogRecordService');
const EventDetailService = require('../../services/eventDetailService');
const EventDetailRepository = require('../../repositories/eventDetailRepository');
const requireScope = require('../../middlewares/openapi/requireScope');

const doneTodoRepository = new DoneTodoRepository();
const todoRepository = new TodoRepository();
const eventTimeRangeService = new EventTimeRangeService(new EventTimeRepository());
const changeLogRecordService = new ChangeLogRecordService(
    new SyncTimeRepository(),
    new ChangeLogRepository()
);
const todoService = new TodoService({
    todoRepository,
    eventTimeRangeService,
    doneTodoRepository,
    changeLogRecordService
});
const eventDetailService = new EventDetailService(
    new EventDetailRepository(false),
    new EventDetailRepository(true)
);
const doneTodoService = new DoneTodoService(
    doneTodoRepository,
    todoService,
    eventDetailService
);
const controller = new DoneTodoOpenController(doneTodoService);

const READ = requireScope(['read:calendar']);
const WRITE = requireScope(['write:calendar']);

router.get('/', READ, async (req, res) => {
    await controller.getDoneTodos(req, res);
});

router.get('/:id', READ, async (req, res) => {
    await controller.getDoneTodo(req, res);
});

router.put('/:id', WRITE, async (req, res) => {
    await controller.putDoneTodo(req, res);
});

router.delete('/:id', WRITE, async (req, res) => {
    await controller.deleteDoneTodo(req, res);
});

router.post('/:id/revert', WRITE, async (req, res) => {
    await controller.revertDoneTodo(req, res);
});

module.exports = router;
