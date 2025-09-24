const express = require('express');
const router = express.Router();
const Review = require('../models/review.model');
const Order = require('../models/order.model');
const Vendor = require('../models/vendor.model');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateReview, validateObjectId } = require('../middleware/validation');

// Submit Review (Customer)
router.post('/', authenticateToken, authorizeRoles('customer'), validateReview, async (req, res) => {
  try {
    const { vendorId, menuItemId, rating, comment, images } = req.body;
    const userId = req.user._id;

    // Check if user has ordered from this vendor
    const hasOrdered = await Order.findOne({
      userId,
      vendorId,
      status: 'delivered'
    });

    if (!hasOrdered) {
      return res.status(400).json({ 
        error: 'You can only review vendors you have ordered from' 
      });
    }

    // Check if user has already reviewed this vendor/item
    const existingReview = await Review.findOne({
      userId,
      vendorId,
      ...(menuItemId && { menuItemId })
    });

    if (existingReview) {
      return res.status(400).json({ 
        error: 'You have already reviewed this vendor/item' 
      });
    }

    const review = new Review({
      userId,
      vendorId,
      menuItemId,
      rating,
      comment,
      images: images || []
    });

    const savedReview = await review.save();
    await savedReview.populate('userId', 'name');
    await savedReview.populate('vendorId', 'name');
    if (menuItemId) {
      await savedReview.populate('menuItemId', 'name');
    }

    // Update vendor ratings
    await updateVendorRating(vendorId);

    res.status(201).json({
      message: 'Review submitted successfully',
      review: savedReview
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get reviews for vendor
router.get('/vendor/:vendorId', validateObjectId('vendorId'), async (req, res) => {
  try {
    const { page = 1, limit = 10, rating } = req.query;
    const filter = { vendorId: req.params.vendorId };

    if (rating) {
      filter.rating = parseInt(rating);
    }

    const reviews = await Review.find(filter)
      .populate('userId', 'name')
      .populate('menuItemId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(filter);

    res.json({
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get reviews for menu item
router.get('/menu-item/:menuItemId', validateObjectId('menuItemId'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ menuItemId: req.params.menuItemId })
      .populate('userId', 'name')
      .populate('vendorId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments({ menuItemId: req.params.menuItemId });

    res.json({
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's reviews
router.get('/my-reviews', authenticateToken, authorizeRoles('customer'), async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user._id })
      .populate('vendorId', 'name location')
      .populate('menuItemId', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update review (Customer)
router.put('/:id', authenticateToken, authorizeRoles('customer'), validateObjectId('id'), validateReview, async (req, res) => {
  try {
    const { rating, comment, images } = req.body;

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    review.rating = rating;
    review.comment = comment;
    review.images = images || [];

    const updatedReview = await review.save();
    await updatedReview.populate('userId', 'name');
    await updatedReview.populate('vendorId', 'name');
    if (updatedReview.menuItemId) {
      await updatedReview.populate('menuItemId', 'name');
    }

    // Update vendor ratings
    await updateVendorRating(review.vendorId);

    res.json({
      message: 'Review updated successfully',
      review: updatedReview
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete review (Customer)
router.delete('/:id', authenticateToken, authorizeRoles('customer'), validateObjectId('id'), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const vendorId = review.vendorId;
    await Review.findByIdAndDelete(req.params.id);

    // Update vendor ratings
    await updateVendorRating(vendorId);

    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all reviews (Admin)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { vendorId, rating, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (vendorId) filter.vendorId = vendorId;
    if (rating) filter.rating = parseInt(rating);

    const reviews = await Review.find(filter)
      .populate('userId', 'name email')
      .populate('vendorId', 'name')
      .populate('menuItemId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(filter);

    res.json({
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to update vendor rating
async function updateVendorRating(vendorId) {
  try {
    const reviews = await Review.find({ vendorId });
    if (reviews.length === 0) return;

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await Vendor.findByIdAndUpdate(vendorId, {
      $set: { 
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: reviews.length
      }
    });
  } catch (err) {
    console.error('Error updating vendor rating:', err);
  }
}

module.exports = router;
