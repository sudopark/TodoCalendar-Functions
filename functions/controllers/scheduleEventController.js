

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

    }

    async excludeRepeatingTime(req, res) {

    }

    async removeEvent(req, res) {

    }
}

module.exports = ScheduleEventController;