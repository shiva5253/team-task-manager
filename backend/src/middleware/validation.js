const { body, param } = require('express-validator');

exports.registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

exports.loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

exports.projectValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Project name is required')
    .isLength({ min: 1, max: 200 }).withMessage('Name must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim(),
  body('deadline')
    .optional()
    .isISO8601().withMessage('Please provide a valid date'),
  body('status')
    .optional()
    .isIn(['Active', 'Completed', 'On Hold']).withMessage('Status must be Active, Completed, or On Hold')
];

exports.taskValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Task title is required')
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim(),
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High']).withMessage('Priority must be Low, Medium, or High'),
  body('status')
    .optional()
    .isIn(['Todo', 'In Progress', 'Review', 'Done']).withMessage('Status must be Todo, In Progress, Review, or Done'),
  body('dueDate')
    .optional()
    .isISO8601().withMessage('Please provide a valid due date'),
  body('assignedTo')
    .optional()
    .isUUID().withMessage('Invalid user ID')
];

exports.taskStatusValidation = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['Todo', 'In Progress', 'Review', 'Done']).withMessage('Invalid status')
];

exports.memberValidation = [
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isUUID().withMessage('Invalid user ID'),
  body('role')
    .optional()
    .isIn(['lead', 'member']).withMessage('Role must be lead or member')
];

exports.uuidParamValidation = [
  param('id')
    .isUUID().withMessage('Invalid ID format')
];
