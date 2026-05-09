
const express = require('express');
const router = express.Router();

const TagOpenController = require('../../controllers/openapi/tagOpenController');
const EventTagRepository = require('../../repositories/eventTagRepository');
const EventTagService = require('../../services/eventTagService');
const SyncTimestampRepository = require('../../repositories/syncTimestampRepository');
const ChangeLogRepository = require('../../repositories/dataChangeLogRepository');
const ChangeLogRecordService = require('../../services/dataChangeLogRecordService');
const requireScope = require('../../middlewares/openapi/requireScope');

const changeLogRecordService = new ChangeLogRecordService(
    new SyncTimestampRepository(),
    new ChangeLogRepository()
);
const eventTagService = new EventTagService(
    new EventTagRepository(),
    changeLogRecordService
);
const controller = new TagOpenController(eventTagService);

const READ = requireScope(['read:calendar']);
const WRITE = requireScope(['write:calendar']);

router.get('/', READ, async (req, res) => {
    await controller.getAllTags(req, res);
});

router.post('/', WRITE, async (req, res) => {
    await controller.postEventTag(req, res);
});

router.put('/:id', WRITE, async (req, res) => {
    await controller.putEventTag(req, res);
});

router.delete('/:id', WRITE, async (req, res) => {
    await controller.deleteTag(req, res);
});

module.exports = router;
