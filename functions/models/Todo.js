

const EventTime = require('./EventTime');
const Repeating = require('./Repeating');

class Todo {

    constructor({ uuid, userId, name, event_tag_id, event_time, repeating, notification_options, is_current, create_timestamp, repeating_turn }) {
        this.uuid = uuid;
        this.userId = userId;
        this.name = name;
        this.event_tag_id = event_tag_id ?? null;
        this.event_time = event_time instanceof EventTime ? event_time : EventTime.fromData(event_time);
        this.repeating = repeating instanceof Repeating ? repeating : Repeating.fromData(repeating);
        this.notification_options = notification_options ?? null;
        this.is_current = is_current;
        this.create_timestamp = create_timestamp;
        this.repeating_turn = repeating_turn ?? null;
    }

    static fromData(uuid, data) {
        return new Todo({ uuid, ...data });
    }

    toJSON() {
        const json = {
            uuid: this.uuid,
            userId: this.userId,
            name: this.name,
            is_current: this.is_current,
            create_timestamp: this.create_timestamp
        };
        if (this.event_tag_id != null) json.event_tag_id = this.event_tag_id;
        if (this.event_time != null) json.event_time = this.event_time.toJSON();
        if (this.repeating != null) json.repeating = this.repeating.toJSON();
        if (this.notification_options != null) json.notification_options = this.notification_options;
        if (this.repeating_turn != null) json.repeating_turn = this.repeating_turn;
        return json;
    }
}

module.exports = Todo;
