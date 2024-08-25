
const Errors = require('../models/Errors');

class ScheduleEventController {

    constructor(scheduleEventService) {
        this.scheduleEventService = scheduleEventService
    }

    async getEvent(req, res) {
        const eventId = req.params.id
        if(!eventId) {
            throw new Errors.BadRequest('event id is missing.')
        }

        try {
            const event = await this.scheduleEventService.getEvent(eventId);
            res.status(200)
                .send(event)
        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async getEvents(req, res) {
        const userId = req.auth.uid;
        const lower = req.query.lower, upper = req.query.upper;

        if(
            !userId || !lower || !upper
        ) {
            throw new Errors.BadRequest('user id, lower or upper is missing.')
        }

        try {
            const events = await this.scheduleEventService.findEvents(userId, lower, upper);
            res.status(200)
                .send(events)
        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async makeEvent(req, res) {
        const { body } = req; const userId = req.auth.uid;
        if(
            !body.name || !userId || !body.event_time
        ) {
            throw new Errors.BadRequest('schedule event name, event_time or user id is missing.')
        }

        const payload = {
            userId: userId, 
            name: body.name, 
            evnet_tag_id: body.evnet_tag_id, 
            event_time: body.event_time,
            repeating: body.repeating, 
            notification_options: body.notification_options, 
            show_turns: body.show_turns
        }

        try {
            const newEvent = await this.scheduleEventService.makeEvent(userId, payload);
            res.status(201)
                .send(newEvent);
        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async putEvent(req, res) {
        const { body } = req;
        const eventId = req.params.id, userId = req.auth.uid;
        if(
            !body.name || !eventId || !userId || !body.event_time
        ) {
            throw new Errors.BadRequest('schedule name, user id, event_time or eventId is missing.')
        }

        try {
            const payload = { userId: userId, ...body }
            const event = await this.scheduleEventService.putEvent(userId, eventId, payload);
            res.status(201)
                .send(event);

        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async patchEvent(req, res) {
        const { body } = req, eventId = req.params.id, userId = req.auth.uid;
        if(
            !eventId || !userId
        ) {
            throw new Errors.BadRequest('event id or user id or eventId is missing.')
        }

        try {
            const updated = await this.scheduleEventService.updateEvent(userId, eventId, body)
            res.status(201)
                .send(updated)
        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async excludeRepeatingTime(req, res) {
        const eventId = req.params.id, userId = req.auth.uid
        const newPayload = req.body.new, excludeTime = req.body.exlcude_time
        if(
            !eventId || !userId 
        ) {
            throw new Errors.BadRequest('user id or eventId is missing.')
        }

        if(
            !(newPayload?.name) || !(newPayload?.event_time) || !excludeTime
        ) {
            throw new Errors.BadRequest('new payload event name, event_time or excludeTime is missing')
        }

        const payload = {
            userId: userId, 
            name: newPayload.name, 
            evnet_tag_id: newPayload.evnet_tag_id, 
            event_time: newPayload.event_time,
            repeating: newPayload.repeating, 
            notification_options: newPayload.notification_options, 
            show_turns: newPayload.show_turns
        }

        try {
            const result = await this.scheduleEventService.excludeRepeatingEventTime(
                userId, eventId, excludeTime, payload
            )
            res.status(201)
                .send(result)
        } catch (error) {
            throw new Errors.Application(error)
        }
    }

    async removeEvent(req, res) {
        const eventId = req.params.id
        if(!eventId) {
            throw new Errors.BadRequest('event id is missing.')
        }

        try {
            await this.scheduleEventService.removeEvent(eventId);
            res.status(201)
                .send({ status: 'ok' })
        } catch (error) {
            throw new Errors.Application(error)
        }
    }
}

module.exports = ScheduleEventController;