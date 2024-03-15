
const express = require("express");
const router = express.Router();
const TodoController = require("../../controllers/todoController");
const TodoService = require("../../services/todoEventService");
const EventTimeService = require("../../services/eventTimeService");
const TodoRepository = require("../../repositories/todoRepository");
const EventTimeRepository = require("../../repositories/eventTimeRepository");

const todoRepository = new TodoRepository();
const eventTimeRepository = new EventTimeRepository();
const eventTimeService = new EventTimeService(eventTimeRepository);
const todoService = new TodoService({ todoRepository, eventTimeService });
const todoController = new TodoController(todoService);

router.post("/todo", async (req, res) => {
    todoController.makeTodo(req, res);
});

router.patch("/todo/:id", async (req, res) => {
    todoController.patchTodo(req, res);
});

module.exports = router;
