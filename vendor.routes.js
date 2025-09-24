const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateVendor, validateObjectId } = require('../middleware/validation');
const {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  getMyVendorProfile,
  getVendorAnalytics,
  getVendorsByOwner,
  deleteVendor
} = require('../controllers/vendorController');

// GET all vendors (Public)
router.get('/', getAllVendors);

// GET vendor by ID (Public)
router.get('/:id', validateObjectId('id'), getVendorById);

// CREATE vendor (Authenticated users)
router.post('/', authenticateToken, validateVendor, createVendor);

// UPDATE vendor (Owner only)
router.put('/:id', authenticateToken, authorizeRoles('vendor'), validateObjectId('id'), validateVendor, updateVendor);

// GET vendor's own profile
router.get('/profile/my-vendor', authenticateToken, authorizeRoles('vendor'), getMyVendorProfile);

// GET vendor analytics
router.get('/:id/analytics', authenticateToken, authorizeRoles('vendor'), validateObjectId('id'), getVendorAnalytics);

// GET vendors by owner (Admin)
router.get('/owner/:userId', authenticateToken, authorizeRoles('admin'), validateObjectId('userId'), getVendorsByOwner);

// DELETE vendor (Owner or Admin)
router.delete('/:id', authenticateToken, authorizeRoles('vendor', 'admin'), validateObjectId('id'), deleteVendor);

module.exports = router;
