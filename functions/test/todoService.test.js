

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
            stubEventTimeRepository.shouldFailUpdateTime = false
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

    describe('update todo', () => {

        beforeEach(() => {
            todoRepository.shouldFailMakeTodo = false;
            todoRepository.shouldfailUpdateTodo = false;
            stubEventTimeRepository.shouldFailUpdateTime = false
        })

        const payload = {
            name: 'new name', 
            event_tag_id: 'new tag', 
            event_time:  {
                time_type: "at",
                timestamp: 200
            },
            repeating: {
                start: 10, 
                end: 120, 
                option: { optionType: 'every_day', interval: 3 }
            }, 
            notification_options: [
                {type_text: 'at_time'}
            ]
        }

        it('성공시 업데이트된 값 전달', async () => {
            const todo = await todoService.updateTodo('origin', payload);
            assert.equal(todo.uuid, 'origin')
            assert.equal(todo.name, 'new name')
            assert.equal(todo.event_tag_id, 'new tag')
            assert.equal(todo.event_time.time_type, 'at')
            assert.equal(todo.event_time.timestamp, 200)
            assert.equal(todo.repeating.start, 10)
            assert.equal(todo.repeating.end, 120)
            assert.equal(todo.repeating.option.optionType, 'every_day')
            assert.equal(todo.repeating.option.interval, 3)
            assert.equal(todo.notification_options[0].type_text, 'at_time')
        });

        it('기존에 있는 값 업데이트하고 값 전달 / 삭제된 값은 제거후', async () => {

            let payload2 = JSON.parse(JSON.stringify(payload));
            payload2.event_tag_id = null;

            const todo = await todoService.updateTodo('origin', payload2);
            assert.equal(todo.uuid, 'origin')
            assert.equal(todo.name, 'new name')
            assert.equal(todo.event_tag_id, null)
            assert.equal(todo.event_time.time_type, 'at')
            assert.equal(todo.event_time.timestamp, 200)
            assert.equal(todo.repeating.start, 10)
            assert.equal(todo.repeating.end, 120)
            assert.equal(todo.repeating.option.optionType, 'every_day')
            assert.equal(todo.repeating.option.interval, 3)
            assert.equal(todo.notification_options[0].type_text, 'at_time')
        });

        it('기존 todo 조회 실패시 에러', async () => {

            try {
                const todo = await todoService.updateTodo('not_exists', payload);
            } catch(error) {
                assert.equal(error != null, true)
            }
        });

        it('이벤트타임 업데이트 실패하면 에러', async () => {
            
            stubEventTimeRepository.shouldFailUpdateTime = true

            try {
                const todo = await todoService.updateTodo('origin', payload);
            } catch(error) {
                assert.equal(error != null, true)
            }
        });

        it('실패시 에러', async () => {
            
            todoRepository.shouldfailUpdateTodo = true
            
            try {
                const todo = await todoService.updateTodo('origin', payload);
            } catch(error) {
                assert.equal(error != null, true)
            }
        });
    });
})