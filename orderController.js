const Order = require('../models/order.model');
const MenuItem = require('../models/menuItem.model');
const Payment = require('../models/payment.model');
const Vendor = require('../models/vendor.model');

// Place Order (Customer)
const placeOrder = async (req, res) => {
  try {
    const { items, deliveryAddress } = req.body;
    const userId = req.user._id;

    // Calculate total amount and validate items
    let totalAmount = 0;
    const validatedItems = [];
    const encounteredVendorIds = new Set();

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) {
        return res.status(400).json({ error: `Menu item ${item.menuItemId} not found` });
      }
      if (!menuItem.availability) {
        return res.status(400).json({ error: `Menu item ${menuItem.name} is not available` });
      }

      totalAmount += menuItem.price * item.quantity;
      encounteredVendorIds.add(menuItem.vendorId.toString());
      validatedItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        customNotes: item.customNotes || ''
      });
    }

    // Enforce single-vendor orders (frontend cart must not mix vendors)
    if (encounteredVendorIds.size > 1) {
      return res.status(400).json({ error: 'Order items must be from a single vendor' });
    }

    // Get vendor ID from validated items
    const firstMenuItem = await MenuItem.findById(items[0].menuItemId);
    const vendorId = firstMenuItem.vendorId;

    // Create order
    const order = new Order({
      userId,
      vendorId,
      items: validatedItems,
      totalAmount,
      deliveryAddress,
      status: 'ordered',
      paymentStatus: 'pending',
      deliveryStatus: 'pending'
    });

    const savedOrder = await order.save();
    await savedOrder.populate('vendorId', 'name location');
    await savedOrder.populate('items.menuItemId', 'name price');

    res.status(201).json({
      message: 'Order placed successfully',
      order: savedOrder
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get user's orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate('vendorId', 'name location')
      .populate('items.menuItemId', 'name price imageURL')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('vendorId', 'name location')
      .populate('items.menuItemId', 'name price imageURL');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user can access this order
    if (req.user.role === 'customer' && order.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update order status (Vendor/Admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['ordered', 'preparing', 'out_for_delivery', 'delivered'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if vendor owns this order
    if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ owner: req.user._id });
      if (!vendor || order.vendorId.toString() !== vendor._id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    order.status = status;
    if (status === 'out_for_delivery') {
      order.deliveryStatus = 'out_for_delivery';
    } else if (status === 'delivered') {
      order.deliveryStatus = 'delivered';
    }

    const updatedOrder = await order.save();
    await updatedOrder.populate('userId', 'name email');
    await updatedOrder.populate('vendorId', 'name location');

    res.json({
      message: 'Order status updated successfully',
      order: updatedOrder
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Cancel order
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user can cancel this order
    if (req.user.role === 'customer' && order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({ error: 'Cannot cancel delivered order' });
    }

    order.status = 'cancelled';
    await order.save();

    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get orders for vendor
const getVendorOrders = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ owner: req.user._id });
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    const orders = await Order.find({ vendorId: vendor._id })
      .populate('userId', 'name email')
      .populate('items.menuItemId', 'name price')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all orders (Admin)
const getAllOrders = async (req, res) => {
  try {
    const { status, vendorId, userId } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (vendorId) filter.vendorId = vendorId;
    if (userId) filter.userId = userId;

    const orders = await Order.find(filter)
      .populate('userId', 'name email')
      .populate('vendorId', 'name location')
      .populate('items.menuItemId', 'name price')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getVendorOrders,
  getAllOrders
};
