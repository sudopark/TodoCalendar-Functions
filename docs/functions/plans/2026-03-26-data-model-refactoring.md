# Data Model Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace plain JSON objects with dedicated model classes for all domain entities, applied incrementally per domain.

**Architecture:** Create model classes in `functions/models/` with `toJSON()` (always) and `fromData()` (where needed). Shared structures (`EventTime`, `Repeating`) are standalone files. Each domain is a separate commit touching controller, service, repository, and tests.

**Tech Stack:** Node.js 20, Firebase Cloud Functions, Mocha + Chai assert

---

### Task 1: Create EventTime model

**Files:**
- Create: `functions/models/EventTime.js`
- Test: `functions/test/models/EventTime.test.js`

- [ ] **Step 1: Write EventTime test**

```js
// functions/test/models/EventTime.test.js
const assert = require('assert');
const EventTime = require('../../models/EventTime');

describe('EventTime', () => {

    describe('fromData', () => {
        it('returns null for null/undefined', () => {
            assert.equal(EventTime.fromData(null), null);
            assert.equal(EventTime.fromData(undefined), null);
        });

        it('creates at type', () => {
            const et = EventTime.fromData({ time_type: 'at', timestamp: 100 });
            assert.equal(et.time_type, 'at');
            assert.equal(et.timestamp, 100);
        });

        it('creates period type', () => {
            const et = EventTime.fromData({ time_type: 'period', period_start: 10, period_end: 20 });
            assert.equal(et.time_type, 'period');
            assert.equal(et.period_start, 10);
            assert.equal(et.period_end, 20);
        });

        it('creates allday type', () => {
            const et = EventTime.fromData({ time_type: 'allday', period_start: 10, period_end: 20, seconds_from_gmt: 3600 });
            assert.equal(et.time_type, 'allday');
            assert.equal(et.seconds_from_gmt, 3600);
        });
    });

    describe('toJSON', () => {
        it('serializes at type', () => {
            const et = new EventTime({ time_type: 'at', timestamp: 100 });
            const json = et.toJSON();
            assert.deepEqual(json, { time_type: 'at', timestamp: 100 });
        });

        it('serializes period type', () => {
            const et = new EventTime({ time_type: 'period', period_start: 10, period_end: 20 });
            const json = et.toJSON();
            assert.deepEqual(json, { time_type: 'period', period_start: 10, period_end: 20 });
        });

        it('serializes allday type', () => {
            const et = new EventTime({ time_type: 'allday', period_start: 10, period_end: 20, seconds_from_gmt: 3600 });
            const json = et.toJSON();
            assert.deepEqual(json, { time_type: 'allday', period_start: 10, period_end: 20, seconds_from_gmt: 3600 });
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && npx mocha test/models/EventTime.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: Write EventTime implementation**

```js
// functions/models/EventTime.js

class EventTime {
    constructor({ time_type, timestamp, period_start, period_end, seconds_from_gmt }) {
        this.time_type = time_type;
        this.timestamp = timestamp;
        this.period_start = period_start;
        this.period_end = period_end;
        this.seconds_from_gmt = seconds_from_gmt;
    }

    static fromData(data) {
        if (!data) return null;
        return new EventTime(data);
    }

    toJSON() {
        const json = { time_type: this.time_type };
        if (this.time_type === 'at') {
            json.timestamp = this.timestamp;
        } else {
            json.period_start = this.period_start;
            json.period_end = this.period_end;
            if (this.time_type === 'allday') {
                json.seconds_from_gmt = this.seconds_from_gmt;
            }
        }
        return json;
    }
}

module.exports = EventTime;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd functions && npx mocha test/models/EventTime.test.js`
Expected: PASS (all 6 tests)

---

### Task 2: Create Repeating model

**Files:**
- Create: `functions/models/Repeating.js`
- Test: `functions/test/models/Repeating.test.js`

- [ ] **Step 1: Write Repeating test**

```js
// functions/test/models/Repeating.test.js
const assert = require('assert');
const Repeating = require('../../models/Repeating');

