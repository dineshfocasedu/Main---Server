// models/User.js
import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true, lowercase: true },
  phoneNumber: { type: String, required: true, unique: true },
  name: String,
  isAdmin: { type: Boolean, default: false },
  shopifyId: String,
  otp: String,
  otpExpires: Date,
  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
  },
  access: {
    shopify: { courses: [String], features: [String] },
    website: { courses: [String], features: [String] }
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

export default User