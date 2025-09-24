const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Register user
const registerUser = async (req, res) => {
  try {
    const { name, email, passwordHash, role, addresses } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(passwordHash, saltRounds);

    const user = new User({ 
      name, 
      email, 
      passwordHash: hashedPassword, 
      role: role || 'customer', 
      addresses: addresses || [] 
    });
    
    const savedUser = await user.save();
    
    // Generate token
    const token = generateToken(savedUser._id);
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        addresses: savedUser.addresses
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { email, passwordHash } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(passwordHash, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        addresses: user.addresses
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get current user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const { name, addresses } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, addresses },
      { new: true, runValidators: true }
    ).select('-passwordHash');
    
    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all users (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getAllUsers
};
