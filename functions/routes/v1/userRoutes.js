
const express = require('express');
const router = express.Router();

const UserController = require('../../controllers/userController');
const UserService = require('../../services/userService');
const UserRepository = require('../../repositories/userRepository');

const userController = new UserController(
    new UserService(
        new UserRepository()
    )
)

router.put('/notification', async (req, res) => {
    await userController.updateNotificationToken(req, res);
});

router.delete('/notification', async (req, res) => {
    await userController.removeNotificationToken(req, res);
});

router

module.exports = router;