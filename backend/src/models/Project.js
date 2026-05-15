const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Project name is required' },
      len: { args: [1, 200], msg: 'Name must be between 1 and 200 characters' }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Active', 'Completed', 'On Hold'),
    defaultValue: 'Active',
    allowNull: false
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: true,
    validate: {
      isDate: { msg: 'Please provide a valid date' }
    }
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'projects'
});

module.exports = Project;
