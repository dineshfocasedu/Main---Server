// routes/purchase.js
import express from "express"

import { createOrder, verifyAndGrantAccess, getMyPurchases, listProducts ,getCourseByLevel,getCourseById } from "../controllers/purchaseController.js"

const router = express.Router();

// Public
router.get('/products', listProducts);

router.get('/course', getCourseByLevel);
router.get('/course/:id', getCourseById);

router.post('/create-order', createOrder);
router.post('/verify', verifyAndGrantAccess);
router.get('/my-purchases', getMyPurchases);

export default router;
