// models/Purchase.js
import mongoose from "mongoose"

const purchaseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Where the purchase came from
  source: { type: String, enum: ['shopify', 'website'], required: true },

  // External order reference
  orderId: { type: String, required: true },

  // All products in this order
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: String,
      amount: Number,
      category: String,
      subCategory: String,
      level: String
    }
  ],

  currency: { type: String, default: 'INR' },

  status: { type: String, enum: ['paid', 'refunded', 'pending'], default: 'paid' }
}, { timestamps: true });

// One document per order per user
purchaseSchema.index({ userId: 1, orderId: 1, source: 1 }, { unique: true });

const Purchase = mongoose.model('Purchase', purchaseSchema);
export default Purchase;
