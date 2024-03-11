
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

// TODO: 일단은 api 호출시 명시적으로 userId 받도록
// router.get("/:id", async (req, res, next) => {
//     try {

//         // const snapshot = await admin.firestore()
//         //     .collection('todos')
//         //     .where('user_id', '==', req.params.id)
//         //     .get();

//         // let todos = snapshot.docs
//         //     .map(doc => ({id: doc.id, ...doc.data()}) );
    
//         // res.status(200).send(JSON.stringify(todos));

//         let todos = try todoController.getAllTodo(res, res, next)

//     } catch(error) {
//         next(error);
//     }
// });
// router.get("/", todoController.getAllTodo);

// router로 makeTodo 함수를 전달해서 사용하기 때문에 호출될때 this(context)가 사라질수있음
// 이렇게 함수 호출을 래핑하거나, 객체 내부에서 메서드 바인딍 해줘야함
router.post("/todo", async (req, res) => {
    todoController.makeTodo(req, res);
});

// router.patch("/todo/:uuid", todoController.updateTodo);

// router.patch("/:id", validateToken, async (req, res, next) => {

//     try {
//         let params = req.body;

//         let ref = admin.firestore().collection("todos").doc(req.params.id);

//         const origin = await ref.get().data()
        
//         const updateJson = {
//             name: params.name != null ? params.name : origin.name,
//             user_id: req.user.uid,
//             event_tag_id: params.event_tag_id, 
//             event_time: params.event_time,
//             repeating: params.repeating,
//             notification_options: params.notification_options != null 
//                 ? params.notification_options : origin.notification_options
//         }
//         const eventTime = new EventTime(params.event_time, params.repeating)

//         await admin.firestore()
//             .collection('todos')
//             .doc(req.params.id)
//             .set(updateJson, { merge: false })

//         await admin.firestore()
//             .collection("event_times")
//             .doc(req.params.id)
//             .set(eventTime.toJSON(), { merge: false })

//         const todo = await ref.get()

//         res.status(201).send(
//             JSON.stringify({uuid: todo.id, ...todo.data()})
//         );

//     } catch (error) {
//         next(error);
//     }
// });

module.exports = router;
