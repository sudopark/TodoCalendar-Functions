const express = require('express');
const router = express.Router();

const refreshTokenService = require('../../services/oauth/refreshTokenServiceInstance');
const RevocationController = require('../../controllers/oauth/revocationController');
const noCache = require('../../middlewares/oauth/noCache');

router.use(noCache);

const controller = new RevocationController(refreshTokenService);

router.post('/', async (req, res) => {
    await controller.revoke(req, res);
});

module.exports = router;
