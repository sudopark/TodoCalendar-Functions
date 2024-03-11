

const TodoService = require('../services/todoEventService');
const assert = require('assert');
const EventTimeService = require('../services/eventTimeService');
const StubRepos = require("./stubs/stubRepositories");


describe('TodoService', () => {
    
    
    const stubEventTimeRepository = new StubRepos.EventTime();
    const eventTimeService = new EventTimeService(stubEventTimeRepository)
    const todoRepository = new StubRepos.Todo();
    const todoService = new TodoService( { todoRepository, eventTimeService })
    
    it('save todo', async () => {

        const makePayload = {
            name: "some name"
        }  
        const newTodo = await todoService.makeTodo(makePayload)
        assert.equal(newTodo.uuid, "new")
    })

    // todo 저장 실패

    // time 저장 실패하면 같이 에러
})