import nodemailer from 'nodemailer';
import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

export function generateOTP() {
  return String(crypto.randomInt(100000, 999999));
}

export async function sendOTP(phoneNumber, otp) {
  const cleanNumber = String(phoneNumber).replace(/^\+/, "");

  const url = `${process.env.WATI_BASE_URL}/api/v1/sendTemplateMessage?whatsappNumber=${cleanNumber}`;

  const payload = {
    template_name: "mobileotp",
    broadcast_name: "otp_broadcast",
    parameters: [
      {
        name: "1",
        value: String(otp),
      },
    ],
  };

  const response = await axios.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WATI_API_TOKEN}`,
    },
  });

  return response.data;
}

export async function sendEmailOTP(email, otp) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP is ${otp}. It expires in 5 minutes.`,
  });
}