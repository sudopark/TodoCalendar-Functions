
const express = require("express");
const router = express.Router();
const TodoController = require("../../controllers/todoController");
const TodoService = require("../../services/todoEventService");
const EventTimeRangeService = require("../../services/eventTimeRangeService");
const TodoRepository = require("../../repositories/todoRepository");
const EventTimeRepository = require("../../repositories/eventTimeRangeRepository");
const DoneTodoEventRepository = require('../../repositories/doneTodoEventRepository');

const todoRepository = new TodoRepository();
const eventTimeRepository = new EventTimeRepository();
const doneTodoRepository = new DoneTodoEventRepository();
const eventTimeRangeService = new EventTimeRangeService(eventTimeRepository);
const todoService = new TodoService({ todoRepository, eventTimeRangeService, doneTodoRepository });
const todoController = new TodoController(todoService);

router.get("/todo/:id", async (req, res) => {
    await todoController.getTodo(req, res);
});

router.get('/', async (req, res) => {
    await todoController.getTodos(req, res);
});

router.post("/todo", async (req, res) => {
    await todoController.makeTodo(req, res);
});

router.put("/todo/:id", async (req, res) => {
    await todoController.putTodo(req, res);
});

router.patch("/todo/:id", async (req, res) => {
    await todoController.patchTodo(req, res);
});

router.post('/todo/:id/complete', async (req, res) => {
    await todoController.completeTodo(req, res);
});

router.post('/todo/:id/replace', async (req, res) => {
    await todoController.replaceRepeatingTodo(req, res);
});

router.delete('/todo/:id', async (req, res) => {
    await todoController.removeTodo(req, res);
})

module.exports = router;
