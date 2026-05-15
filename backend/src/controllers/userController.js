const { Op } = require('sequelize');
const { User, Task, Project, ProjectMember, ActivityLog } = require('../models');

// Get all users (Admin only)
exports.getUsers = async (req, res, next) => {
  try {
    const { search, role: roleFilter } = req.query;

    let whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (roleFilter) whereClause.role = roleFilter;

    const users = await User.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    next(error);
  }
};

// Get current user profile
exports.getMe = async (req, res, next) => {
  try {
    const { sub: userId } = req.user;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'role', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's tasks
    const tasks = await Task.findAll({
      where: { assignedTo: userId },
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Get user's projects
    const projectMembers = await ProjectMember.findAll({
      where: { userId },
      include: [
        { 
          model: Project, 
          as: 'project',
          attributes: ['id', 'name', 'status', 'deadline']
        }
      ]
    });

    // Get recent activity
    const activities = await ActivityLog.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Calculate stats
    const totalTasks = await Task.count({ where: { assignedTo: userId } });
    const completedTasks = await Task.count({ 
      where: { assignedTo: userId, status: 'Done' } 
    });
    const overdueTasks = await Task.count({
      where: {
        assignedTo: userId,
        status: { [Op.ne]: 'Done' },
        dueDate: { [Op.lt]: new Date() }
      }
    });

    res.json({
      success: true,
      data: {
        user,
        stats: {
          totalTasks,
          completedTasks,
          overdueTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        },
        tasks: tasks.map(t => {
          const taskData = t.toJSON();
          taskData.isOverdue = t.dueDate && t.status !== 'Done' && new Date() > new Date(t.dueDate);
          return taskData;
        }),
        projects: projectMembers.map(pm => pm.project),
        activities
      }
    });
  } catch (error) {
    next(error);
  }
};
