# Data Model Refactoring Design

## Goal

Replace plain JSON objects with dedicated model classes across all layers (controller/service/repository). Work incrementally, one domain model per commit.

## Design Decisions

- **`toJSON()` is required** on every model; `fromData()` only where needed (e.g., Firestore reads)
- **Validation in models**: required field mapping + defaults in `fromData()`. Business rules stay in services. HTTP param checks stay in controllers.
- **Shared structures** (`EventTime`, `Repeating`) get their own files, reused by Todo and Schedule.
- **Opaque JSON pass-through**: `notification_options` and `repeating.option` are stored/returned as-is without server-side modeling.
- **`repeating.start`, `repeating.end`, `repeating.end_count`** are modeled as fields because `EventTimeRangeService` reads them directly.
- **Existing model classes** (`SyncResponse`, `SyncTimestamp`, `UserDevice`, `DataChangeLog`) are not touched.

## Model Definitions

### EventTime (`models/EventTime.js`)

```js
class EventTime {
  constructor({ time_type, timestamp, period_start, period_end, seconds_from_gmt }) {
    this.time_type = time_type;            // 'at' | 'period' | 'allday'
    this.timestamp = timestamp;            // number (at)
    this.period_start = period_start;      // number (period, allday)
    this.period_end = period_end;          // number (period, allday)
    this.seconds_from_gmt = seconds_from_gmt; // number (allday)
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
```

### Repeating (`models/Repeating.js`)

`option` is opaque JSON (pass-through).

```js
class Repeating {
  constructor({ start, end, end_count, option }) {
    this.start = start;        // number (timestamp)
    this.end = end;            // number (optional)
    this.end_count = end_count; // number (optional)
    this.option = option;      // opaque JSON object
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
```

### Todo (`models/Todo.js`)

```js
class Todo {
  constructor({ uuid, userId, name, event_tag_id, event_time, repeating,
                notification_options, is_current, create_timestamp, repeating_turn }) {
    this.uuid = uuid;
    this.userId = userId;
    this.name = name;
    this.event_tag_id = event_tag_id;               // optional
    this.event_time = EventTime.fromData(event_time); // EventTime | null
    this.repeating = Repeating.fromData(repeating);   // Repeating | null
    this.notification_options = notification_options;  // opaque JSON array
    this.is_current = is_current;                     // boolean
    this.create_timestamp = create_timestamp;         // number
    this.repeating_turn = repeating_turn;             // number (optional)
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
```

### Schedule (`models/Schedule.js`)

```js
class Schedule {
  constructor({ uuid, userId, name, event_tag_id, event_time, repeating,
                notification_options, show_turns, exclude_repeatings }) {
    this.uuid = uuid;
    this.userId = userId;
    this.name = name;
    this.event_tag_id = event_tag_id;
    this.event_time = EventTime.fromData(event_time);
    this.repeating = Repeating.fromData(repeating);
    this.notification_options = notification_options;  // opaque
    this.show_turns = show_turns;
    this.exclude_repeatings = exclude_repeatings;      // array
  }

  static fromData(uuid, data) {
    return new Schedule({ uuid, ...data });
  }

  toJSON() { /* similar pattern, include all fields */ }
}
```

### EventTag (`models/EventTag.js`)

```js
class EventTag {
  constructor({ uuid, userId, name, color_hex }) {
    this.uuid = uuid;
    this.userId = userId;
    this.name = name;
    this.color_hex = color_hex;
  }

  static fromData(uuid, data) {
    return new EventTag({ uuid, ...data });
  }

  toJSON() {
    return { uuid: this.uuid, name: this.name, color_hex: this.color_hex };
  }
}
```

### EventDetail (`models/EventDetail.js`)

```js
class EventDetail {
  constructor({ eventId, place, url, memo }) {
    this.eventId = eventId;
    this.place = place;   // opaque JSON (nested: name, coordinate, address)
    this.url = url;
    this.memo = memo;
  }

  static fromData(data) {
    return new EventDetail(data);
  }

  toJSON() {
    const json = { eventId: this.eventId };
    if (this.place != null) json.place = this.place;
    if (this.url != null) json.url = this.url;
    if (this.memo != null) json.memo = this.memo;
    return json;
  }
}
```

### DoneTodo (`models/DoneTodo.js`)

