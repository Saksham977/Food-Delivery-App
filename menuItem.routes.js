const express = require('express');
const router = express.Router();
const MenuItem = require('../models/menuItem.model');
const Vendor = require('../models/vendor.model');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateMenuItem, validateObjectId } = require('../middleware/validation');

// Get all menu items (Public - for browsing)
router.get('/', async (req, res) => {
  try {
    const { vendorId, availability, search } = req.query;
    const filter = {};

    if (vendorId) filter.vendorId = vendorId;
    if (availability !== undefined) filter.availability = availability === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const menuItems = await MenuItem.find(filter)
      .populate('vendorId', 'name location')
      .sort({ createdAt: -1 });

    res.json(menuItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get menu items by vendor
router.get('/vendor/:vendorId', validateObjectId('vendorId'), async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ vendorId: req.params.vendorId })
      .populate('vendorId', 'name location')
      .sort({ createdAt: -1 });

    res.json(menuItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single menu item
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id)
      .populate('vendorId', 'name location description');

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json(menuItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create menu item (Vendor)
router.post('/', authenticateToken, authorizeRoles('vendor'), validateMenuItem, async (req, res) => {
  try {
    const { name, description, price, imageURL, availability } = req.body;

    // Find vendor owned by the user
    const vendor = await Vendor.findOne({ owner: req.user._id });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    const menuItem = new MenuItem({
      vendorId: vendor._id,
      name,
      description,
      price,
      imageURL,
      availability: availability !== undefined ? availability : true
    });

    const savedMenuItem = await menuItem.save();
    await savedMenuItem.populate('vendorId', 'name location');

    // Add menu item to vendor's menuItems array
    vendor.menuItems.push(savedMenuItem._id);
    await vendor.save();

    res.status(201).json({
      message: 'Menu item created successfully',
      menuItem: savedMenuItem
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update menu item (Vendor)
router.put('/:id', authenticateToken, authorizeRoles('vendor'), validateObjectId('id'), validateMenuItem, async (req, res) => {
  try {
    const { name, description, price, imageURL, availability } = req.body;

    // Find vendor owned by the user
    const vendor = await Vendor.findOne({ owner: req.user._id });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Check if menu item belongs to this vendor
    if (menuItem.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    menuItem.name = name;
    menuItem.description = description;
    menuItem.price = price;
    menuItem.imageURL = imageURL;
    menuItem.availability = availability !== undefined ? availability : menuItem.availability;

    const updatedMenuItem = await menuItem.save();
    await updatedMenuItem.populate('vendorId', 'name location');

    res.json({
      message: 'Menu item updated successfully',
      menuItem: updatedMenuItem
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update item availability (Vendor)
router.put('/:id/availability', authenticateToken, authorizeRoles('vendor'), validateObjectId('id'), async (req, res) => {
  try {
    const { availability } = req.body;

    if (typeof availability !== 'boolean') {
      return res.status(400).json({ error: 'Availability must be a boolean value' });
    }

    // Find vendor owned by the user
    const vendor = await Vendor.findOne({ owner: req.user._id });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Check if menu item belongs to this vendor
    if (menuItem.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    menuItem.availability = availability;
    await menuItem.save();

    res.json({
      message: `Menu item ${availability ? 'made available' : 'made unavailable'}`,
      menuItem
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete menu item (Vendor)
router.delete('/:id', authenticateToken, authorizeRoles('vendor'), validateObjectId('id'), async (req, res) => {
  try {
    // Find vendor owned by the user
    const vendor = await Vendor.findOne({ owner: req.user._id });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Check if menu item belongs to this vendor
    if (menuItem.vendorId.toString() !== vendor._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await MenuItem.findByIdAndDelete(req.params.id);

    // Remove from vendor's menuItems array
    vendor.menuItems = vendor.menuItems.filter(id => id.toString() !== req.params.id);
    await vendor.save();

    res.json({ message: 'Menu item deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get vendor's menu items (Vendor)
router.get('/vendor/my-items', authenticateToken, authorizeRoles('vendor'), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ owner: req.user._id });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    const menuItems = await MenuItem.find({ vendorId: vendor._id })
      .sort({ createdAt: -1 });

    res.json(menuItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
