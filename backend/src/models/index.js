const User = require('./User');
const RefreshToken = require('./RefreshToken');
const Project = require('./Project');
const ProjectMember = require('./ProjectMember');
const Task = require('./Task');
const ActivityLog = require('./ActivityLog');

// Define associations
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Project, { foreignKey: 'createdBy', as: 'createdProjects' });
Project.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Project.belongsToMany(User, { 
  through: ProjectMember, 
  foreignKey: 'projectId', 
  otherKey: 'userId',
  as: 'members' 
});
User.belongsToMany(Project, { 
  through: ProjectMember, 
  foreignKey: 'userId', 
  otherKey: 'projectId',
  as: 'projects' 
});

Project.hasMany(ProjectMember, { foreignKey: 'projectId', as: 'projectMembers' });
ProjectMember.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
ProjectMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Project.hasMany(Task, { foreignKey: 'projectId', as: 'tasks' });
Task.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

User.hasMany(Task, { foreignKey: 'assignedTo', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });

User.hasMany(Task, { foreignKey: 'createdBy', as: 'createdTasks' });
Task.belongsTo(User, { foreignKey: 'createdBy', as: 'taskCreator' });

User.hasMany(ActivityLog, { foreignKey: 'userId', as: 'activities' });
ActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  User,
  RefreshToken,
  Project,
  ProjectMember,
  Task,
  ActivityLog
};
