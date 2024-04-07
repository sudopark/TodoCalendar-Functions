
const express = require('express');
const router = express.Router();

const EventTagRepository = require('../../repositories/eventTagRepository');
const EventTagService = require('../../services/eventTagService');
const EventTagController = require('../../controllers/eventTagController');

const controller = EventTagController(
    new EventTagService(
        new EventTagRepository()
    )
)

router.post('/tag', async (req, res) => {
    controller.postEventTag(req, res);
});

router.put('/tag/:id', async (req, res) => {
    controller.putEventTag(req, res);
});

router.delete('/tag/:id', async (req, res) => {
    controller.deleteTag(req, res);
});

router.get('/all', async (req, res) => {
    controller.getAllTags(req, res);
});

router.get('/', async (req, res) => {
    controller.getTags(req, res);
});

module.exports = router;