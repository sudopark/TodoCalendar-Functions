
const express = require('express');
const router = express.Router();

const AppSettingRepository = require('../../repositories/appSettingRepository');
const AppSettingService = require('../../services/appSettingService');
const AppSettingController = require('../../controllers/appSettingController');

const controller = new AppSettingController(
    new AppSettingService(
        new AppSettingRepository()
    )
)

router.get('/event/tag/default/color', async (req, res) => {
    await controller.getUserDefaultEventTagColors(req, res);
});

router.patch('/event/tag/default/color', async (req, res) => {
    await controller.patchUserDefaultEventTagColors(req, res);
});

module.exports = router;