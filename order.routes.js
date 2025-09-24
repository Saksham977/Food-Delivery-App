const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateOrder, validateObjectId } = require('../middleware/validation');
const {
  placeOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getVendorOrders,
  getAllOrders
} = require('../controllers/orderController');

// Place Order (Customer)
router.post('/', authenticateToken, authorizeRoles('customer'), validateOrder, placeOrder);

// Get user's orders
router.get('/my-orders', authenticateToken, getMyOrders);

// Get order by ID
router.get('/:id', authenticateToken, validateObjectId('id'), getOrderById);

// Update order status (Vendor/Admin)
router.put('/:id/status', authenticateToken, authorizeRoles('vendor', 'admin'), validateObjectId('id'), updateOrderStatus);

// Cancel order
router.put('/:id/cancel', authenticateToken, validateObjectId('id'), cancelOrder);

// Get orders for vendor
router.get('/vendor/orders', authenticateToken, authorizeRoles('vendor'), getVendorOrders);

// Get all orders (Admin)
router.get('/', authenticateToken, authorizeRoles('admin'), getAllOrders);

module.exports = router;
