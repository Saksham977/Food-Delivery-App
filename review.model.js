//Review Model

const mongoose = require('mongoose');
const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendorId:   { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
    rating:     { type: Number, required: true, min: 1, max: 5 },
    comment:    { type: String, trim: true },
    images:     { type: [String], default: [] }
  },
  { timestamps: true }
);

reviewSchema.index({ vendorId: 1, rating: 1 });

module.exports = mongoose.model('Review', reviewSchema);
