

class ScheduleEventController {

    constructor(scheduleEventService) {
        this.scheduleEventService = scheduleEventService
    }

    async getEvents(req, res) {

    }

    async getEvent(req, res) {

    }

    async makeEvent(req, res) {
        const { body } = req; const userId = req.auth.uid;
        if(
            !body.name || !userId || !body.event_time
        ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "schedule event name, event_time or user id is missing." 
                })
            return;
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
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }

    async putEvent(req, res) {
        const { body } = req;
        const eventId = req.params.id, userId = req.auth.uid;
        if(
            !body.name || !eventId || !userId || !body.event_time
        ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "schedule name, user id, event_time or eventId is missing." 
                })
            return;
        }

        try {
            const payload = { userId: userId, ...body }
            const event = await this.scheduleEventService.putEvent(userId, eventId, payload);
            res.status(201)
                .send(event);

        } catch (error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }

    async patchEvent(req, res) {
        const { body } = req, eventId = req.params.id, userId = req.auth.userId;
        if(
            !eventId || !userId
        ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "user id or eventId is missing." 
                })
            return;
        }

        try {
            const updated = await this.scheduleEventService.updateEvent(userId, eventId, body)
            res.status(201)
                .send(updated)
        } catch (error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }

    async excludeRepeatingTime(req, res) {
        const eventId = req.params.id, userId = req.auth.userId
        const newPayload = req.body.new, excludeTime = req.body.exlcude_time
        if(
            !eventId || !userId 
        ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "user id or eventId is missing." 
                })
            return
        }

        if(
            !(newPayload?.name) || !(newPayload?.event_time) || !excludeTime
        ) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "new payload event name, event_time or excludeTime is missing" 
                })
            return
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
            const result = this.scheduleEventService.excludeRepeatingEventTime(
                userId, eventId, excludeTime, payload
            )
            res.status(201)
                .send(result)
        } catch (error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }

    async removeEvent(req, res) {
        const eventId = req.params.id
        if(!eventId) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "eventId is missing." 
                })
        }

        try {
            await this.scheduleEventService.removeEvent(eventId);
            res.status(201)
                .send({ status: 'ok' })
        } catch (error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }
}

module.exports = ScheduleEventController;