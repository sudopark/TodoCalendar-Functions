
const express = require('express');
const router = express.Router();

const TodoOpenController = require('../../controllers/openapi/todoOpenController');
const TodoService = require('../../services/todoEventService');
const EventTimeRangeService = require('../../services/eventTimeRangeService');
const TodoRepository = require('../../repositories/todoRepository');
const EventTimeRepository = require('../../repositories/eventTimeRangeRepository');
const DoneTodoEventRepository = require('../../repositories/doneTodoEventRepository');
const SyncTimeRepository = require('../../repositories/syncTimestampRepository');
const ChangeLogRepository = require('../../repositories/dataChangeLogRepository');
const ChangeLogRecordService = require('../../services/dataChangeLogRecordService');
const EventDetailDataService = require('../../services/eventDetailService');
const EventDetailDataRepository = require('../../repositories/eventDetailRepository');
const requireScope = require('../../middlewares/openapi/requireScope');

const todoRepository = new TodoRepository();
const eventTimeRepository = new EventTimeRepository();
const doneTodoRepository = new DoneTodoEventRepository();
const eventTimeRangeService = new EventTimeRangeService(eventTimeRepository);
const changeLogRecordService = new ChangeLogRecordService(
    new SyncTimeRepository(),
    new ChangeLogRepository()
);
const eventDetailDataService = new EventDetailDataService(
    new EventDetailDataRepository(false),
    new EventDetailDataRepository(true)
);
const todoService = new TodoService({
    todoRepository,
    eventTimeRangeService,
    doneTodoRepository,
    changeLogRecordService,
    eventDetailDataService
});
const controller = new TodoOpenController(todoService);

const READ = requireScope(['read:calendar']);
const WRITE = requireScope(['write:calendar']);

router.get('/uncompleted', READ, async (req, res) => {
    await controller.getUncompletedTodos(req, res);
});

router.get('/expanded', READ, async (req, res) => {
    await controller.getExpandedTodos(req, res);
});

router.get('/:id', READ, async (req, res) => {
    await controller.getTodo(req, res);
});

router.get('/', READ, async (req, res) => {
    await controller.getTodos(req, res);
});

router.post('/', WRITE, async (req, res) => {
    await controller.makeTodo(req, res);
});

router.put('/:id', WRITE, async (req, res) => {
    await controller.putTodo(req, res);
});

router.patch('/:id', WRITE, async (req, res) => {
    await controller.patchTodo(req, res);
});

router.delete('/:id', WRITE, async (req, res) => {
    await controller.removeTodo(req, res);
});

router.post('/:id/complete', WRITE, async (req, res) => {
    await controller.completeTodo(req, res);
});

router.post('/:id/replace', WRITE, async (req, res) => {
    await controller.replaceRepeatingTodo(req, res);
});

module.exports = router;
