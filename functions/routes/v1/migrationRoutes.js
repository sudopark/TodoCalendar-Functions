
const express = require('express');
const router = express.Router();

const MigrationController = require('../../controllers/migrationController');
const MigrationService = require('../../services/migrationService');
const MigrationRepository = require('../../repositories/migrationRepository');
const EventTimeRepository = require('../../repositories/eventTimeRangeRepository');
const EventTimeService = require('../../services/eventTimeRangeService');

const migrationController = new MigrationController(
    new MigrationService(
        new MigrationRepository(), 
        new EventTimeService(
            new EventTimeRepository()
        )
    )
)

router.post('/event_tags', async (req, res) => {
    await migrationController.postMigrationTags(req, res);
});

router.post('/todos', async (req, res) => {
    await migrationController.postMigrationTodos(req, res);
});

router.post('/schedules', async (req, res) => {
    await migrationController.postMigrationSchedules(req, res);
});

router.post('/event_details', async (req, res) => {
    await migrationController.postMigrationEventDetails(req, res);
});

router.post('/todos/done', async (req, res) => {
    await migrationController.postMigrationDoneTodoEvents(req, res);
});

router.post('/batch/eventTimes_migration', async (req, res) => {
    await migrationController.runMigrateEventTimeBatch(req, res)
})

module.exports = router;