const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

// Import models
const User = require('../models/user.model');
const Vendor = require('../models/vendor.model');
const MenuItem = require('../models/menuItem.model');
const Order = require('../models/order.model');
const Payment = require('../models/payment.model');
const Review = require('../models/review.model');
const DeliveryAgent = require('../models/deliveryAgent.model');

connectDB();

const seedData = async () => {
  try {
    console.log('🌱 Starting data seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Vendor.deleteMany({});
    await MenuItem.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});
    await Review.deleteMany({});
    await DeliveryAgent.deleteMany({});

    console.log('🗑️  Cleared existing data');

    // Create users
    const users = [
      {
        name: 'John Customer',
        email: 'john@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        role: 'customer',
        addresses: [{
          label: 'Home',
          line1: '123 Main Street',
          line2: 'Apt 4B',
          city: 'Faridabad',
          zip: '121001'
        }]
      },
      {
        name: 'Jane Customer',
        email: 'jane@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        role: 'customer',
        addresses: [{
          label: 'Office',
          line1: '456 Business Ave',
          line2: '',
          city: 'Faridabad',
          zip: '121002'
        }]
      },
      {
        name: 'Restaurant Owner',
        email: 'owner@restaurant.com',
        passwordHash: await bcrypt.hash('password123', 12),
        role: 'vendor',
        addresses: [{
          label: 'Restaurant',
          line1: '789 Food Street',
          line2: '',
          city: 'Faridabad',
          zip: '121003'
        }]
      },
      {
        name: 'Pizza Master',
        email: 'pizza@master.com',
        passwordHash: await bcrypt.hash('password123', 12),
        role: 'vendor',
        addresses: [{
          label: 'Pizza Shop',
          line1: '321 Pizza Lane',
          line2: '',
          city: 'Faridabad',
          zip: '121004'
        }]
      },
      {
        name: 'Delivery Agent 1',
        email: 'delivery1@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        role: 'deliveryAgent',
        addresses: []
      },
      {
        name: 'Delivery Agent 2',
        email: 'delivery2@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        role: 'deliveryAgent',
        addresses: []
      },
      {
        name: 'Admin User',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        role: 'admin',
        addresses: []
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log('👥 Created users');

    // Create vendors
    const vendors = [
      {
        name: 'Spice Garden Restaurant',
        description: 'Authentic Indian cuisine with fresh ingredients',
        location: 'Faridabad Sector 15',
        owner: createdUsers.find(u => u.email === 'owner@restaurant.com')._id,
        menuItems: [],
        averageRating: 4.5,
        totalReviews: 25
      },
      {
        name: 'Pizza Palace',
        description: 'Best pizza in town with wood-fired oven',
        location: 'Faridabad Sector 21',
        owner: createdUsers.find(u => u.email === 'pizza@master.com')._id,
        menuItems: [],
        averageRating: 4.2,
        totalReviews: 18
      }
    ];

    const createdVendors = await Vendor.insertMany(vendors);
    console.log('🏪 Created vendors');

    // Create menu items
    const menuItems = [
      // Spice Garden Restaurant items
      {
        vendorId: createdVendors[0]._id,
        name: 'Chicken Biryani',
        description: 'Fragrant basmati rice with tender chicken and aromatic spices',
        price: 250,
        imageURL: 'https://example.com/biryani.jpg',
        availability: true
      },
      {
        vendorId: createdVendors[0]._id,
        name: 'Butter Chicken',
        description: 'Creamy tomato-based curry with tender chicken pieces',
        price: 280,
        imageURL: 'https://example.com/butter-chicken.jpg',
        availability: true
      },
      {
        vendorId: createdVendors[0]._id,
        name: 'Dal Makhani',
        description: 'Rich and creamy black lentils cooked overnight',
        price: 180,
        imageURL: 'https://example.com/dal-makhani.jpg',
        availability: true
      },
      {
        vendorId: createdVendors[0]._id,
        name: 'Naan Bread',
        description: 'Freshly baked tandoor bread',
        price: 25,
        imageURL: 'https://example.com/naan.jpg',
        availability: true
      },
      // Pizza Palace items
      {
        vendorId: createdVendors[1]._id,
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato sauce, mozzarella, and basil',
        price: 320,
        imageURL: 'https://example.com/margherita.jpg',
        availability: true
      },
      {
        vendorId: createdVendors[1]._id,
        name: 'Pepperoni Pizza',
        description: 'Spicy pepperoni with mozzarella cheese',
        price: 380,
        imageURL: 'https://example.com/pepperoni.jpg',
        availability: true
      },
      {
        vendorId: createdVendors[1]._id,
        name: 'BBQ Chicken Pizza',
        description: 'Grilled chicken with BBQ sauce and red onions',
        price: 420,
        imageURL: 'https://example.com/bbq-chicken.jpg',
        availability: true
      },
      {
        vendorId: createdVendors[1]._id,
        name: 'Garlic Bread',
        description: 'Crispy bread with garlic butter and herbs',
        price: 120,
        imageURL: 'https://example.com/garlic-bread.jpg',
        availability: true
      }
    ];

    const createdMenuItems = await MenuItem.insertMany(menuItems);
    console.log('🍽️  Created menu items');

    // Update vendors with menu items
    for (let i = 0; i < createdVendors.length; i++) {
      const vendorMenuItems = createdMenuItems.filter(item => 
        item.vendorId.toString() === createdVendors[i]._id.toString()
      );
      createdVendors[i].menuItems = vendorMenuItems.map(item => item._id);
      await createdVendors[i].save();
    }

    // Create delivery agents
    const deliveryAgents = [
      {
        name: 'Rajesh Kumar',
        contact: '+91-9876543210',
        currentLocation: {
          type: 'Point',
          coordinates: [77.3163, 28.4089] // Faridabad coordinates
        },
        currentOrders: []
      },
      {
        name: 'Suresh Singh',
        contact: '+91-9876543211',
        currentLocation: {
          type: 'Point',
          coordinates: [77.3163, 28.4089]
        },
        currentOrders: []
      }
    ];

    const createdDeliveryAgents = await DeliveryAgent.insertMany(deliveryAgents);
    console.log('🚚 Created delivery agents');

    // Create sample orders
    const orders = [
      {
        userId: createdUsers.find(u => u.email === 'john@example.com')._id,
        vendorId: createdVendors[0]._id,
        items: [
          {
            menuItemId: createdMenuItems[0]._id,
            quantity: 2,
            customNotes: 'Extra spicy please'
          },
          {
            menuItemId: createdMenuItems[3]._id,
            quantity: 4,
            customNotes: ''
          }
        ],
        status: 'delivered',
        paymentStatus: 'completed',
        deliveryStatus: 'delivered',
        totalAmount: 600, // (250*2) + (25*4)
        deliveryAddress: {
          label: 'Home',
          line1: '123 Main Street',
          line2: 'Apt 4B',
          city: 'Faridabad',
          zip: '121001'
        }
      },
      {
        userId: createdUsers.find(u => u.email === 'jane@example.com')._id,
        vendorId: createdVendors[1]._id,
        items: [
          {
            menuItemId: createdMenuItems[4]._id,
            quantity: 1,
            customNotes: 'Thin crust'
          },
          {
            menuItemId: createdMenuItems[7]._id,
            quantity: 2,
            customNotes: ''
          }
        ],
        status: 'preparing',
        paymentStatus: 'completed',
        deliveryStatus: 'pending',
        totalAmount: 560, // (320*1) + (120*2)
        deliveryAddress: {
          label: 'Office',
          line1: '456 Business Ave',
          line2: '',
          city: 'Faridabad',
          zip: '121002'
        }
      }
    ];

    const createdOrders = await Order.insertMany(orders);
    console.log('📦 Created orders');

    // Create payments
    const payments = [
      {
        orderId: createdOrders[0]._id,
        gateway: 'Razorpay',
        transactionId: 'rzp_test_123456789',
        amount: 600,
        method: 'UPI',
        status: 'success'
      },
      {
        orderId: createdOrders[1]._id,
        gateway: 'Paytm',
        transactionId: 'paytm_test_987654321',
        amount: 560,
        method: 'Card',
        status: 'success'
      }
    ];

    const createdPayments = await Payment.insertMany(payments);
    console.log('💳 Created payments');

    // Create reviews
    const reviews = [
      {
        userId: createdUsers.find(u => u.email === 'john@example.com')._id,
        vendorId: createdVendors[0]._id,
        menuItemId: createdMenuItems[0]._id,
        rating: 5,
        comment: 'Excellent biryani! Very flavorful and well-cooked.',
        images: []
      },
      {
        userId: createdUsers.find(u => u.email === 'jane@example.com')._id,
        vendorId: createdVendors[1]._id,
        menuItemId: createdMenuItems[4]._id,
        rating: 4,
        comment: 'Good pizza, but could be better. Delivery was fast.',
        images: []
      }
    ];

    const createdReviews = await Review.insertMany(reviews);
    console.log('⭐ Created reviews');

    console.log('✅ Data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 Users: ${createdUsers.length}`);
    console.log(`🏪 Vendors: ${createdVendors.length}`);
    console.log(`🍽️  Menu Items: ${createdMenuItems.length}`);
    console.log(`📦 Orders: ${createdOrders.length}`);
    console.log(`💳 Payments: ${createdPayments.length}`);
    console.log(`⭐ Reviews: ${createdReviews.length}`);
    console.log(`🚚 Delivery Agents: ${createdDeliveryAgents.length}`);

    console.log('\n🔑 Test Credentials:');
    console.log('Customer: john@example.com / password123');
    console.log('Customer: jane@example.com / password123');
    console.log('Vendor: owner@restaurant.com / password123');
    console.log('Vendor: pizza@master.com / password123');
    console.log('Delivery Agent: delivery1@example.com / password123');
    console.log('Admin: admin@example.com / password123');

  } catch (err) {
    console.error('❌ Seeding error:', err.message);
  } finally {
    mongoose.connection.close();
  }
};

seedData();
