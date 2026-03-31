// controllers/purchaseController.js
import crypto from "crypto"
import Razorpay from "razorpay"
import Product from "../models/Product.js"
import Purchase from "../models/Purchase.js"
import { recordPurchase, getOrCreateUser } from "../services/accessService.js"

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * POST /api/purchase/create-order
 *
 * Creates a Razorpay order for the given products.
 * The user must be logged in (auth middleware).
 *
 * Body: { productIds: string[] }
 * Response: { orderId, amount, currency, key }
 */
export async function createOrder(req, res) {
  try {
    const { productIds, name, phoneNumber } = req.body;

    if (!productIds || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds is required' });
    }
    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber is required' });
    }

    const ids = Array.isArray(productIds) ? productIds : [productIds];

    const products = await Product.find({ _id: { $in: ids } });
    if (products.length === 0) {
      return res.status(404).json({ error: 'No products found' });
    }

    const totalAmount = products.reduce((sum, p) => sum + (p.price || 0), 0);

    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        productIds: ids.join(','),
        phoneNumber,
        ...(name && { name }),
      },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/purchase/verify
 *
 * Verifies the Razorpay payment signature and grants access.
 * The user must be logged in (auth middleware).
 *
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, productIds, currency }
 */
export async function verifyAndGrantAccess(req, res) {
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      productIds, currency,
      name, phoneNumber, address,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !productIds) {
      return res.status(400).json({ error: 'razorpay_order_id, razorpay_payment_id, razorpay_signature and productIds are required' });
    }
    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber is required' });
    }

    // Verify HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const ids = Array.isArray(productIds) ? productIds : [productIds];

    const products = await Product.find({ _id: { $in: ids } });
    if (products.length === 0) {
      return res.status(404).json({ error: 'No products found' });
    }

    // Find or create user from form data
    const user = await getOrCreateUser({ phoneNumber, name, address });

    // Fetch actual amount paid from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    const amountPaid = payment.amount / 100; // paise → rupees

    await recordPurchase({
      userId: user._id,
      products: products.map(p => ({
        productId: p._id,
        name: p.name,
        amount: amountPaid / products.length,
        category: p.category,
        subCategory: p.subCategory,
        level: p.level,
      })),
      source: 'website',
      orderId: razorpay_order_id,
      currency: currency || 'INR',
    });

    const grants = products.flatMap(p => p.grants?.courses ?? []);

    res.json({
      success: true,
      message: 'Payment verified and access granted',
      userId: user._id,
      grants,
    });
    console.log(`✅ Purchase recorded for user ${user._id} with products ${ids.join(',')}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/purchase/my-purchases
 * Returns all purchases for the logged-in user.
 */
export async function getMyPurchases(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const query = { userId };
    const [purchases, total] = await Promise.all([
      Purchase.find(query)
        .populate('items.productId', 'name description price grants')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Purchase.countDocuments(query),
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

/**
 * GET /api/purchase/products
 * Public — list all available products.
 */
export async function listProducts(_req, res) {
  try {
    const products = await Product.find({}, 'name description price');
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getCourseByLevel(req, res) {
  try {
    const { level } = req.query;
    if (!level) {
      return res.status(400).json({ error: 'level query parameter is required' });
    }
    const products = await Product.find({ level });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getCourseById(req, res) { 
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'id parameter is required' });
    }
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}