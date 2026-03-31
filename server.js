// server.js
import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
dotenv.config()
import authRoutes from "./routes/auth.js"
import shopifyRoutes from "./routes/shopify.js"
import purchaseRoutes from "./routes/purchase.js"
import adminRoutes from "./routes/admin.js"

const app = express();

// Middleware
app.use(cors());


app.use('/api/shopify', shopifyRoutes);


app.use(express.json());

// Database
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/focas')
  .then(() => {
    console.log('✅ MongoDB Connected');
  })
  .catch(err => console.error('❌ MongoDB Error:', err));

// Routes
app.use('/api/auth', authRoutes);

app.use('/api/purchase', purchaseRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok HealtH' }));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));