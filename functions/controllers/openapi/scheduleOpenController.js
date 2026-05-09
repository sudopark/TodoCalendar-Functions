
const Errors = require('../../models/Errors');

class ScheduleOpenController {

    constructor(scheduleEventService) {
        this.scheduleEventService = scheduleEventService;
    }

    async getEvent(req, res) {
        const eventId = req.params.id;
        if (!eventId) {
            throw new Errors.BadRequest('event id is missing.');
        }
        try {
            const event = await this.scheduleEventService.getEvent(eventId);
            res.status(200).send(event);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async getEvents(req, res) {
        const userId = req.openUserId;
        const lower = req.query.lower;
        const upper = req.query.upper;
        if (!userId || !lower || !upper) {
            throw new Errors.BadRequest('user id, lower or upper is missing.');
        }
        try {
            const events = await this.scheduleEventService.findEvents(userId, lower, upper);
            res.status(200).send(events);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async makeEvent(req, res) {
        const { body } = req;
        const userId = req.openUserId;
        if (!body.name || !userId || !body.event_time) {
            throw new Errors.BadRequest('schedule event name, event_time or user id is missing.');
        }
        const payload = {
            userId,
            name: body.name,
            event_tag_id: body.event_tag_id,
            event_time: body.event_time,
            repeating: body.repeating,
            notification_options: body.notification_options,
            show_turns: body.show_turns
        };
        try {
            const newEvent = await this.scheduleEventService.makeEvent(userId, payload);
            res.status(201).send(newEvent);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async putEvent(req, res) {
        const { body } = req;
        const eventId = req.params.id;
        const userId = req.openUserId;
        if (!body.name || !eventId || !userId || !body.event_time) {
            throw new Errors.BadRequest('schedule name, user id, event_time or eventId is missing.');
        }
        try {
            const payload = { userId, ...body };
            const event = await this.scheduleEventService.putEvent(userId, eventId, payload);
            res.status(201).send(event);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async patchEvent(req, res) {
        const { body } = req;
        const eventId = req.params.id;
        const userId = req.openUserId;
        if (!eventId || !userId) {
            throw new Errors.BadRequest('event id or user id is missing.');
        }
        try {
            const updated = await this.scheduleEventService.updateEvent(userId, eventId, body);
            res.status(201).send(updated);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async removeEvent(req, res) {
        const eventId = req.params.id;
        const userId = req.openUserId;
        if (!eventId || !userId) {
            throw new Errors.BadRequest('event id or user id is missing.');
        }
        try {
            await this.scheduleEventService.removeEvent(userId, eventId);
            res.status(201).send({ status: 'ok' });
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async makeNewEventWithExcludeFromRepeating(req, res) {
        const eventId = req.params.id;
        const userId = req.openUserId;
        const newPayload = req.body.new;
        const excludeTime = req.body.exclude_repeatings;
        if (!eventId || !userId) {
            throw new Errors.BadRequest('user id or eventId is missing.');
        }
        if (!(newPayload?.name) || !(newPayload?.event_time) || !excludeTime) {
            throw new Errors.BadRequest('new payload event name, event_time or excludeTime is missing.');
        }
        const payload = {
            userId,
            name: newPayload.name,
            event_tag_id: newPayload.event_tag_id,
            event_time: newPayload.event_time,
            repeating: newPayload.repeating,
            notification_options: newPayload.notification_options,
            show_turns: newPayload.show_turns
        };
        try {
            const result = await this.scheduleEventService.makeNewEventWithExcludeFromRepeating(
                userId, eventId, excludeTime, payload
            );
            res.status(201).send(result);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async branchRepeatingEvent(req, res) {
        const eventId = req.params.id;
        const userId = req.openUserId;
        const endTime = req.body.end_time;
        const newPayload = req.body.new;
        if (!eventId || !userId) {
            throw new Errors.BadRequest('user id or eventId is missing.');
        }
        if (!endTime || !(newPayload?.name) || !(newPayload?.event_time)) {
            throw new Errors.BadRequest('new payload event name, event_time or endTime is missing.');
        }
        const payload = {
            userId,
            name: newPayload.name,
            event_tag_id: newPayload.event_tag_id,
            event_time: newPayload.event_time,
            repeating: newPayload.repeating,
            notification_options: newPayload.notification_options,
            show_turns: newPayload.show_turns
        };
        try {
            const result = await this.scheduleEventService.branchNewRepeatingEvent(userId, eventId, endTime, payload);
            res.status(201).send(result);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }

    async excludeRepeatingTime(req, res) {
        const eventId = req.params.id;
        const excludeTime = req.body.exclude_repeatings;
        if (!eventId || !excludeTime) {
            throw new Errors.BadRequest('eventId or excludeTime is missing.');
        }
        try {
            const result = await this.scheduleEventService.excludeRepeating(eventId, excludeTime);
            res.status(200).send(result);
        } catch (error) {
            throw new Errors.Application(error);
        }
    }
}

module.exports = ScheduleOpenController;
