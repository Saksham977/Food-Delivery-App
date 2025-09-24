//Delivery Agent Model

const mongoose = require('mongoose');
const { Schema } = mongoose;

const deliveryAgentSchema = new Schema(
  {
    name:            { type: String, required: true, trim: true },
    contact:         { type: String, trim: true },
    currentLocation: {
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }
    },
    currentOrders: [{ type: Schema.Types.ObjectId, ref: 'Order' }]
  },
  { timestamps: true }
);

deliveryAgentSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('DeliveryAgent', deliveryAgentSchema);
