

const TodoService = require('../services/todoEventService');
const assert = require('assert');
const EventTimeService = require('../services/eventTimeService');
const StubRepos = require("./stubs/stubRepositories");


describe('TodoService', () => {
    
    
    const stubEventTimeRepository = new StubRepos.EventTime();
    const eventTimeService = new EventTimeService(stubEventTimeRepository)
    const todoRepository = new StubRepos.Todo();
    const doneTodoRepository = new StubRepos.DoneTodo();
    const todoService = new TodoService( { todoRepository, eventTimeService, doneTodoRepository })

    
    describe('save todo', () => {

        const makePayload = {
            name: "some name"
        }

        beforeEach(() => {
            todoRepository.shouldFailMakeTodo = false;
            stubEventTimeRepository.shouldFailUpdateTime = false
        })

        it('success', async () => {
  
            const newTodo = await todoService.makeTodo('uid', makePayload)
            assert.equal(newTodo.uuid, "new")
        })

        // todo 저장 실패
        it('failed', async () => {
            
            todoRepository.shouldFailMakeTodo = true;

            try {
                const newTodo = await todoService.makeTodo('uid', makePayload)
            } catch(error) {
                assert.equal(error != null, true);
            }
        })

        // time 저장 실패하면 같이 에러
        describe("when save event time failed", () => {
            it("failed", async () => {
                
                stubEventTimeRepository.shouldFailUpdateTime = true

                try {
                    const newTodo = await todoService.makeTodo('uid', makePayload)
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
            const todo = await todoService.updateTodo('uid', 'origin', payload);
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

            const todo = await todoService.updateTodo('uid', 'origin', payload2);
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
                const todo = await todoService.updateTodo('uid', 'not_exists', payload);
            } catch(error) {
                assert.equal(error != null, true)
            }
        });

        it('이벤트타임 업데이트 실패하면 에러', async () => {
            
            stubEventTimeRepository.shouldFailUpdateTime = true

            try {
                const todo = await todoService.updateTodo('uid', 'origin', payload);
            } catch(error) {
                assert.equal(error != null, true)
            }
        });

        it('실패시 에러', async () => {
            
            todoRepository.shouldfailUpdateTodo = true
            
            try {
                const todo = await todoService.updateTodo('uid', 'origin', payload);
            } catch(error) {
                assert.equal(error != null, true)
            }
        });
    });

    describe('find todo', () => {

        it('조회 성공', async () => {
            const todo = await todoService.findTodo("origin")
            assert.equal(todo.name, 'old_name')
        });

        it('조회 실패', async () => {
            try {
                await todoService.findTodo('not exists');;
            } catch(error) {
                assert.equal(error != null, true)
            }
        });
    });

    describe('complete todo', () => {

        beforeEach(() => {
            stubEventTimeRepository.shouldFailUpdateTime = false
            todoRepository.shouldfailUpdateTodo = false
            doneTodoRepository.shouldFailSave = false
            todoRepository.removedTodoId = null
        })

        const originPayload = { name: 'done' }

        it('origin 다음 반복 시간 있으면 기존 todo update', async () => {
            
            const nextTime = { time_type: 'at', timestamp: 100 }    
            const result = await todoService.completeTodo('uid', 'origin', originPayload, nextTime)
            assert.equal(result.done.name, 'done')
            assert.equal(result.next_repeating.uuid, 'origin')
            assert.equal(result.next_repeating.event_time.time_type, 'at')
            assert.equal(result.next_repeating.event_time.timestamp, 100)
            assert.equal(todoRepository.removedTodoId, null)
        });
        
        it('origin 다음 반본시간 없는경우 기존 todo 삭제', async () => {
            const result = await todoService.completeTodo('uid', 'origin', originPayload);
            assert.equal(result.done.name, 'done')
            assert.equal(result.next_repeating == null, true)
            assert.equal(todoRepository.removedTodoId, 'origin')
        });

        it('완료 실패', async () => {
            doneTodoRepository.shouldFailSave = true
            try {
                const result = await todoService.completeTodo('uid', 'origin', originPayload)
            } catch (error) {
                assert.equal(error != null, true)
            }
        })
    })

    describe('replace repeating todo', () => {

        beforeEach(() => {
            stubEventTimeRepository.shouldFailUpdateTime = false
            todoRepository.shouldfailUpdateTodo = false
            todoRepository.shouldFailMakeTodo = false
            todoRepository.removedTodoId = null
        })

        const newPayload = { name: 'replaced' }

        it('다음 반복이벤트 있는 경우에 기존 todo 업데이트', async () => {
            const nextTime = { time_type: 'at', timestamp: 100 }    
            const result = await todoService.replaceReaptingTodo('uid', 'origin', newPayload, nextTime)
            assert.equal(result.new_todo.name, 'replaced')
            assert.equal(result.next_repeating.uuid, 'origin')
            assert.equal(result.next_repeating.event_time.time_type, 'at')
            assert.equal(result.next_repeating.event_time.timestamp, 100)
            assert.equal(todoRepository.removedTodoId, null)
        }); 

        it('다음 반복이벤트 없는 경우에 기존 todo 삭제', async () => {
            const result = await todoService.replaceReaptingTodo('uid', 'origin', newPayload)
            assert.equal(result.new_todo.name, 'replaced')
            assert.equal(result.next_repeating == null, true)
            assert.equal(todoRepository.removedTodoId, 'origin')
        });

        it('교체 실패', async () => {
            todoRepository.shouldFailMakeTodo = true
            try {
                const result = await todoService.replaceReaptingTodo('uid', 'origin', newPayload);
            } catch (error) {
                assert.equal(error != null, true)
            }
        });
    })
})