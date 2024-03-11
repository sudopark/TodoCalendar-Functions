

class TodooController {

    constructor(todoService) {
        this.todoService = todoService;
    }

    async makeTodo(req, res) {

        const { body } = req; const userId = req.user.uid
        if(
            !body.name ||
            !userId
        ) {
            res
                .status(400)
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
            let newTodo = await this.todoService.makeTodo(payload)
    
            res.status(201).send(newTodo);
    
        } catch(error) {
            console.log(error)
            res
                .status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }
}

module.exports = TodooController;