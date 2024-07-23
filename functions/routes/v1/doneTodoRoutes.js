
const express = require('express');
const router = express.Router();


const DoneTodoRepository = require('../../repositories/doneTodoEventRepository');
const DoneTodoService = require('../../services/doneTodoService');
const DoneTodoController = require('../../controllers/doneTodoController');
const TodoService = require("../../services/todoEventService");
const EventTimeRangeService = require("../../services/eventTimeRangeService");
const TodoRepository = require("../../repositories/todoRepository");
const EventTimeRepository = require("../../repositories/eventTimeRangeRepository");

const doneTodoRepository = new DoneTodoRepository();
const todoRepository = new TodoRepository();
const eventTimeRangeService = new EventTimeRangeService(
    new EventTimeRepository()
)
const todoService = new TodoService({todoRepository, eventTimeRangeService, doneTodoRepository});

const controller = new DoneTodoController(
    new DoneTodoService(
        doneTodoRepository, 
        todoService
    )
)

router.get('/', async (req, res) => {
    await controller.getDoneTodos(req, res);
});

router.delete('/', async (req, res) => {
    await controller.deleteDoneTodos(req, res);
});

router.post('/:id/revert', async (req, res) => {
    await controller.revertDoneTodo(req, res);
});

router.post("/cancel", async (req, res) => {
    await controller.cancelDoneTodo(req, res);
});

module.exports = router;