const { Op } = require('sequelize');
const { Project, Task, User, ProjectMember, ActivityLog } = require('../models');

exports.getDashboard = async (req, res, next) => {
  try {
    const { role, sub: userId } = req.user;

    let projectIds = [];
    let whereClause = {};

    if (role === 'member') {
      const memberProjects = await ProjectMember.findAll({
        where: { userId },
        attributes: ['projectId']
      });
      projectIds = memberProjects.map(pm => pm.projectId);
      whereClause = { id: { [Op.in]: projectIds } };
    }

    // Stats
    const totalProjects = await Project.count({ where: whereClause });
    const activeProjects = await Project.count({ 
      where: { ...whereClause, status: 'Active' } 
    });
    const completedProjects = await Project.count({ 
      where: { ...whereClause, status: 'Completed' } 
    });

    let taskWhere = {};
    if (role === 'member') {
      taskWhere = { projectId: { [Op.in]: projectIds } };
    }

    const totalTasks = await Task.count({ where: taskWhere });
    const completedTasks = await Task.count({ 
      where: { ...taskWhere, status: 'Done' } 
    });
    const inProgressTasks = await Task.count({ 
      where: { ...taskWhere, status: 'In Progress' } 
    });
    const reviewTasks = await Task.count({ 
      where: { ...taskWhere, status: 'Review' } 
    });
    const todoTasks = await Task.count({ 
      where: { ...taskWhere, status: 'Todo' } 
    });
    const overdueTasks = await Task.count({
      where: {
        ...taskWhere,
        status: { [Op.ne]: 'Done' },
        dueDate: { [Op.lt]: new Date() }
      }
    });

    // High priority tasks
    const highPriorityTasks = await Task.count({
      where: { ...taskWhere, priority: 'High', status: { [Op.ne]: 'Done' } }
    });

    // Recent activity
    let activityWhere = {};
    if (role === 'member') {
      activityWhere = { userId };
    }

    const recentActivity = await ActivityLog.findAll({
      where: activityWhere,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 15
    });

    // Project progress
    const projects = await Project.findAll({
      where: whereClause,
      include: [
        { model: Task, as: 'tasks', attributes: ['id', 'status'] }
      ]
    });

    const projectProgress = projects.map(project => {
      const tasks = project.tasks || [];
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'Done').length;
      return {
        id: project.id,
        name: project.name,
        totalTasks: total,
        completedTasks: completed,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    }).sort((a, b) => b.progress - a.progress);

    // Priority distribution
    const priorityDistribution = {
      High: await Task.count({ where: { ...taskWhere, priority: 'High' } }),
      Medium: await Task.count({ where: { ...taskWhere, priority: 'Medium' } }),
      Low: await Task.count({ where: { ...taskWhere, priority: 'Low' } })
    };

    // My tasks (for current user)
    const myTasks = role === 'member' ? await Task.findAll({
      where: { assignedTo: userId },
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name'] }
      ],
      order: [['dueDate', 'ASC']],
      limit: 10
    }) : [];

    res.json({
      success: true,
      data: {
        stats: {
          totalProjects,
          activeProjects,
          completedProjects,
          totalTasks,
          completedTasks,
          inProgressTasks,
          reviewTasks,
          todoTasks,
          overdueTasks,
          highPriorityTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        },
        projectProgress,
        priorityDistribution,
        recentActivity,
        myTasks: myTasks.map(t => {
          const taskData = t.toJSON();
          taskData.isOverdue = t.dueDate && t.status !== 'Done' && new Date() > new Date(t.dueDate);
          return taskData;
        })
      }
    });
  } catch (error) {
    next(error);
  }
};
