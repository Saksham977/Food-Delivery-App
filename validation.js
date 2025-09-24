const { body, param, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('passwordHash').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['customer', 'vendor', 'deliveryAgent', 'admin']).withMessage('Invalid role'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('passwordHash').notEmpty().withMessage('Password required'),
  handleValidationErrors
];

// Vendor validation rules
const validateVendor = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Vendor name must be 2-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  handleValidationErrors
];

// Menu item validation rules
const validateMenuItem = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Item name must be 2-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('imageURL').optional().isURL().withMessage('Invalid image URL'),
  body('availability').optional().isBoolean().withMessage('Availability must be boolean'),
  handleValidationErrors
];

// Order validation rules
const validateOrder = [
  body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
  body('items.*.menuItemId').isMongoId().withMessage('Invalid menu item ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.customNotes').optional().trim().isLength({ max: 200 }).withMessage('Notes too long'),
  body('deliveryAddress.label').trim().notEmpty().withMessage('Address label required'),
  body('deliveryAddress.line1').trim().notEmpty().withMessage('Address line 1 required'),
  body('deliveryAddress.city').trim().notEmpty().withMessage('City required'),
  body('deliveryAddress.zip').trim().notEmpty().withMessage('ZIP code required'),
  handleValidationErrors
];

// Payment validation rules
const validatePayment = [
  body('gateway').isIn(['Razorpay', 'Paytm', 'Stripe']).withMessage('Invalid payment gateway'),
  body('method').isIn(['UPI', 'Wallet', 'Card', 'NetBanking']).withMessage('Invalid payment method'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
  handleValidationErrors
];

// Review validation rules
const validateReview = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment too long'),
  body('images').optional().isArray().withMessage('Images must be an array'),
  handleValidationErrors
];

// MongoDB ObjectId validation
const validateObjectId = (paramName) => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName}`),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateVendor,
  validateMenuItem,
  validateOrder,
  validatePayment,
  validateReview,
  validateObjectId
};
