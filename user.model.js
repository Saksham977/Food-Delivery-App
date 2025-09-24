const mongoose = require('mongoose');
const { Schema } = mongoose;

const addressSchema = new Schema(
  {
    label:    { type: String, required: true, trim: true },
    line1:    { type: String, required: true, trim: true },
    line2:    { type: String, trim: true },
    city:     { type: String, required: true, trim: true },
    zip:      { type: String, required: true, trim: true }
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ['customer','vendor','deliveryAgent','admin'], default: 'customer' },
    addresses:    { type: [addressSchema], default: [] },
    favorites:    [{ type: Schema.Types.ObjectId, ref: 'Vendor' }]
  },
  { timestamps: true }
);

userSchema.index({ role: 1, email: 1 });

module.exports = mongoose.model('User', userSchema);
