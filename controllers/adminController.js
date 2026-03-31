// controllers/adminController.js
import crypto from "crypto"
import Product from "../models/Product.js"
import Purchase from "../models/Purchase.js"
import User from "../models/User.js"

/**
 * POST /api/admin/products
 * Create a new product.
 *
 * Body:
 * {
 *   name: "CA Inter Group 1",
 *   description: "Full course bundle",
 *   price: 4999,
 *   shopifyProductId: "1234567890",   // optional — link to Shopify product
 *   grants: {
 *     courses: ["ca-inter-g1"],
 *     features: ["videos", "tests", "downloads"]
 *   }
 * }
 */
export async function createProduct(req, res) {
  try {
    const { name, description, price, originalPrice, imageUrl, shopifyProductId, category, subCategory, level, grants } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const product = await Product.create({
      name,
      description,
      price,
      originalPrice: originalPrice || undefined,
      imageUrl: imageUrl || undefined,
      productId: crypto.randomUUID(),
      shopifyProductId: shopifyProductId || undefined,
      category: category || null,
      subCategory: subCategory || null,
      level: level || undefined,
      grants: {
        courses: grants?.courses || [],
        features: grants?.features || []
      }
    });

    res.status(201).json({ success: true, product });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(400).json({ error: `${field} already exists` });
    }
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /api/admin/products/:id
 * Update a product (name, price, grants, shopifyProductId).
 */
export async function updateProduct(req, res) {
  try {
    const { name, description, price, originalPrice, imageUrl, shopifyProductId, category, subCategory, level, grants } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (originalPrice !== undefined) updates.originalPrice = originalPrice;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
    if (shopifyProductId !== undefined) updates.shopifyProductId = shopifyProductId || undefined;
    if (category !== undefined) updates.category = category;
    if (subCategory !== undefined) updates.subCategory = subCategory;
    if (level !== undefined) updates.level = level;
    if (grants !== undefined) updates.grants = {
      courses: grants.courses || [],
      features: grants.features || [],
    };

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!product) return res.status(404).json({ error: 'Product not found' });

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /api/admin/products/:id
 */
export async function deleteProduct(req, res) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/admin/products
 * List all products with full details.
 */
export async function listProducts(req, res) {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/admin/users
 * List all users with their purchases.
 */
export async function listUsers(req, res) {
  try {
    const users = await User.find({}, '-otp -otpExpires').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/admin/purchases
 * List all purchases across all users with pagination.
 * Query: ?page=1&limit=10
 */
export async function listPurchases(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [purchases, total] = await Promise.all([
      Purchase.find()
        .populate('userId', 'name phoneNumber email')
        .populate('items.productId', 'name price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Purchase.countDocuments(),
    ]);

    res.json({
      purchases,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
