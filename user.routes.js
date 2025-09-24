const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getAllUsers
} = require('../controllers/userController');

// Register
router.post('/register', validateUserRegistration, registerUser);

// Login
router.post('/login', validateUserLogin, loginUser);

// Get current user profile
router.get('/profile', authenticateToken, getUserProfile);

// Update user profile
router.put('/profile', authenticateToken, updateUserProfile);

// Get all users (Admin only)
router.get('/', authenticateToken, authorizeRoles('admin'), getAllUsers);

module.exports = router;
