// controllers/authController.js
import User from "../models/User.js"
import { generateToken } from "../middleware/auth.js";
import {generateOTP, sendOTP, sendEmailOTP} from "../services/otpService.js"
import { normalizePhone } from "../services/accessService.js"

// Send OTP (for login/register)
const sendOTPController = async (req, res) => {
  try {
    const { phoneNumber: rawPhone, email } = req.body;
    const phoneNumber = normalizePhone(rawPhone);
    const identifier = phoneNumber || email;

    if (!identifier) {
      return res.status(400).json({ error: 'Phone or email required' });
    }

    const isEmail = !!email;
    const query = isEmail ? { email: email.toLowerCase() } : { phoneNumber };

    // Find or create user
    let user = await User.findOne(query);
    if (!user) {
      user = await User.create({
        [isEmail ? 'email' : 'phoneNumber']: isEmail ? email.toLowerCase() : phoneNumber,
        access: {
          shopify: { courses: [], features: [] },
          website: { courses: [], features: [] }
        }
      });
    }

    // Generate and save OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save();

    // Send OTP
    if (isEmail) {
      await sendEmailOTP(email, otp);
    } else {
      await sendOTP(phoneNumber, otp);
    }

    res.json({ success: true, message: 'OTP sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Verify OTP and login
const verifyOTPController = async (req, res) => {
  try {
    const { phoneNumber: rawPhone, email, otp } = req.body;
    const phoneNumber = normalizePhone(rawPhone);
    const identifier = phoneNumber || email;

    if (!identifier || !otp) {
      return res.status(400).json({ error: 'Phone/email and OTP required' });
    }

    const isEmail = !!email;
    const query = isEmail ? { email: email.toLowerCase() } : { phoneNumber };

    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check OTP
    if (user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Check expiry
    if (user.otpExpires < new Date()) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    // Clear OTP
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        name: user.name,
        access: user.access
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get current user
const getMe = async (req, res) => {
  res.json({
    id: req.user._id,
    email: req.user.email,
    phoneNumber: req.user.phoneNumber,
    name: req.user.name,
    access: req.user.access
  });
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const { name, email, phoneNumber } = req.body;

    if (name) req.user.name = name;
    if (email) req.user.email = email.toLowerCase();
    if (phoneNumber) req.user.phoneNumber = phoneNumber;

    await req.user.save();

    res.json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        phoneNumber: req.user.phoneNumber,
        name: req.user.name
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export { sendOTPController, verifyOTPController, getMe, updateProfile }