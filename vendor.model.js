const mongoose = require('mongoose');
const { Schema } = mongoose;

const vendorSchema = new Schema({
  name:           { type: String, required: true, trim: true },
  description:    { type: String, trim: true },
  location:       { type: String, required: true },
  menuItems:      [{ type: Schema.Types.ObjectId, ref: 'MenuItem' }],
  ratings:        [{ type: Number }],
  averageRating:  { type: Number, default: 0, min: 0, max: 5 },
  totalReviews:   { type: Number, default: 0 },
  owner:          { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);
