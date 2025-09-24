const mongoose = require('mongoose');
const { Schema } = mongoose;

const menuItemSchema = new Schema(
  {
    vendorId:     { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    name:         { type: String, required: true, trim: true },
    description:  { type: String, trim: true },
    price:        { type: Number, required: true, min: 0 },
    imageURL:     { type: String, trim: true },
    availability: { type: Boolean, default: true }
  },
  { timestamps: true }
);

menuItemSchema.index({ vendorId: 1, availability: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
