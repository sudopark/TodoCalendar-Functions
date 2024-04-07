
const express = require('express')
const router = express.Router();
const EventDetailDataRepository = require("../../repositories/eventDetailRepository");
const EventDetailDataService = require('../../services/eventDetailService');
const EventDetailDataController = require('../../controllers/eventDetailController');

const controller = new EventDetailDataController(
    new EventDetailDataService(
        new EventDetailDataRepository()
    )
)

router.get('/:id', async (req, res) => {
    controller.putData(req, res);
});

router.put('/:id', async (req, res) => {
    controller.getData(req, res);
});

router.delete('/:id', async (req, res) => {
    controller.deleteData(req, res);
});

module.exports = router;