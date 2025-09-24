const express = require('express');
const router = express.Router();
const Payment = require('../models/payment.model');
const Order = require('../models/order.model');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validatePayment, validateObjectId } = require('../middleware/validation');

// Initiate Payment (Customer)
router.post('/initiate', authenticateToken, authorizeRoles('customer'), validatePayment, async (req, res) => {
  try {
    const { orderId, gateway, method, amount } = req.body;

    // Verify order exists and belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (order.paymentStatus === 'completed') {
      return res.status(400).json({ error: 'Order already paid' });
    }

    if (order.totalAmount !== amount) {
      return res.status(400).json({ error: 'Amount mismatch' });
    }

    // Generate transaction ID (in real app, this would come from payment gateway)
    const transactionId = `${gateway}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create payment record
    const payment = new Payment({
      orderId,
      gateway,
      transactionId,
      amount,
      method,
      status: 'initiated'
    });

    const savedPayment = await payment.save();
    await savedPayment.populate('orderId', 'totalAmount status');

    res.status(201).json({
      message: 'Payment initiated successfully',
      payment: savedPayment,
      // In real app, you would return payment gateway details here
      gatewayResponse: {
        transactionId: savedPayment.transactionId,
        amount: savedPayment.amount,
        gateway: savedPayment.gateway,
        upiId: process.env.UPI_ID || 'setia18saksham-1@oksbi',
        paymentUrl: `upi://pay?pa=${process.env.UPI_ID || 'setia18saksham-1@oksbi'}&pn=Foodie&am=${amount}&cu=INR&tn=Food Order Payment`
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Handle Payment Success
router.post('/success', authenticateToken, async (req, res) => {
  try {
    const { transactionId, gatewayResponse } = req.body;

    const payment = await Payment.findOne({ transactionId });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status === 'success') {
      return res.status(400).json({ error: 'Payment already processed' });
    }

    // Update payment status
    payment.status = 'success';
    await payment.save();

    // Update order payment status
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = 'completed';
      await order.save();
    }

    res.json({
      message: 'Payment successful',
      payment,
      order: order
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Handle Payment Failure
router.post('/failure', authenticateToken, async (req, res) => {
  try {
    const { transactionId, reason } = req.body;

    const payment = await Payment.findOne({ transactionId });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Update payment status
    payment.status = 'failed';
    await payment.save();

    // Update order payment status
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = 'pending';
      await order.save();
    }

    res.json({
      message: 'Payment failed',
      payment,
      reason: reason || 'Payment processing failed'
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Retry Payment
router.post('/retry', authenticateToken, authorizeRoles('customer'), async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (order.paymentStatus === 'completed') {
      return res.status(400).json({ error: 'Order already paid' });
    }

    // Find the last failed payment for this order
    const lastPayment = await Payment.findOne({ 
      orderId, 
      status: 'failed' 
    }).sort({ createdAt: -1 });

    if (!lastPayment) {
      return res.status(400).json({ error: 'No failed payment found to retry' });
    }

    // Create new payment with same details
    const newTransactionId = `${lastPayment.gateway}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const payment = new Payment({
      orderId,
      gateway: lastPayment.gateway,
      transactionId: newTransactionId,
      amount: lastPayment.amount,
      method: lastPayment.method,
      status: 'initiated'
    });

    const savedPayment = await payment.save();

    res.status(201).json({
      message: 'Payment retry initiated',
      payment: savedPayment
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get payment by transaction ID
router.get('/transaction/:transactionId', authenticateToken, async (req, res) => {
  try {
    const payment = await Payment.findOne({ transactionId: req.params.transactionId })
      .populate('orderId', 'totalAmount status userId');

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if user can access this payment
    if (req.user.role === 'customer' && payment.orderId.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get payments for order
router.get('/order/:orderId', authenticateToken, validateObjectId('orderId'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user can access this order's payments
    if (req.user.role === 'customer' && order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const payments = await Payment.find({ orderId: req.params.orderId })
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's payment history
router.get('/my-payments', authenticateToken, authorizeRoles('customer'), async (req, res) => {
  try {
    const userOrders = await Order.find({ userId: req.user._id }).select('_id');
    const orderIds = userOrders.map(order => order._id);

    const payments = await Payment.find({ orderId: { $in: orderIds } })
      .populate('orderId', 'totalAmount status')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all payments (Admin)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { status, gateway, method } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (gateway) filter.gateway = gateway;
    if (method) filter.method = method;

    const payments = await Payment.find(filter)
      .populate('orderId', 'totalAmount status userId')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process refund (Admin)
router.post('/refund', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { transactionId, reason } = req.body;

    const payment = await Payment.findOne({ transactionId });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'success') {
      return res.status(400).json({ error: 'Can only refund successful payments' });
    }

    // Update payment status
    payment.status = 'refunded';
    await payment.save();

    // Update order payment status
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = 'refunded';
      await order.save();
    }

    res.json({
      message: 'Refund processed successfully',
      payment,
      reason: reason || 'Refund processed'
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
