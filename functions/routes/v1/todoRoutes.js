
const express = require("express");
const router = express.Router();
const TodoController = require("../../controllers/todoController");
const TodoService = require("../../services/todoEventService");
const EventTimeService = require("../../services/eventTimeService");
const TodoRepository = require("../../repositories/todoRepository");
const EventTimeRepository = require("../../repositories/eventTimeRepository");
const DoneTodoEventRepository = require('../../repositories/doneTodoEventRepository');

const todoRepository = new TodoRepository();
const eventTimeRepository = new EventTimeRepository();
const doneTodoRepository = new DoneTodoEventRepository();
const eventTimeService = new EventTimeService(eventTimeRepository);
const todoService = new TodoService({ todoRepository, eventTimeService, doneTodoRepository });
const todoController = new TodoController(todoService);

router.get("/todo/:id", async (req, res) => {
    todoController.getTodo(req, res);
});

router.post("/todo", async (req, res) => {
    todoController.makeTodo(req, res);
});

router.patch("/todo/:id", async (req, res) => {
    todoController.patchTodo(req, res);
});

router.post('/todo/:id/complete', async (req, res) => {
    todoController.completeTodo(req, res);
});

router.post('/todo/:id/replace', async (req, res) => {
    todoController.replaceRepeatingTodo(req, res);
});

module.exports = router;
