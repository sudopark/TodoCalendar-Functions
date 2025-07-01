
const express = require('express');
const router = express.Router();

const DataSyncController = require('../../controllers/dataSyncController');
const DataSyncService = require('../../services/dataSyncService');
const SyncTimeRepository = require('../../repositories/syncTimestampRepository');
const ChangeLogRepository = require('../../repositories/dataChangeLogRepository');
const EventTagRepository = require('../../repositories/eventTagRepository');
const TodoRepository = require('../../repositories/todoRepository');
const ScheduleRepository = require('../../repositories/scheduleEventRepository');

const dataSyncController = new DataSyncController(
    new DataSyncService(
        new SyncTimeRepository(), 
        new ChangeLogRepository(), 
        new EventTagRepository(), 
        new TodoRepository(), 
        new ScheduleRepository()
    )
)

router.get('/sync', async (req, res) => {
    await dataSyncController.sync(req, res)
});

module.exports = router;