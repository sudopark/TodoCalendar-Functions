


const EventTime = require('./EventTime');
const Repeating = require('./Repeating');

class Schedule {

    constructor({ uuid, userId, name, event_tag_id, event_time, repeating, notification_options, show_turns, exclude_repeatings }) {
        this.uuid = uuid;
        this.userId = userId;
        this.name = name;
        this.event_tag_id = event_tag_id ?? null;
        this.event_time = event_time instanceof EventTime ? event_time : EventTime.fromData(event_time);
        this.repeating = repeating instanceof Repeating ? repeating : Repeating.fromData(repeating);
        this.notification_options = notification_options ?? null;
        this.show_turns = show_turns ?? null;
        this.exclude_repeatings = exclude_repeatings ?? null;
    }

    static fromData(uuid, data) {
        return new Schedule({ uuid, ...data });
    }

    toJSON() {
        const json = {
            uuid: this.uuid,
            userId: this.userId,
            name: this.name
        };
        if (this.event_tag_id != null) json.event_tag_id = this.event_tag_id;
        if (this.event_time != null) json.event_time = this.event_time.toJSON();
        if (this.repeating != null) json.repeating = this.repeating.toJSON();
        if (this.notification_options != null) json.notification_options = this.notification_options;
        if (this.show_turns != null) json.show_turns = this.show_turns;
        if (this.exclude_repeatings != null) json.exclude_repeatings = this.exclude_repeatings;
        return json;
    }
}

module.exports = Schedule;
