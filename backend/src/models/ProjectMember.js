const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const ProjectMember = sequelize.define('ProjectMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  role: {
    type: DataTypes.ENUM('lead', 'member'),
    defaultValue: 'member',
    allowNull: false
  }
}, {
  tableName: 'project_members',
  indexes: [
    { 
      unique: true, 
      fields: ['projectId', 'userId'],
      name: 'unique_project_member'
    }
  ]
});

module.exports = ProjectMember;
