const mongoose = require('mongoose');
const connectDB = require('../config/db'); // ✅ Correct relative path
const User = require('../models/user.model'); // ✅ Correct model import

connectDB();

const runTest = async () => {
  try {
    const newUser = new User({
      name: 'Saksham',
      email: 'saksham@example.com',
      passwordHash: 'hashedpassword123',
      role: 'customer',
      addresses: [
        {
          label: 'Home',
          line1: '123 Main St',
          line2: 'Sector 15',
          city: 'Faridabad',
          zip: '121007'
        }
      ]
    });

    const savedUser = await newUser.save();
    console.log('✅ User saved:', savedUser);
    mongoose.connection.close();
  } catch (err) {
    console.error('❌ Error inserting user:', err.message);
    mongoose.connection.close();
  }
};

runTest();