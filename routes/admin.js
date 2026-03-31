// routes/admin.js
import express from "express"
import { adminAuth } from "../middleware/auth.js"
import {
  createProduct,
  updateProduct,
  deleteProduct,
  listProducts,
  listUsers,
  listPurchases
} from "../controllers/adminController.js"

const router = express.Router();

// All routes require admin token
router.use(adminAuth);

// Products
router.get('/products', listProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Users & Purchases (view only)
router.get('/users', listUsers);
router.get('/purchases', listPurchases);

export default router;
