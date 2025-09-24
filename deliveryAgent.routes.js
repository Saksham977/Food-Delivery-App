const express = require('express');
const router = express.Router();
const DeliveryAgent = require('../models/deliveryAgent.model');
const Order = require('../models/order.model');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

// Create delivery agent (Admin)
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, contact, currentLocation } = req.body;

    const deliveryAgent = new DeliveryAgent({
      name,
      contact,
      currentLocation: currentLocation || { type: 'Point', coordinates: [0, 0] },
      currentOrders: []
    });

    const savedAgent = await deliveryAgent.save();
    res.status(201).json({
      message: 'Delivery agent created successfully',
      agent: savedAgent
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all delivery agents
router.get('/', authenticateToken, authorizeRoles('admin', 'vendor'), async (req, res) => {
  try {
    const agents = await DeliveryAgent.find()
      .populate('currentOrders', 'status totalAmount deliveryAddress')
      .sort({ createdAt: -1 });

    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get delivery agent by ID
router.get('/:id', authenticateToken, validateObjectId('id'), async (req, res) => {
  try {
    const agent = await DeliveryAgent.findById(req.params.id)
      .populate('currentOrders', 'status totalAmount deliveryAddress userId vendorId');

    if (!agent) {
      return res.status(404).json({ error: 'Delivery agent not found' });
    }

    // Check if user can access this agent
    if (req.user.role === 'deliveryAgent' && agent._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update delivery agent location
router.put('/:id/location', authenticateToken, authorizeRoles('deliveryAgent'), validateObjectId('id'), async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Valid latitude and longitude required' });
    }

    const agent = await DeliveryAgent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Delivery agent not found' });
    }

    // Check if agent is updating their own location
    if (req.user.role === 'deliveryAgent' && agent._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    agent.currentLocation = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };

    const updatedAgent = await agent.save();
    res.json({
      message: 'Location updated successfully',
      agent: updatedAgent
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Accept delivery assignment
router.post('/:id/accept-delivery', authenticateToken, authorizeRoles('deliveryAgent'), validateObjectId('id'), async (req, res) => {
  try {
    const { orderId } = req.body;

    const agent = await DeliveryAgent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Delivery agent not found' });
    }

    // Check if agent is accepting their own assignment
    if (req.user.role === 'deliveryAgent' && agent._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.deliveryStatus !== 'pending') {
      return res.status(400).json({ error: 'Order is not available for delivery' });
    }

    // Add order to agent's current orders
    if (!agent.currentOrders.includes(orderId)) {
      agent.currentOrders.push(orderId);
      await agent.save();
    }

    // Update order status
    order.deliveryStatus = 'out_for_delivery';
    order.status = 'out_for_delivery';
    await order.save();

    res.json({
      message: 'Delivery accepted successfully',
      order,
      agent
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update delivery status
router.put('/:id/update-status', authenticateToken, authorizeRoles('deliveryAgent'), validateObjectId('id'), async (req, res) => {
  try {
    const { orderId, status, notes } = req.body;

    const validStatuses = ['out_for_delivery', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid delivery status' });
    }

    const agent = await DeliveryAgent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Delivery agent not found' });
    }

    // Check if agent is updating their own delivery
    if (req.user.role === 'deliveryAgent' && agent._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!agent.currentOrders.includes(orderId)) {
      return res.status(400).json({ error: 'Order not assigned to this agent' });
    }

    // Update order status
    order.deliveryStatus = status;
    if (status === 'delivered') {
      order.status = 'delivered';
      // Remove from agent's current orders
      agent.currentOrders = agent.currentOrders.filter(id => id.toString() !== orderId);
      await agent.save();
    }

    await order.save();

    res.json({
      message: 'Delivery status updated successfully',
      order,
      notes: notes || ''
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get delivery history
router.get('/:id/history', authenticateToken, authorizeRoles('deliveryAgent'), validateObjectId('id'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const agent = await DeliveryAgent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Delivery agent not found' });
    }

    // Check if agent is accessing their own history
    if (req.user.role === 'deliveryAgent' && agent._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get delivered orders
    const deliveredOrders = await Order.find({
      deliveryStatus: 'delivered',
      _id: { $in: agent.currentOrders }
    })
      .populate('userId', 'name email')
      .populate('vendorId', 'name location')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments({
      deliveryStatus: 'delivered',
      _id: { $in: agent.currentOrders }
    });

    res.json({
      orders: deliveredOrders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign delivery to agent (Admin/Vendor)
router.post('/:id/assign', authenticateToken, authorizeRoles('admin', 'vendor'), validateObjectId('id'), async (req, res) => {
  try {
    const { orderId } = req.body;

    const agent = await DeliveryAgent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Delivery agent not found' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.deliveryStatus !== 'pending') {
      return res.status(400).json({ error: 'Order is not available for delivery assignment' });
    }

    // Add order to agent's current orders
    if (!agent.currentOrders.includes(orderId)) {
      agent.currentOrders.push(orderId);
      await agent.save();
    }

    res.json({
      message: 'Delivery assigned successfully',
      order,
      agent
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update delivery agent profile
router.put('/:id', authenticateToken, authorizeRoles('deliveryAgent'), validateObjectId('id'), async (req, res) => {
  try {
    const { name, contact } = req.body;

    const agent = await DeliveryAgent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Delivery agent not found' });
    }

    // Check if agent is updating their own profile
    if (req.user.role === 'deliveryAgent' && agent._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (name) agent.name = name;
    if (contact) agent.contact = contact;

    const updatedAgent = await agent.save();
    res.json({
      message: 'Profile updated successfully',
      agent: updatedAgent
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete delivery agent (Admin)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const agent = await DeliveryAgent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Delivery agent not found' });
    }

    // Check if agent has active deliveries
    if (agent.currentOrders.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete agent with active deliveries' 
      });
    }

    await DeliveryAgent.findByIdAndDelete(req.params.id);
    res.json({ message: 'Delivery agent deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
