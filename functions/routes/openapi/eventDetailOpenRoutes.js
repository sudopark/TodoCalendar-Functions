
const express = require('express');
const router = express.Router();

const EventDetailOpenController = require('../../controllers/openapi/eventDetailOpenController');
const EventDetailDataService = require('../../services/eventDetailService');
const EventDetailDataRepository = require('../../repositories/eventDetailRepository');
const requireScope = require('../../middlewares/openapi/requireScope');

const controller = new EventDetailOpenController(
    new EventDetailDataService(
        new EventDetailDataRepository(false),
        new EventDetailDataRepository(true)
    )
);

const READ = requireScope(['read:calendar']);
const WRITE = requireScope(['write:calendar']);

router.get('/done/:id', READ, async (req, res) => {
    req.isDoneDetail = true;
    await controller.getData(req, res);
});

router.put('/done/:id', WRITE, async (req, res) => {
    req.isDoneDetail = true;
    await controller.putData(req, res);
});

router.delete('/done/:id', WRITE, async (req, res) => {
    req.isDoneDetail = true;
    await controller.deleteData(req, res);
});

router.get('/:id', READ, async (req, res) => {
    await controller.getData(req, res);
});

router.put('/:id', WRITE, async (req, res) => {
    await controller.putData(req, res);
});

router.delete('/:id', WRITE, async (req, res) => {
    await controller.deleteData(req, res);
});

module.exports = router;
