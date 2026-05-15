const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User, RefreshToken } = require('../models');
const { validationResult } = require('express-validator');

// Generate tokens
const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      sub: user.id, 
      email: user.email, 
      role: user.role,
      name: user.name 
    },
    process.env.JWT_ACCESS_SECRET,
    { 
      expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
      issuer: 'team-task-manager',
      audience: 'team-task-manager-api'
    }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Register
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({ name, email, password, role: 'member' });
    const safeUser = user.toJSON();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user: safeUser }
    });
  } catch (error) {
    next(error);
  }
};

// Login
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    console.log('Login attempt:', { email, passwordLength: password ? password.length : 0, password });

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = RefreshToken.hashToken(rawRefreshToken);

    // Store refresh token hash
    await RefreshToken.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']?.substring(0, 255)
    });

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh-token'
    });

    const safeUser = user.toJSON();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: safeUser,
        accessToken,
        expiresIn: 900 // 15 minutes in seconds
      }
    });
  } catch (error) {
    next(error);
  }
};

// Refresh Token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided'
      });
    }

    const tokenHash = RefreshToken.hashToken(refreshToken);

    // Find valid refresh token
    const storedToken = await RefreshToken.findOne({
      where: {
        tokenHash,
        revoked: false,
        expiresAt: { [require('sequelize').Op.gt]: new Date() }
      },
      include: [{ model: User, as: 'user' }]
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Check if token was already used (reuse detection)
    if (storedToken.revoked) {
      // Revoke all tokens for this user
      await RefreshToken.update(
        { revoked: true, revokedAt: new Date() },
        { where: { userId: storedToken.userId, revoked: false } }
      );
      return res.status(401).json({
        success: false,
        message: 'Token reuse detected. Please login again.'
      });
    }

    // Revoke old token
    await storedToken.update({ revoked: true, revokedAt: new Date() });

    // Generate new tokens
    const newAccessToken = generateAccessToken(storedToken.user);
    const newRawRefreshToken = generateRefreshToken();
    const newTokenHash = RefreshToken.hashToken(newRawRefreshToken);

    // Store new refresh token
    await RefreshToken.create({
      userId: storedToken.userId,
      tokenHash: newTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']?.substring(0, 255)
    });

    // Set new refresh token cookie
    res.cookie('refreshToken', newRawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth/refresh-token'
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        expiresIn: 900
      }
    });
  } catch (error) {
    next(error);
  }
};

// Logout
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      const tokenHash = RefreshToken.hashToken(refreshToken);
      await RefreshToken.update(
        { revoked: true, revokedAt: new Date() },
        { where: { tokenHash } }
      );
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh-token'
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Logout all sessions
exports.logoutAll = async (req, res, next) => {
  try {
    await RefreshToken.update(
      { revoked: true, revokedAt: new Date() },
      { where: { userId: req.user.sub, revoked: false } }
    );

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh-token'
    });

    res.json({
      success: true,
      message: 'All sessions logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};
