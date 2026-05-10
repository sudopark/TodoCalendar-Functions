
const express = require('express');
const router = express.Router();

const Repository = require('../repositories/holidayRepository');
const FakeRepository = require('../repositories/fakes/holidayRepository');
const Service = require('../services/holidayService');
const Controller = require('../controllers/holidayController');

const repository = process.env.FUNCTIONS_EMULATOR === 'true'
    ? new FakeRepository()
    : new Repository();

const controller = new Controller(
    new Service(repository)
)

router.get('/', async (req, res) => {
    await controller.getHoliday(req, res)
})

module.exports = router;