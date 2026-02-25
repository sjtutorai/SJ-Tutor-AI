import express from "express";
import bcrypt from "bcryptjs";
import axios from "axios";
import mongoose from "mongoose";
import Otp from "../models/Otp";

import SharedContent from "../models/SharedContent";
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// In-memory fallback store
interface OTPData {
  otpHash: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}
const memoryStore = new Map<string, OTPData>();

/* Generate OTP */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* SEND OTP */
router.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!phone) return res.status(400).json({ message: "Phone required" });

  const otp = generateOTP();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  try {
    if (mongoose.connection.readyState === 1) {
      // MongoDB connected
      await Otp.deleteMany({ phone });
      await Otp.create({
        phone,
        otpHash,
        expiresAt
      });
    } else {
      // Fallback to memory store
      memoryStore.set(phone, {
        otpHash,
        expiresAt: expiresAt.getTime(),
        attempts: 0,
        verified: false
      });
    }

    // 🔔 SEND SMS (Termii Example)
    await axios.post("https://api.ng.termii.com/api/sms/send", {
      to: phone.replace(/\+/g, ""), // Termii often expects digits only
      from: "SJ Tutor AI",
      sms: `Your OTP is ${otp}. Valid for 5 minutes.`,
      type: "plain",
      channel: "generic",
      api_key: process.env.TERMII_API_KEY
    });

    res.json({ success: true, message: "OTP sent" });
  } catch (error: any) {
    console.error("Error sending OTP:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to send OTP. Please try again later." });
  }
});

/* VERIFY OTP */
router.post("/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;

  try {
    let record: any;

    if (mongoose.connection.readyState === 1) {
      record = await Otp.findOne({ phone });
    } else {
      const memData = memoryStore.get(phone);
      if (memData) {
        record = {
          ...memData,
          expiresAt: new Date(memData.expiresAt),
          save: async () => {
            // Update memory store
            memoryStore.set(phone, {
              otpHash: record.otpHash,
              expiresAt: record.expiresAt.getTime(),
              attempts: record.attempts,
              verified: record.verified
            });
          }
        };
      }
    }

    if (!record) return res.status(400).json({ message: "OTP not found" });

    if (record.expiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });

    if (record.attempts >= 5)
      return res.status(400).json({ message: "Too many attempts" });

    const isMatch = await bcrypt.compare(otp, record.otpHash);

    if (!isMatch) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    record.verified = true;
    await record.save();

    res.json({ success: true, message: "Phone verified" });
  } catch (error: any) {
    console.error("Error verifying OTP:", error.message);
    res.status(500).json({ message: "Verification failed" });
  }
});

/* SHARE CONTENT */
router.post("/share", async (req, res) => {
  try {
    const { type, title, subtitle, content } = req.body;
    const id = uuidv4().slice(0, 8); // Short ID

    if (mongoose.connection.readyState === 1) {
      await SharedContent.create({
        id,
        type,
        title,
        subtitle,
        content
      });
    } else {
      // Optional: Store in memory if Mongo is down? 
      // For now let's assume Mongo is needed for sharing persistence
      return res.status(503).json({ message: "Sharing requires database connection" });
    }

    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to share content" });
  }
});

/* GET SHARED CONTENT */
router.get("/share/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.connection.readyState === 1) {
      const record = await SharedContent.findOne({ id });
      if (!record) return res.status(404).json({ message: "Content not found" });
      res.json({ success: true, data: record });
    } else {
      res.status(503).json({ message: "Database connection required" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to retrieve content" });
  }
});

export default router;

export default router;
