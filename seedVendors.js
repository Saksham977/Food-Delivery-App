const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Vendor = require('../models/vendor.model');
const User = require('../models/user.model');

connectDB();

const seedVendors = async () => {
  try {
    let vendorUser = await User.findOne({ role: 'vendor' });

    if (!vendorUser) {
      vendorUser = new User({
        name: 'Auto Vendor',
        email: 'autovendor@example.com',
        passwordHash: 'autopass123',
        role: 'vendor',
        addresses: [{
          label: 'HQ',
          line1: '789 Vendor Lane',
          line2: '',
          city: 'Faridabad',
          zip: '121009'
        }]
      });
      await vendorUser.save();
      console.log('✅ Vendor user created');
    }

    const vendors = [
      {
        name: 'Saksham Snacks',
        description: 'Fast and fresh bites',
        location: 'Faridabad Sector 15',
        owner: vendorUser._id
      },
      {
        name: 'Masala Magic',
        description: 'Authentic Indian flavors',
        location: 'Faridabad Sector 21',
        owner: vendorUser._id
      }
    ];

    await Vendor.insertMany(vendors);
    console.log('✅ Vendors seeded');
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
  } finally {
    mongoose.connection.close();
  }
};

seedVendors();
