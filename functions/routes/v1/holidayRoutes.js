
const express = require('express');
const router = express.Router();

const Repository = require('../../repositories/holidayRepository');
const Service = require('../../services/holidayService');
const Controller = require('../../controllers/holidayController');

const controller = new Controller(
    new Service(new Repository())
)

router.get('/', async (req, res) => {
    await controller.getHoliday(req, res)
})

module.exports = router;