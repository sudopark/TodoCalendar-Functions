


class ForemostEvent {

    constructor({ event_id, is_todo, event }) {
        this.event_id = event_id;
        this.is_todo = is_todo;
        this.event = event ?? null;
    }

    toJSON() {
        const json = {
            event_id: this.event_id,
            is_todo: this.is_todo
        };
        if (this.event != null) {
            json.event = this.event.toJSON ? this.event.toJSON() : this.event;
        }
        return json;
    }
}

module.exports = ForemostEvent;