describe('Repeating', () => {

    describe('fromData', () => {
        it('returns null for null/undefined', () => {
            assert.equal(Repeating.fromData(null), null);
            assert.equal(Repeating.fromData(undefined), null);
        });

        it('creates with start, end, option', () => {
            const r = Repeating.fromData({ start: 10, end: 120, option: { optionType: 'every_day', interval: 3 } });
            assert.equal(r.start, 10);
            assert.equal(r.end, 120);
            assert.deepEqual(r.option, { optionType: 'every_day', interval: 3 });
        });

        it('creates with end_count', () => {
            const r = Repeating.fromData({ start: 10, end_count: 5, option: { optionType: 'every_day' } });
            assert.equal(r.end_count, 5);
            assert.equal(r.end, undefined);
        });
    });

    describe('toJSON', () => {
        it('serializes with end', () => {
            const r = new Repeating({ start: 10, end: 120, option: { optionType: 'every_day' } });
            const json = r.toJSON();
            assert.deepEqual(json, { start: 10, end: 120, option: { optionType: 'every_day' } });
        });

        it('serializes with end_count', () => {
            const r = new Repeating({ start: 10, end_count: 5, option: { optionType: 'every_day' } });
            const json = r.toJSON();
            assert.deepEqual(json, { start: 10, end_count: 5, option: { optionType: 'every_day' } });
        });

        it('omits null end and end_count', () => {
            const r = new Repeating({ start: 10, option: { optionType: 'every_day' } });
            const json = r.toJSON();
            assert.deepEqual(json, { start: 10, option: { optionType: 'every_day' } });
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && npx mocha test/models/Repeating.test.js`
Expected: FAIL

- [ ] **Step 3: Write Repeating implementation**

```js
// functions/models/Repeating.js

class Repeating {
    constructor({ start, end, end_count, option }) {
        this.start = start;
        this.end = end;
        this.end_count = end_count;
        this.option = option;
    }

    static fromData(data) {
        if (!data) return null;
        return new Repeating(data);
    }

    toJSON() {
        const json = { start: this.start, option: this.option };
        if (this.end != null) json.end = this.end;
        if (this.end_count != null) json.end_count = this.end_count;
        return json;
    }
}

module.exports = Repeating;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd functions && npx mocha test/models/Repeating.test.js`
Expected: PASS

- [ ] **Step 5: Commit EventTime + Repeating**

```bash
git add functions/models/EventTime.js functions/models/Repeating.js functions/test/models/EventTime.test.js functions/test/models/Repeating.test.js
git commit -m "[#95] EventTime, Repeating 모델 클래스 추가"
```

---

### Task 3: Create Todo model

**Files:**
- Create: `functions/models/Todo.js`
- Test: `functions/test/models/Todo.test.js`

- [ ] **Step 1: Write Todo test**

```js
// functions/test/models/Todo.test.js
const assert = require('assert');
const Todo = require('../../models/Todo');

describe('Todo', () => {

    const fullData = {
        userId: 'uid',
        name: 'test todo',
        event_tag_id: 'tag1',
        event_time: { time_type: 'at', timestamp: 100 },
        repeating: { start: 10, end: 120, option: { optionType: 'every_day', interval: 3 } },
        notification_options: [{ type_text: 'at_time' }],
        is_current: false,
        create_timestamp: 1000,
        repeating_turn: 2
    };

    describe('fromData', () => {
        it('creates from uuid and data', () => {
            const todo = Todo.fromData('todo1', fullData);
            assert.equal(todo.uuid, 'todo1');
            assert.equal(todo.name, 'test todo');
            assert.equal(todo.event_time.time_type, 'at');
            assert.equal(todo.event_time.timestamp, 100);
            assert.equal(todo.repeating.start, 10);
            assert.equal(todo.repeating.end, 120);
            assert.equal(todo.repeating.option.optionType, 'every_day');
            assert.deepEqual(todo.notification_options, [{ type_text: 'at_time' }]);
            assert.equal(todo.repeating_turn, 2);
        });

        it('handles missing optional fields', () => {
            const todo = Todo.fromData('todo1', { name: 'simple' });
            assert.equal(todo.uuid, 'todo1');
            assert.equal(todo.name, 'simple');
            assert.equal(todo.event_time, null);
            assert.equal(todo.repeating, null);
            assert.equal(todo.notification_options, undefined);
        });
    });

    describe('toJSON', () => {
        it('serializes all fields', () => {
            const todo = Todo.fromData('todo1', fullData);
            const json = todo.toJSON();
            assert.equal(json.uuid, 'todo1');
            assert.equal(json.name, 'test todo');
            assert.deepEqual(json.event_time, { time_type: 'at', timestamp: 100 });
            assert.deepEqual(json.repeating, { start: 10, end: 120, option: { optionType: 'every_day', interval: 3 } });
            assert.deepEqual(json.notification_options, [{ type_text: 'at_time' }]);
            assert.equal(json.repeating_turn, 2);
        });

        it('omits null optional fields', () => {
            const todo = Todo.fromData('todo1', { name: 'simple' });
            const json = todo.toJSON();
            assert.equal(json.uuid, 'todo1');
            assert.equal(json.name, 'simple');
            assert.equal(json.event_time, undefined);
            assert.equal(json.repeating, undefined);
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && npx mocha test/models/Todo.test.js`
Expected: FAIL

- [ ] **Step 3: Write Todo implementation**

```js
// functions/models/Todo.js
const EventTime = require('./EventTime');
const Repeating = require('./Repeating');

class Todo {
    constructor({ uuid, userId, name, event_tag_id, event_time, repeating,
                  notification_options, is_current, create_timestamp, repeating_turn }) {
        this.uuid = uuid;
        this.userId = userId;
        this.name = name;
        this.event_tag_id = event_tag_id;
        this.event_time = event_time instanceof EventTime ? event_time : EventTime.fromData(event_time);
        this.repeating = repeating instanceof Repeating ? repeating : Repeating.fromData(repeating);
        this.notification_options = notification_options;
        this.is_current = is_current;
        this.create_timestamp = create_timestamp;
        this.repeating_turn = repeating_turn;
    }

    static fromData(uuid, data) {
        return new Todo({ uuid, ...data });
    }

    toJSON() {
        const json = { uuid: this.uuid, name: this.name };
        if (this.userId != null) json.userId = this.userId;
        if (this.event_tag_id != null) json.event_tag_id = this.event_tag_id;
        if (this.event_time != null) json.event_time = this.event_time.toJSON();
        if (this.repeating != null) json.repeating = this.repeating.toJSON();
        if (this.notification_options != null) json.notification_options = this.notification_options;
        if (this.is_current != null) json.is_current = this.is_current;
        if (this.create_timestamp != null) json.create_timestamp = this.create_timestamp;
        if (this.repeating_turn != null) json.repeating_turn = this.repeating_turn;
        return json;
    }
}

module.exports = Todo;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd functions && npx mocha test/models/Todo.test.js`
Expected: PASS

---

### Task 4: Apply Todo model to Repository

**Files:**
- Modify: `functions/repositories/todoRepository.js`

The repository changes plain object returns (`{uuid: snapshot.id, ...snapshot.data()}`) to `Todo.fromData(snapshot.id, snapshot.data())`, and saves with `toJSON()`.

- [ ] **Step 1: Update todoRepository.js**

Key changes in each method:
- `makeNewTodo`: Build a Todo, save `todo.toJSON()` (excluding uuid), return Todo instance
- `putTodo`: Same pattern — save payload, return `Todo.fromData(id, data)`
- `updateTodo`: Same
- `findTodo`: Return `Todo.fromData(snapshot.id, snapshot.data())`
- `findCurrentTodos`: Map docs to `Todo.fromData(doc.id, doc.data())`
- `findTodos`: Same mapping
- `getAllTodos`: Same mapping
- `restoreTodo`: Return `Todo.fromData(id, data)`

Note: `is_current` logic stays in repository (it's a Firestore-specific concern).

- [ ] **Step 2: Run existing tests to verify they still pass**

Run: `cd functions && npx mocha test/services/todoService.test.js`
Expected: PASS — tests access `todo.event_time.time_type` etc. which works the same on model instances

---

### Task 5: Apply Todo model to StubTodoRepository

**Files:**
- Modify: `functions/test/doubles/stubRepositories.js` (StubTodoRepository section)

- [ ] **Step 1: Update StubTodoRepository to return Todo instances**

The stub must mirror the real repository behavior — return `Todo` instances instead of plain objects.

Key changes:
- `makeNewTodo`: Return `new Todo({ uuid: 'new', ...params })`
- `putTodo`: Return `new Todo({ uuid: id, ...params })`
- `updateTodo`: Return `new Todo({ uuid: id, ...params })`
- `findTodo`: Return `new Todo({ uuid: id, name: 'old_name', event_tag_id: 'old tag' })`
- `findCurrentTodos`: Return array of `Todo` instances
- `findTodos`: Return array of `Todo` instances
- `restoreTodo`: Return `new Todo({ uuid: id, ...originPayload })`
- `getAllTodos`: Return array of `Todo` instances

Add `const Todo = require('../../models/Todo');` at top of file.

- [ ] **Step 2: Run all tests to verify nothing breaks**

Run: `cd functions && npm test`
Expected: ALL PASS — existing test assertions like `todo.event_time.time_type` work on Todo model instances because `event_time` is an `EventTime` instance with the same properties.

---

### Task 6: Apply Todo model to Controller

**Files:**
- Modify: `functions/controllers/todoController.js`

- [ ] **Step 1: Update todoController.js**

Key changes:
- `makeTodo`: Construct `new Todo({...})` from `req.body`, pass to service
- `putTodo`: Same pattern
- Response: `res.send(result.toJSON())` for single todo results; for composite results (completeTodo, replaceRepeatingTodo), the service returns objects with Todo instances — their `toJSON()` is called by Express's `res.send()` if we ensure the response is properly serialized.

Note: Since `res.send()` calls `JSON.stringify()` which invokes `toJSON()` on objects that have it, Todo instances will auto-serialize. No explicit `.toJSON()` call needed in most cases. But for composite response objects (like `{ done: doneTodo, next_repeating: todo }`), we need to explicitly serialize.

- [ ] **Step 2: Run controller tests**

Run: `cd functions && npx mocha test/controllers/todoController.test.js`
Expected: PASS

- [ ] **Step 3: Run all tests**

Run: `cd functions && npm test`
Expected: ALL PASS

- [ ] **Step 4: Commit Todo model + all layer changes**

```bash
git add functions/models/Todo.js functions/test/models/Todo.test.js functions/repositories/todoRepository.js functions/controllers/todoController.js functions/test/doubles/stubRepositories.js
git commit -m "[#95] Todo 모델 클래스 추가 및 전체 레이어 적용"
```

---

### Future Tasks (separate commits, same pattern)

Tasks 7-18 follow the identical pattern for each remaining domain. Each task:
1. Create model class + test
2. Apply to repository
3. Update stub repository
4. Apply to controller
5. Run all tests
6. Commit

**Order:**
- Task 7-8: Schedule model (reuses EventTime, Repeating)
- Task 9-10: EventTag model
- Task 11-12: EventDetail model
- Task 13-14: DoneTodo model
- Task 15-16: ForemostEvent model
- Task 17-18: EventTimeRange model
- Task 19-20: Account model
- Task 21-22: AppSetting model

---

### Task 23: CLAUDE.md 수정 여부 검토

모든 모델 리팩토링 완료 후, `CLAUDE.md`의 내용이 현재 코드베이스 상태를 정확히 반영하는지 검토한다.

- [ ] **Step 1: CLAUDE.md 검토**

확인 항목:
- Models 섹션에 새로 추가된 모델 클래스들(EventTime, Repeating, Todo, Schedule 등)이 문서화되어 있는지
- 기존 설명과 달라진 부분이 있는지 (예: repository 반환 타입이 plain object → model instance로 변경)
- 테스트 관련 설명이 여전히 정확한지 (예: model 단위 테스트 추가됨)

- [ ] **Step 2: 필요시 CLAUDE.md 수정 및 커밋**
