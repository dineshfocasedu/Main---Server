// services/accessService.js
import User from "../models/User.js"
import Purchase from "../models/Purchase.js"

// Normalize phone to last 10 digits only
export function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, ''); // strip non-digits
  return digits.slice(-10);
}

/**
 * Find user by phone or email. Create if not found.
 * @param {Object} params
 * @param {string} [params.phoneNumber]
 * @param {string} [params.email]
 * @param {string} [params.name]
 * @param {string} [params.shopifyId]
 */
export async function getOrCreateUser({ phoneNumber, email, name, shopifyId, address }) {
  phoneNumber = normalizePhone(phoneNumber);

  // Try to find by shopifyId first, then phone, then email
  let user = null;

  if (shopifyId) {
    user = await User.findOne({ shopifyId });
  }
  if (!user && phoneNumber) {
    user = await User.findOne({ phoneNumber });
  }
  if (!user && email) {
    user = await User.findOne({ email: email.toLowerCase() });
  }

  if (!user) {
    user = await User.create({
      phoneNumber,
      email: email ? email.toLowerCase() : undefined,
      name: name || undefined,
      shopifyId: shopifyId || undefined,
      address: address || undefined,
      access: {
        shopify: { courses: [], features: [] },
        website: { courses: [], features: [] }
      }
    });
  } else {
    // Update fields if we got new info
    if (shopifyId && !user.shopifyId) user.shopifyId = shopifyId;
    if (name && !user.name) user.name = name;
    if (email && !user.email) user.email = email.toLowerCase();
    if (phoneNumber && !user.phoneNumber) user.phoneNumber = phoneNumber;
    if (address) user.address = address;
    await user.save();
  }

  return user;
}

/**
 * Recalculate and update user.access from all their purchases.
 * Call this after any purchase is recorded.
 */
export async function updateUserAccess(userId) {
  const purchases = await Purchase.find({ userId, status: 'paid' }).populate('items.productId');

  const access = {
    shopify: { courses: new Set(), features: new Set() },
    website: { courses: new Set(), features: new Set() }
  };

  for (const purchase of purchases) {
    const src = purchase.source; // 'shopify' or 'website'
    for (const item of purchase.items) {
      const product = item.productId; // populated
      if (!product || !product.grants) continue;
      product.grants.courses.forEach(c => access[src].courses.add(c));
      product.grants.features.forEach(f => access[src].features.add(f));
    }
  }

  await User.findByIdAndUpdate(userId, {
    'access.shopify.courses': [...access.shopify.courses],
    'access.shopify.features': [...access.shopify.features],
    'access.website.courses': [...access.website.courses],
    'access.website.features': [...access.website.features],
  });
}

/**
 * Record one or multiple purchases and update user access.
 * Accepts a single product or an array of products in the same order.
 * Idempotent — safe to call multiple times for the same order+product.
 *
 * @param {Object} params
 * @param {string|string[]} params.productId - single productId or array of productIds
 */
export async function recordPurchase({ userId, products, source, orderId, currency }) {
  // products: [{ productId, name, amount }]
  const items = (Array.isArray(products) ? products : [products]).map(p => ({
    productId: p.productId,
    name: p.name,
    amount: p.amount,
    category: p.category,
    subCategory: p.subCategory,
    level: p.level
  }));

  // Upsert: one document per order — push new items into the array
  await Purchase.updateOne(
    { userId, orderId, source },
    {
      $setOnInsert: { currency: currency || 'INR', status: 'paid' },
      $push: { items: { $each: items } }
    },
    { upsert: true }
  );

  await updateUserAccess(userId);
}
