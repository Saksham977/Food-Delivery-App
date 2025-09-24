const Vendor = require('../models/vendor.model');
const MenuItem = require('../models/menuItem.model');
const Order = require('../models/order.model');
const Review = require('../models/review.model');

// Get all vendors (Public)
const getAllVendors = async (req, res) => {
  try {
    const { search, location, rating } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }

    if (rating) {
      filter.averageRating = { $gte: parseFloat(rating) };
    }

    const vendors = await Vendor.find(filter)
      .populate('owner', 'name email')
      .populate('menuItems', 'name price availability')
      .sort({ averageRating: -1, createdAt: -1 });

    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get vendor by ID (Public)
const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('menuItems', 'name price description imageURL availability');

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create vendor (Authenticated users)
const createVendor = async (req, res) => {
  try {
    const { name, description, location } = req.body;

    // Check if user already has a vendor profile
    const existingVendor = await Vendor.findOne({ owner: req.user._id });
    if (existingVendor) {
      return res.status(400).json({ error: 'User already has a vendor profile' });
    }

    const vendor = new Vendor({
      name,
      description,
      location,
      owner: req.user._id,
      menuItems: [],
      ratings: [],
      averageRating: 0,
      totalReviews: 0
    });

    const savedVendor = await vendor.save();
    await savedVendor.populate('owner', 'name email');

    res.status(201).json({
      message: 'Vendor profile created successfully',
      vendor: savedVendor
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update vendor (Owner only)
const updateVendor = async (req, res) => {
  try {
    const { name, description, location } = req.body;

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Check if user owns this vendor
    if (vendor.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    vendor.name = name;
    vendor.description = description;
    vendor.location = location;

    const updatedVendor = await vendor.save();
    await updatedVendor.populate('owner', 'name email');

    res.json({
      message: 'Vendor profile updated successfully',
      vendor: updatedVendor
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get vendor's own profile
const getMyVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ owner: req.user._id })
      .populate('owner', 'name email')
      .populate('menuItems', 'name price description imageURL availability');

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    res.json(vendor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get vendor analytics
const getVendorAnalytics = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Check if user owns this vendor
    if (vendor.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get order statistics
    const totalOrders = await Order.countDocuments({ vendorId: vendor._id });
    const completedOrders = await Order.countDocuments({ 
      vendorId: vendor._id, 
      status: 'delivered' 
    });
    const pendingOrders = await Order.countDocuments({ 
      vendorId: vendor._id, 
      status: { $in: ['ordered', 'preparing', 'out_for_delivery'] } 
    });

    // Get revenue
    const revenueResult = await Order.aggregate([
      { $match: { vendorId: vendor._id, status: 'delivered' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Get recent reviews
    const recentReviews = await Review.find({ vendorId: vendor._id })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      vendor: {
        name: vendor.name,
        averageRating: vendor.averageRating,
        totalReviews: vendor.totalReviews
      },
      orders: {
        total: totalOrders,
        completed: completedOrders,
        pending: pendingOrders
      },
      revenue: totalRevenue,
      recentReviews
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get vendors by owner (Admin)
const getVendorsByOwner = async (req, res) => {
  try {
    const vendors = await Vendor.find({ owner: req.params.userId })
      .populate('owner', 'name email')
      .populate('menuItems', 'name price');

    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete vendor (Owner or Admin)
const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Check if user owns this vendor or is admin
    if (req.user.role !== 'admin' && vendor.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if vendor has active orders
    const activeOrders = await Order.countDocuments({
      vendorId: vendor._id,
      status: { $in: ['ordered', 'preparing', 'out_for_delivery'] }
    });

    if (activeOrders > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete vendor with active orders' 
      });
    }

    // Delete associated menu items
    await MenuItem.deleteMany({ vendorId: vendor._id });

    await Vendor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vendor deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  getMyVendorProfile,
  getVendorAnalytics,
  getVendorsByOwner,
  deleteVendor
};
