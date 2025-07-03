

const TodoService = require('../services/todoEventService');
const assert = require('assert');
const EventTimeRangeService = require('../services/eventTimeRangeService');
const StubRepos = require("./doubles/stubRepositories");


describe('TodoService', () => {
    
    
    const stubEventTimeRepository = new StubRepos.EventTime();
    const eventTimeRangeService = new EventTimeRangeService(stubEventTimeRepository)
    const todoRepository = new StubRepos.Todo();
    const doneTodoRepository = new StubRepos.DoneTodo();
    const todoService = new TodoService( { todoRepository, eventTimeRangeService, doneTodoRepository })

    
    describe('save todo', () => {

        const makePayload = {
            name: "some name"
        }

        beforeEach(() => {
            todoRepository.shouldFailMakeTodo = false;
            stubEventTimeRepository.shouldFailUpdateTime = false
        })

        it('success - current todo', async () => {
            const newTodo = await todoService.makeTodo('uid', makePayload)
            assert.equal(newTodo.uuid, "new")
            assert.equal(newTodo.is_current, true)
        })

        it('success - not current todo', async () => {
            let payload2 = {...makePayload}
            payload2.event_time = { time_type: 'at', timestamp: 100 }
            const newTodo = await todoService.makeTodo('uid', payload2)
            assert.equal(newTodo.uuid, "new")
            assert.equal(newTodo.is_current, null)
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

    describe('put todo', () => {

        beforeEach(() => {
            todoRepository.shouldFailPutTodo = false;
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
            const todo = await todoService.putTodo('uid', 'origin', payload);
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
            assert.equal(todo.is_current, null)
        });

        it('성공시 업데이트된 값 전달 - current 로 변경', async () => {
            let payload2 = JSON.parse(JSON.stringify(payload))
            payload2.event_time = null
            const todo = await todoService.putTodo('uid', 'origin', payload2);
            assert.equal(todo.uuid, 'origin')
            assert.equal(todo.name, 'new name')
            assert.equal(todo.event_tag_id, 'new tag')
            assert.equal(todo.event_time, null)
            assert.equal(todo.repeating.start, 10)
            assert.equal(todo.repeating.end, 120)
            assert.equal(todo.repeating.option.optionType, 'every_day')
            assert.equal(todo.repeating.option.interval, 3)
            assert.equal(todo.notification_options[0].type_text, 'at_time')
            assert.equal(todo.is_current, true)
        });

        it('기존에 있는 값 업데이트하고 값 전달 / 삭제된 값은 제거후', async () => {

            let payload2 = JSON.parse(JSON.stringify(payload));
            payload2.event_tag_id = null;

            const todo = await todoService.putTodo('uid', 'origin', payload2);
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

        it('이벤트타임 업데이트 실패하면 에러', async () => {
            
            stubEventTimeRepository.shouldFailUpdateTime = true

            try {
                const todo = await todoService.putTodo('uid', 'origin', payload);
            } catch(error) {
                assert.equal(error != null, true)
            }
        });

        it('실패시 에러', async () => {
            
            todoRepository.shouldFailPutTodo = true
            
            try {
                const todo = await todoService.putTodo('uid', 'origin', payload);
            } catch(error) {
                assert.equal(error != null, true)
            }
        });
    })

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
            assert.equal(todo.is_current, false)
        });

        it('성공시 업데이트된 값 전달 - eventTime 업데이트 안하면 is_current 세팅 안함', async () => {
            let payload2 = JSON.parse(JSON.stringify(payload))
            payload2.event_time = null
            const todo = await todoService.updateTodo('uid', 'origin', payload2);
            assert.equal(todo.uuid, 'origin')
            assert.equal(todo.name, 'new name')
            assert.equal(todo.event_tag_id, 'new tag')
            assert.equal(todo.event_time, null)
            assert.equal(todo.repeating.start, 10)
            assert.equal(todo.repeating.end, 120)
            assert.equal(todo.repeating.option.optionType, 'every_day')
            assert.equal(todo.repeating.option.interval, 3)
            assert.equal(todo.notification_options[0].type_text, 'at_time')
            assert.equal(todo.is_current, null)
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

    describe('complete todo', () => {

        beforeEach(() => {
            stubEventTimeRepository.shouldFailUpdateTime = false
            stubEventTimeRepository.didRemovedEventId = null
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
            assert.equal(stubEventTimeRepository.didRemovedEventId, null)
        });
        
        it('origin 다음 반본시간 없는경우 기존 todo 삭제', async () => {
            const result = await todoService.completeTodo('uid', 'origin', originPayload);
            assert.equal(result.done.name, 'done')
            assert.equal(result.next_repeating == null, true)
            assert.equal(todoRepository.removedTodoId, 'origin')
            assert.equal(stubEventTimeRepository.didRemovedEventId, 'origin')
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
            stubEventTimeRepository.didRemovedEventId = null
            todoRepository.shouldfailUpdateTodo = false
            todoRepository.shouldFailMakeTodo = false
            todoRepository.removedTodoId = null
        })

        const newPayload = { name: 'replaced' }

        it('다음 반복이벤트 있는 경우에 기존 todo 업데이트', async () => {
            const nextTime = { time_type: 'at', timestamp: 100 }    
            const result = await todoService.replaceRepeatingTodo('uid', 'origin', newPayload, nextTime)
            assert.equal(result.new_todo.name, 'replaced')
            assert.equal(result.next_repeating.uuid, 'origin')
            assert.equal(result.next_repeating.event_time.time_type, 'at')
            assert.equal(result.next_repeating.event_time.timestamp, 100)
            assert.equal(todoRepository.removedTodoId, null)
            assert.equal(stubEventTimeRepository.didRemovedEventId, null)
        }); 

        it('다음 반복이벤트 없는 경우에 기존 todo 삭제', async () => {
            const result = await todoService.replaceRepeatingTodo('uid', 'origin', newPayload)
            assert.equal(result.new_todo.name, 'replaced')
            assert.equal(result.next_repeating == null, true)
            assert.equal(todoRepository.removedTodoId, 'origin')
            assert.equal(stubEventTimeRepository.didRemovedEventId, 'origin')
        });

        it('교체 실패', async () => {
            todoRepository.shouldFailMakeTodo = true
            try {
                const result = await todoService.replaceRepeatingTodo('uid', 'origin', newPayload);
            } catch (error) {
                assert.equal(error != null, true)
            }
        });
    })

    describe('remove todo', () => {

        before(() => {
            todoRepository.didRemovedEventId = null
            stubEventTimeRepository.didRemovedEventId = null
        })

        it('이벤트 시간이랑 같이 삭제', async () => {

            const result = await todoService.removeTodo('some');
            assert.equal(result.status, 'ok')
            assert.equal(todoRepository.removedTodoId, 'some')
            assert.equal(stubEventTimeRepository.didRemovedEventId, 'some')
        })
    })

    describe('remove todo with tagId', () => {

        beforeEach(() => {
            stubEventTimeRepository.removeIds = null;
            todoRepository.spyEventMap = new Map()
            todoRepository.spyEventMap.set(
                'todo_without_tag', {uuid: 'todo_without_tag'}
            )
            todoRepository.spyEventMap.set(
                'todo_with_tag1', {uuid: 'todo_with_tag1', event_tag_id: 'tag1'}
            )
            todoRepository.spyEventMap.set(
                'todo_with_tag2', {uuid: 'todo_with_tag2', event_tag_id: 'tag2'}
            )
            todoRepository.spyEventMap.set(
                'todo_with_tag1_1', {uuid: 'todo_with_tag1_1', event_tag_id: 'tag1'}
            )
        })

        it('tagId에 해당하는 todo 삭제', async () => {
            
            const ids = await todoService.removeAllTodoWithTagId('tag1')
            const todoAfterRemoveIds = [...todoRepository.spyEventMap].map(([k, v]) => k)
            assert.deepEqual(ids, ['todo_with_tag1', 'todo_with_tag1_1'])
            assert.deepEqual(todoAfterRemoveIds, ['todo_without_tag', 'todo_with_tag2'])
            assert.deepEqual(stubEventTimeRepository.removeIds, ['todo_with_tag1', 'todo_with_tag1_1'])
        })
    })

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

    describe('find current todos', () => {

        it('조회 성공', async () => {
            const todos = await todoService.findCurrentTodo('some')
            assert.equal(todos.length, 2)
        })
    });

    describe('find todos in range', () => {

        it('조회 성공', async () => {
            const todos = await todoService.findTodos('some', 0, 10)
            assert.equal(todos.length, 10)
        })

        it('30개 이상인 경우도 조회성공', async () => {
            const todos = await todoService.findTodos('some', 0, 100)
            assert.equal(todos.length, 100)
        })
    })

    describe('find uncompleted todos', () => {

        beforeEach(() => {
            stubEventTimeRepository.uncompletedEventIdsMocking = ['t1', 't2']
        })

        it('조회 성공', async () => {
            const todos = await todoService.findUncompletedTodos('owner', 100)
            const ids = todos.map(t => t.uuid)
            assert.deepEqual(ids, ['t1', 't2'])
        })

        it('데이터 없는 경우에도 조회 성공', async () => {
            stubEventTimeRepository.uncompletedEventIdsMocking = []
            const todos = await todoService.findUncompletedTodos('owner', 100)
            const ids = todos.map(t => t.uuid)
            assert.deepEqual(ids, [])
        })

        it('30개 이상인 경우에도 성공', async () => {
            const ids = Array.from(Array(100).keys()).map(int => `t${int}`)
            stubEventTimeRepository.uncompletedEventIdsMocking = ids
            
            const todos = await todoService.findUncompletedTodos('owner', 100)
            const todoIds = todos.map(t => t.uuid)
            assert.deepEqual(todoIds, ids)
        })
    })
})