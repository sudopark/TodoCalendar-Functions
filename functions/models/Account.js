


class Account {

    constructor({ uid, email, method, first_signed_in, last_sign_in }) {
        this.uid = uid;
        this.email = email ?? null;
        this.method = method ?? null;
        this.first_signed_in = first_signed_in ?? null;
        this.last_sign_in = last_sign_in ?? null;
    }

    static fromData(uid, data) {
        return new Account({ uid, ...data });
    }

    toJSON() {
        const json = { uid: this.uid };
        if (this.email != null) json.email = this.email;
        if (this.method != null) json.method = this.method;
        if (this.first_signed_in != null) json.first_signed_in = this.first_signed_in;
        if (this.last_sign_in != null) json.last_sign_in = this.last_sign_in;
        return json;
    }
}

module.exports = Account;
