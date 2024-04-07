

class EventDetailDataController {
 
    constructor(eventdetailDataService) {
        this.eventdetailDataService = eventdetailDataService
    }

    async putData(req, res) {
        const { body } = req, eventid = req.params.id;
        if(!eventid) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "event id is missing." 
                })
            return;
        }

        const payload = {
            place: body.place, 
            url: body.url, 
            memo: body.memo
        }

        try {
            const newData = await this.eventdetailDataService.putData(eventid, payload)
            res.status(201)
                .send(newData)
        } catch(error) {
            res.status(error?.status || 500)
                .send({
                    code: error?.code ?? "Unknown", 
                    message: error?.message || error, 
                    origin: error?.origin
                })
        }
    }

    async getData(req, res) {
        const eventid = req.params.id;
        if(!eventid) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "event id is missing." 
                })
            return;
        }

        try {
            const data = await this.eventdetailDataService.findData(eventid)
            res.status(200)
                .send(data)

        } catch(error) {
            res.status(error?.status || 500)
            .send({
                code: error?.code ?? "Unknown", 
                message: error?.message || error, 
                origin: error?.origin
            })
        }
    }

    async deleteData(req, res) {
        const eventid = req.params.id;
        if(!eventid) {
            res.status(400)
                .send({
                    code: "InvalidParameter", 
                    message: "event id is missing." 
                })
            return;
        }
        try {
            await this.eventdetailDataService.removeData(eventid)
            res.status(200)
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

module.exports = EventDetailDataController;