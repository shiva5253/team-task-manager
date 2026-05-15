const { Op } = require('sequelize');
const { Project, ProjectMember, User, Task, ActivityLog } = require('../models');
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

// Get all projects (Admin sees all, Member sees assigned)
exports.getProjects = async (req, res, next) => {
  try {
    const { role, sub: userId } = req.user;
    const { status, search } = req.query;

    let whereClause = {};
    if (status) whereClause.status = status;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    let projects;
    if (role === 'admin') {
      projects = await Project.findAll({
        where: whereClause,
        include: [
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
          { 
            model: User, 
            as: 'members', 
            attributes: ['id', 'name', 'email'],
            through: { attributes: ['role'] }
          },
          { 
            model: Task, 
            as: 'tasks',
            attributes: ['id', 'status', 'priority']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    } else {
      // Member: only see projects they're assigned to
      const memberProjects = await ProjectMember.findAll({
        where: { userId },
        attributes: ['projectId']
      });
      const projectIds = memberProjects.map(pm => pm.projectId);

      projects = await Project.findAll({
        where: { 
          ...whereClause,
          id: { [Op.in]: projectIds } 
        },
        include: [
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
          { 
            model: User, 
            as: 'members', 
            attributes: ['id', 'name', 'email'],
            through: { attributes: ['role'] }
          },
          { 
            model: Task, 
            as: 'tasks',
            attributes: ['id', 'status', 'priority']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    }

    res.json({
      success: true,
      data: { projects }
    });
  } catch (error) {
    next(error);
  }
};

// Get single project
exports.getProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, sub: userId } = req.user;

    const project = await Project.findByPk(id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { 
          model: User, 
          as: 'members', 
          attributes: ['id', 'name', 'email'],
          through: { attributes: ['role'] }
        },
        { 
          model: Task, 
          as: 'tasks',
          include: [
            { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }
          ]
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check access for members
    if (role === 'member') {
      const isMember = await ProjectMember.findOne({
        where: { projectId: id, userId }
      });
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this project'
        });
      }
    }

    res.json({
      success: true,
      data: { project }
    });
  } catch (error) {
    next(error);
  }
};

// Create project (Admin only)
exports.createProject = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, deadline, status } = req.body;
    const { sub: userId } = req.user;

    const project = await Project.create({
      name,
      description,
      deadline: deadline || null,
      status: status || 'Active',
      createdBy: userId
    });

    // Add creator as project lead
    await ProjectMember.create({
      projectId: project.id,
      userId,
      role: 'lead'
    });

    const createdProject = await Project.findByPk(project.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { 
          model: User, 
          as: 'members', 
          attributes: ['id', 'name', 'email'],
          through: { attributes: ['role'] }
        }
      ]
    });

    await logActivity(userId, 'CREATE', 'project', project.id, { name }, req);

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { project: createdProject }
    });
  } catch (error) {
    next(error);
  }
};

// Update project (Admin only)
exports.updateProject = async (req, res, next) => {
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
    const { name, description, deadline, status } = req.body;
    const { sub: userId } = req.user;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    await project.update({
      name: name || project.name,
      description: description !== undefined ? description : project.description,
      deadline: deadline !== undefined ? deadline : project.deadline,
      status: status || project.status
    });

    await logActivity(userId, 'UPDATE', 'project', project.id, { name: project.name }, req);

    const updatedProject = await Project.findByPk(id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { 
          model: User, 
          as: 'members', 
          attributes: ['id', 'name', 'email'],
          through: { attributes: ['role'] }
        }
      ]
    });

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: { project: updatedProject }
    });
  } catch (error) {
    next(error);
  }
};

// Delete project (Admin only)
exports.deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sub: userId } = req.user;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    await logActivity(userId, 'DELETE', 'project', project.id, { name: project.name }, req);
    await project.destroy();

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Add member to project (Admin only)
exports.addMember = async (req, res, next) => {
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
    const { userId, role = 'member' } = req.body;
    const { sub: adminId } = req.user;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already a member
    const existingMember = await ProjectMember.findOne({
      where: { projectId: id, userId }
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this project'
      });
    }

    await ProjectMember.create({
      projectId: id,
      userId,
      role
    });

    await logActivity(adminId, 'ADD_MEMBER', 'project', id, { 
      projectName: project.name, 
      memberName: user.name,
      memberRole: role 
    }, req);

    const updatedProject = await Project.findByPk(id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { 
          model: User, 
          as: 'members', 
          attributes: ['id', 'name', 'email'],
          through: { attributes: ['role'] }
        }
      ]
    });

    res.json({
      success: true,
      message: 'Member added successfully',
      data: { project: updatedProject }
    });
  } catch (error) {
    next(error);
  }
};

// Remove member from project (Admin only)
exports.removeMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const { sub: adminId } = req.user;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const member = await ProjectMember.findOne({
      where: { projectId: id, userId }
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in this project'
      });
    }

    // Prevent removing the creator
    if (project.createdBy === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the project creator'
      });
    }

    const user = await User.findByPk(userId);
    await member.destroy();

    await logActivity(adminId, 'REMOVE_MEMBER', 'project', id, { 
      projectName: project.name, 
      memberName: user?.name 
    }, req);

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    next(error);
  }
};
