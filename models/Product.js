// models/Product.js
import mongoose from "mongoose"

const CA_LEVELS = ["Foundation", "Intermediate", "Final"];

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: Number,
  originalPrice: Number, // For discounts
  imageUrl: String,

  shopifyProductId: { type: String, unique: true, sparse: true },

  productId: { type: String, unique: true, sparse: true },

  category: { type: String, default: null },
  subCategory: { type: String, default: null },

  // CA Level — optional, only set for CA-related products
  level: {
    type: String,
    enum: CA_LEVELS,
    default: null,
  },
 

  grants: {
    courses: [String],
    features: [String],
  },
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
export default Product;