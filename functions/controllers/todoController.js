

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
            console.log(error)
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
            const newTodo = await this.todoService.makeTodo(payload)
    
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

    async patchTodo(req, res) {

        const { body } = req;
        const todoId = req.params.id;

        if(
            !body.name || !todoId
        ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "todo name, user id or todoId is missing." 
                })
            return;
        }

        try {
            const payload = {
                name: body.name, 
                event_tag_id: body.event_tag_id, 
                event_time: body.event_time, 
                repeating: body.repeating, 
                notification_options: body.notification_options
            }
            
            const todo = await this.todoService.updateTodo(todoId, payload)
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
}

module.exports = TodooController;