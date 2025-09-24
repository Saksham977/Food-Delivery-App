// app.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('../config/db');
const { errorHandler, notFound } = require('../middleware/errorHandler');

// Import routes
const userRoutes = require('../routes/user.routes');
const vendorRoutes = require('../routes/vendor.routes');
const orderRoutes = require('../routes/order.routes');
const menuItemRoutes = require('../routes/menuItem.routes');
const paymentRoutes = require('../routes/payment.routes');
const reviewRoutes = require('../routes/review.routes');
const deliveryAgentRoutes = require('../routes/deliveryAgent.routes');

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3001',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/delivery-agents', deliveryAgentRoutes);

// Health check endpoint
app.get('/', (req, res) => res.json({ 
  message: '🚀 Food Delivery API is running',
  version: '1.0.0',
  timestamp: new Date().toISOString()
}));

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🟢 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  }
});
