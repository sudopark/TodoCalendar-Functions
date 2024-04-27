
const express = require('express');
const router = express.Router();

const EventTagRepository = require('../../repositories/eventTagRepository');
const EventTagService = require('../../services/eventTagService');
const EventTagController = require('../../controllers/eventTagController');

const controller = new EventTagController(
    new EventTagService(
        new EventTagRepository()
    )
)

router.post('/tag', async (req, res) => {
    await controller.postEventTag(req, res);
});

router.put('/tag/:id', async (req, res) => {
    await controller.putEventTag(req, res);
});

router.delete('/tag/:id', async (req, res) => {
    await controller.deleteTag(req, res);
});

router.get('/all', async (req, res) => {
    await controller.getAllTags(req, res);
});

router.get('/', async (req, res) => {
    await controller.getTags(req, res);
});

module.exports = router;