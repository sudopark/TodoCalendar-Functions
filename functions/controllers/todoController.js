

class TodooController {

    constructor(todoService) {
        this.todoService = todoService;
    }

    async getTodo(req, res) {
        let todoId = req.params.id
        if( !todoId ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "todo name or user id is missing." 
                })
            return;
        }

        try {

            const todo = await this.todoService.findTodo(todoId);
            res.status(200)
                .send(todo)

        } catch(error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }

    async getTodos(req, res) {
        
        const userId = req.auth.uid;
        const lower = req.query.lower; const upper = req.query.upper

        if( !userId ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "user id is missing." 
                })
            return;
        }

        try {

            if(lower && upper) {
                const todos = await this.todoService.findTodos(userId, lower, upper)
                res.status(200)
                    .send(todos)
            } else {
                const currents = await this.todoService.findCurrentTodo(userId);
                res.status(200)
                    .send(currents)
            }

        } catch (error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }

    async makeTodo(req, res) {

        const { body } = req; const userId = req.auth.uid
        if(
            !body.name || !userId
        ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "todo name or user id is missing." 
                })
            return;
        }
    
        const payload = {
            userId: userId,
            name: body.name, 
            event_tag_id: body.event_tag_id, 
            event_time: body.event_time,
            repeating: body.repeating, 
            notification_options: body.notification_options
        }
        
        try { 
            const newTodo = await this.todoService.makeTodo(userId, payload)
    
            res.status(201).send(newTodo);
    
        } catch(error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }

    async putTodo(req, res) {
        const { body } = req;
        const todoId = req.params.id;
        const userId = req.auth.uid;

        if(
            !body.name || !todoId || !userId
        ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "todo name, user id or todoId is missing." 
                })
            return;
        }

        try {
            const payload = {userId: userId, ...body }
            const todo = await this.todoService.putTodo(userId, todoId, payload);
            res.status(201)
                .send(todo);

        } catch (error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }

    async patchTodo(req, res) {

        const { body } = req;
        const todoId = req.params.id;
        const userId = req.auth.uid;

        if(
            !todoId || !userId
        ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "user id or todoId is missing." 
                })
            return;
        }

        try {

            const todo = await this.todoService.updateTodo(userId, todoId, body)
            res.status(201)
                .send(todo);

        } catch (error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    };

    async completeTodo(req, res) {
        const userId = req.auth.userId;
        const originId = req.params.id;
        const origin = req.body.origin
        const nextEventTime = req.body.next_event_time
        if(
            !userId || !originId  || !origin
        ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "todoId is missing." 
                })
            return;
        }
        
        try {
            const donePayload = {userId: userId, ...origin}
            const result = await this.todoService.completeTodo(userId, originId, donePayload, nextEventTime);
            res.status(201)
                .send(result);
        } catch(error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    };

    async replaceRepeatingTodo(req, res) {
        const userId = req.auth.uid;
        const originId = req.params.id;
        const newPayload = req.body.new
        const originNextEventTime = req.body.origin_next_event_time
        if(
            !originId || !newPayload || !userId
        ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "todoId is missing." 
                })
            return;
        }

        try {
            const payload = {userId: userId, ...newPayload}
            const result = await this.todoService.replaceRepeatingTodo(originId, payload, originNextEventTime);
            res.status(201)
                .send(result)
        } catch (error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }

    async removeTodo(req, res) {
        const todoId = req.params.id;
        if( !todoId ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "todoId is missing." 
                })
            return;
        }
        try {
            await this.todoService.removeTodo(todoId);
            res.status(200)
                .send({ status: 'ok'})
        } catch (error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }
}

module.exports = TodooController;