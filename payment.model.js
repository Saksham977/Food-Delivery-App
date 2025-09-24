//payment.model
const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    orderId:       { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    gateway:       { type: String, enum: ['Razorpay','Paytm','Stripe'], required: true },
    transactionId: { type: String, required: true, unique: true },
    amount:        { type: Number, required: true, min: 0 },
    method:        { type: String, enum: ['UPI','Wallet','Card','NetBanking'], required: true },
    status:        { type: String, enum: ['initiated','success','failed','refunded'], default: 'initiated', index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
