const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate, authorize } = require('../middleware/auth');
const { taskValidation, taskStatusValidation, uuidParamValidation } = require('../middleware/validation');

router.get('/:id/tasks', authenticate, uuidParamValidation, taskController.getTasks);
router.post('/:id/tasks', authenticate, authorize('admin'), uuidParamValidation, taskValidation, taskController.createTask);
router.put('/tasks/:id', authenticate, uuidParamValidation, taskValidation, taskController.updateTask);
router.patch('/tasks/:id/status', authenticate, uuidParamValidation, taskStatusValidation, taskController.updateTaskStatus);
router.delete('/tasks/:id', authenticate, authorize('admin'), uuidParamValidation, taskController.deleteTask);

module.exports = router;
