const mongoose = require('mongoose');
const { Schema } = mongoose;

// Reuse addressSchema for deliveryAddress
const addressSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city:  { type: String, required: true, trim: true },
    zip:   { type: String, required: true, trim: true }
  },
  { _id: false }
);

const orderItemSchema = new Schema(
  {
    menuItemId:  { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    quantity:    { type: Number, required: true, min: 1 },
    customNotes: { type: String, trim: true }
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    userId:          { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendorId:        { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    items:           { type: [orderItemSchema], required: true },
    status:          { type: String, enum: ['ordered','preparing','out_for_delivery','delivered'], default: 'ordered' },
    paymentStatus:   { type: String, enum: ['pending','completed','refunded'], default: 'pending' },
    deliveryStatus:  { type: String, enum: ['pending','out_for_delivery','delivered'], default: 'pending' },
    totalAmount:     { type: Number, required: true, min: 0 },
    deliveryAddress: { type: addressSchema, required: true }
  },
  { timestamps: true }
);

orderSchema.index({ vendorId: 1, status: 1 });
orderSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('Order', orderSchema);
