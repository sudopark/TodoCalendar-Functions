
const express = require('express')
const router = express.Router();
const EventDetailDataRepository = require("../repositories/eventDetailRepository");
const EventDetailDataService = require('../services/eventDetailService');
const EventDetailDataController = require('../controllers/eventDetailController');

const controller = new EventDetailDataController(
    new EventDetailDataService(
        new EventDetailDataRepository(false), 
        new EventDetailDataRepository(true)
    )
)

router.get('/:id', async (req, res) => {
    await controller.getData(req, res);
});

router.put('/:id', async (req, res) => {
    await controller.putData(req, res);
});

router.delete('/:id', async (req, res) => {
    await controller.deleteData(req, res);
});

router.get('/done/:id', async (req, res) => {
    req.isDoneDetail = true
    await controller.getData(req, res);
});

router.put('/done/:id', async (req, res) => {
    req.isDoneDetail = true
    await controller.putData(req, res);
});

router.delete('/done/:id', async (req, res) => {
    req.isDoneDetail = true
    await controller.deleteData(req, res);
});

module.exports = router;