

class Repeating {

    constructor(start, option, end, end_count) {
        this.start = start;
        this.option = option;
        this.end = end;
        this.end_count = end_count;
    }

    static fromData(data) {
        if (data == null) return null;
        return new Repeating(
            data.start,
            data.option,
            data.end,
            data.end_count
        );
    }

    toJSON() {
        const json = { start: this.start, option: this.option };
        if (this.end != null) json.end = this.end;
        if (this.end_count != null) json.end_count = this.end_count;
        return json;
    }
}

module.exports = Repeating;
