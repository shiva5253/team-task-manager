const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate, authorize } = require('../middleware/auth');
const { projectValidation, memberValidation, uuidParamValidation } = require('../middleware/validation');

router.get('/', authenticate, projectController.getProjects);
router.post('/', authenticate, authorize('admin'), projectValidation, projectController.createProject);
router.get('/:id', authenticate, uuidParamValidation, projectController.getProject);
router.put('/:id', authenticate, authorize('admin'), uuidParamValidation, projectValidation, projectController.updateProject);
router.delete('/:id', authenticate, authorize('admin'), uuidParamValidation, projectController.deleteProject);
router.post('/:id/members', authenticate, authorize('admin'), uuidParamValidation, memberValidation, projectController.addMember);
router.delete('/:id/members/:userId', authenticate, authorize('admin'), uuidParamValidation, projectController.removeMember);

module.exports = router;
