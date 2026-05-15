const { Op } = require('sequelize');
const { Task, Project, ProjectMember, User, ActivityLog } = require('../models');
const { validationResult } = require('express-validator');

// Helper to log activity
const logActivity = async (userId, action, entityType, entityId, details = {}, req) => {
  await ActivityLog.create({
    userId,
    action,
    entityType,
    entityId,
    details,
    ipAddress: req.ip
  });
};

// Get tasks for a project
exports.getTasks = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const { role, sub: userId } = req.user;
    const { status, priority, assignedTo, search, overdue } = req.query;

    // Check project access
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (role === 'member') {
      const isMember = await ProjectMember.findOne({
        where: { projectId, userId }
      });
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this project'
        });
      }
    }

    let whereClause = { projectId };
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (assignedTo) whereClause.assignedTo = assignedTo;
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const tasks = await Task.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'taskCreator', attributes: ['id', 'name', 'email'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] }
      ],
      order: [
        ['createdAt', 'DESC']
      ]
    });

    // Add overdue flag manually since VIRTUAL might not serialize
    const tasksWithOverdue = tasks.map(task => {
      const taskData = task.toJSON();
      taskData.isOverdue = task.dueDate && task.status !== 'Done' && new Date() > new Date(task.dueDate);
      return taskData;
    });

    // Filter overdue if requested
    let filteredTasks = tasksWithOverdue;
    if (overdue === 'true') {
      filteredTasks = tasksWithOverdue.filter(t => t.isOverdue);
    }

    res.json({
      success: true,
      data: { tasks: filteredTasks }
    });
  } catch (error) {
    next(error);
  }
};

// Create task (Admin only)
exports.createTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id: projectId } = req.params;
    const { title, description, priority, status, dueDate, assignedTo } = req.body;
    const { sub: userId } = req.user;

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Validate assigned user is a project member
    if (assignedTo) {
      const isMember = await ProjectMember.findOne({
        where: { projectId, userId: assignedTo }
      });
      if (!isMember) {
        return res.status(400).json({
          success: false,
          message: 'Assigned user is not a member of this project'
        });
      }
    }

    const task = await Task.create({
      title,
      description,
      priority: priority || 'Medium',
      status: status || 'Todo',
      dueDate: dueDate || null,
      projectId,
      assignedTo: assignedTo || null,
      createdBy: userId
    });

    const createdTask = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'taskCreator', attributes: ['id', 'name', 'email'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] }
      ]
    });

    await logActivity(userId, 'CREATE', 'task', task.id, { 
      title, 
      projectName: project.name 
    }, req);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task: createdTask }
    });
  } catch (error) {
    next(error);
  }
};

// Update task
exports.updateTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { title, description, priority, status, dueDate, assignedTo } = req.body;
    const { role, sub: userId } = req.user;

    const task = await Task.findByPk(id, {
      include: [{ model: Project, as: 'project' }]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Members can only update their own tasks
    if (role === 'member') {
      if (task.assignedTo !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update tasks assigned to you'
        });
      }
      // Members can only update status
      const allowedUpdates = { status };
      await task.update(allowedUpdates);
    } else {
      // Admin can update everything
      if (assignedTo) {
        const isMember = await ProjectMember.findOne({
          where: { projectId: task.projectId, userId: assignedTo }
        });
        if (!isMember) {
          return res.status(400).json({
            success: false,
            message: 'Assigned user is not a member of this project'
          });
        }
      }

      await task.update({
        title: title || task.title,
        description: description !== undefined ? description : task.description,
        priority: priority || task.priority,
        status: status || task.status,
        dueDate: dueDate !== undefined ? dueDate : task.dueDate,
        assignedTo: assignedTo !== undefined ? assignedTo : task.assignedTo
      });
    }

    await logActivity(userId, 'UPDATE', 'task', task.id, { 
      title: task.title,
      projectName: task.project?.name 
    }, req);

    const updatedTask = await Task.findByPk(id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'taskCreator', attributes: ['id', 'name', 'email'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] }
      ]
    });

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task: updatedTask }
    });
  } catch (error) {
    next(error);
  }
};

// Update task status (PATCH endpoint)
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status } = req.body;
    const { role, sub: userId } = req.user;

    const task = await Task.findByPk(id, {
      include: [{ model: Project, as: 'project' }]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Members can only update their own tasks
    if (role === 'member' && task.assignedTo !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update tasks assigned to you'
      });
    }

    await task.update({ status });

    await logActivity(userId, 'UPDATE_STATUS', 'task', task.id, { 
      title: task.title,
      newStatus: status,
      projectName: task.project?.name 
    }, req);

    const updatedTask = await Task.findByPk(id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] }
      ]
    });

    res.json({
      success: true,
      message: 'Task status updated successfully',
      data: { task: updatedTask }
    });
  } catch (error) {
    next(error);
  }
};

// Delete task (Admin only)
exports.deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sub: userId } = req.user;

    const task = await Task.findByPk(id, {
      include: [{ model: Project, as: 'project' }]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await logActivity(userId, 'DELETE', 'task', task.id, { 
      title: task.title,
      projectName: task.project?.name 
    }, req);

    await task.destroy();

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