```js
class DoneTodo {
  constructor({ uuid, userId, origin_event_id, done_at, name, event_tag_id,
                event_time, repeating, notification_options, create_timestamp }) {
    this.uuid = uuid;
    this.userId = userId;
    this.origin_event_id = origin_event_id;
    this.done_at = done_at;
    this.name = name;
    this.event_tag_id = event_tag_id;
    this.event_time = EventTime.fromData(event_time);
    this.repeating = Repeating.fromData(repeating);
    this.notification_options = notification_options;
    this.create_timestamp = create_timestamp;
  }

  static fromData(uuid, data) {
    return new DoneTodo({ uuid, ...data });
  }

  toJSON() { /* all fields */ }
}
```

### ForemostEvent (`models/ForemostEvent.js`)

```js
class ForemostEvent {
  constructor({ event_id, is_todo }) {
    this.event_id = event_id;
    this.is_todo = is_todo;
  }

  static fromData(data) {
    return new ForemostEvent(data);
  }

  toJSON() {
    return { event_id: this.event_id, is_todo: this.is_todo };
  }
}
```

### EventTimeRange (`models/EventTimeRange.js`)

```js
class EventTimeRange {
  constructor({ userId, isTodo, lower, upper, eventTimeLower, eventTimeUpper }) {
    this.userId = userId;
    this.isTodo = isTodo;
    this.lower = lower;
    this.upper = upper;
    this.eventTimeLower = eventTimeLower;
    this.eventTimeUpper = eventTimeUpper;
  }

  toJSON() {
    const json = { userId: this.userId, isTodo: this.isTodo };
    if (this.lower != null) json.lower = this.lower;
    if (this.upper != null) json.upper = this.upper;
    if (this.eventTimeLower != null) json.eventTimeLower = this.eventTimeLower;
    if (this.eventTimeUpper != null) json.eventTimeUpper = this.eventTimeUpper;
    return json;
  }
}
```

### Account (`models/Account.js`)

```js
class Account {
  constructor({ uid, email, method, first_signed_in, last_sign_in }) {
    this.uid = uid;
    this.email = email;
    this.method = method;
    this.first_signed_in = first_signed_in;
    this.last_sign_in = last_sign_in;
  }

  static fromData(data) {
    return new Account(data);
  }

  toJSON() {
    return {
      uid: this.uid, email: this.email, method: this.method,
      first_signed_in: this.first_signed_in, last_sign_in: this.last_sign_in
    };
  }
}
```

### AppSetting (`models/AppSetting.js`)

```js
class AppSetting {
  constructor({ defaultTagColor } = {}) {
    this.defaultTagColor = defaultTagColor || {
      holiday: "#D6236A",
      default: "#088CDA"
    };
  }

  static fromData(data) {
    return new AppSetting(data || {});
  }

  toJSON() {
    return { defaultTagColor: this.defaultTagColor };
  }
}
```

## Layer Integration Pattern

### Controller
```js
// Before: plain object
const payload = { name: req.body.name, event_tag_id: req.body.event_tag_id, ... };
const result = await service.makeTodo(userId, payload);
res.json(result);

// After: model instance
const todo = new Todo({ name: req.body.name, event_tag_id: req.body.event_tag_id, ... });
const result = await service.makeTodo(userId, todo);
res.json(result.toJSON());
```

### Repository
```js
// Before: plain merge
const snapshot = await docRef.get();
return { uuid: snapshot.id, ...snapshot.data() };

// After: model fromData
const snapshot = await docRef.get();
return Todo.fromData(snapshot.id, snapshot.data());

// Save: model toJSON
await docRef.set(todo.toJSON());
```

### Service
Receives and returns model instances. Internal logic accesses typed properties.

## Implementation Order (one commit each)

1. `EventTime` + `Repeating` (shared structures)
2. `Todo` — apply to todoController, todoEventService, todoRepository + update tests
3. `Schedule` — apply to scheduleEventController, scheduleEventService, scheduleEventRepository + update tests
4. `EventTag` — apply across layers + tests
5. `EventDetail` — apply across layers + tests
6. `DoneTodo` — apply across layers + tests
7. `ForemostEvent` — apply across layers + tests
8. `EventTimeRange` — apply to eventTimeRangeService/repository + tests
9. `Account` — apply across layers + tests
10. `AppSetting` — apply across layers + tests

## Testing Strategy

Each commit updates corresponding test files. Stub repositories in `test/doubles/stubRepositories.js` will be updated to return model instances. Assertions verify model properties instead of plain object keys.
