


const EventTime = require('./EventTime');

class DoneTodo {

    constructor({ uuid, origin_event_id, done_at, name, event_time, event_tag_id, notification_options, userId }) {
        this.uuid = uuid;
        this.origin_event_id = origin_event_id ?? null;
        this.done_at = done_at ?? null;
        this.name = name;
        this.event_time = event_time instanceof EventTime ? event_time : EventTime.fromData(event_time);
        this.event_tag_id = event_tag_id ?? null;
        this.notification_options = notification_options ?? null;
        this.userId = userId;
    }

    static fromData(uuid, data) {
        return new DoneTodo({ uuid, ...data });
    }

    toJSON() {
        const json = {
            uuid: this.uuid,
            userId: this.userId,
            name: this.name
        };
        if (this.origin_event_id != null) json.origin_event_id = this.origin_event_id;
        if (this.done_at != null) json.done_at = this.done_at;
        if (this.event_time != null) json.event_time = this.event_time.toJSON();
        if (this.event_tag_id != null) json.event_tag_id = this.event_tag_id;
        if (this.notification_options != null) json.notification_options = this.notification_options;
        return json;
    }
}

module.exports = DoneTodo;
