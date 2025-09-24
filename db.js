// config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodDeliveryDB';
    await mongoose.connect(mongoURI);
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ MongoDB connected successfully');
    }
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
