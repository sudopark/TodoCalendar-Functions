

const TodoService = require('../services/todoEventService');
const assert = require('assert');
const EventTimeService = require('../services/eventTimeService');
const StubRepos = require("./stubs/stubRepositories");


describe('TodoService', () => {
    
    
    const stubEventTimeRepository = new StubRepos.EventTime();
    const eventTimeService = new EventTimeService(stubEventTimeRepository)
    const todoRepository = new StubRepos.Todo();
    const todoService = new TodoService( { todoRepository, eventTimeService })
    
    describe('save todo', () => {

        const makePayload = {
            name: "some name"
        }

        beforeEach(() => {
            todoRepository.shouldFailMakeTodo = false;
        })

        it('success', async () => {
  
            const newTodo = await todoService.makeTodo(makePayload)
            assert.equal(newTodo.uuid, "new")
        })

        // todo 저장 실패
        it('failed', async () => {
            
            todoRepository.shouldFailMakeTodo = true;

            try {
                const newTodo = await todoService.makeTodo(makePayload)
            } catch(error) {
                assert.equal(error != null, true);
            }
        })

        // time 저장 실패하면 같이 에러
        describe("when save event time failed", () => {
            it("failed", async () => {
                
                stubEventTimeRepository.shouldFailUpdateTime = true

                try {
                    const newTodo = await todoService.makeTodo(makePayload)
                } catch(error) {
                    assert.equal(error != null, true);
                }
            })
        })
    });
})