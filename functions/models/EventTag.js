


class EventTag {

    constructor({ uuid, userId, name, color_hex }) {
        this.uuid = uuid;
        this.userId = userId;
        this.name = name;
        this.color_hex = color_hex ?? null;
    }

    static fromData(uuid, data) {
        return new EventTag({ uuid, ...data });
    }

    toJSON() {
        const json = {
            uuid: this.uuid,
            userId: this.userId,
            name: this.name
        };
        if (this.color_hex != null) json.color_hex = this.color_hex;
        return json;
    }
}

module.exports = EventTag;
