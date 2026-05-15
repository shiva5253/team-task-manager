const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const crypto = require('crypto');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  tokenHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  revoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  userAgent: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'refresh_tokens',
  indexes: [
    { fields: ['tokenHash'] },
    { fields: ['userId'] },
    { fields: ['expiresAt'] }
  ]
});

// Static method to hash token
RefreshToken.hashToken = function(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = RefreshToken;
