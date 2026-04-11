import express from "express";
import bcrypt from "bcryptjs";
import axios from "axios";
import mongoose from "mongoose";
import Otp from "../models/Otp";

import SharedContent from "../models/SharedContent";
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/* Generate OTP */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* SEND OTP */
router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: "Phone number required" });
    }

    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    // Delete existing OTPs for this phone
    await Otp.deleteMany({ phone });

    // Create new OTP record
    await Otp.create({
      phone,
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    });

    // Send SMS via Termii
    await axios.post("https://api.ng.termii.com/api/sms/send", {
      to: phone,
      from: "N-Alert",
      sms: `Your SJ Tutor AI OTP is ${otp}. Valid for 5 minutes.`,
      type: "plain",
      channel: "generic",
      api_key: process.env.TERMII_API_KEY
    });

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

/* VERIFY OTP */
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const record = await Otp.findOne({ phone });
    if (!record) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.attempts >= 5) {
      return res.status(400).json({ message: "Too many attempts" });
    }

    const isValid = await bcrypt.compare(otp, record.otpHash);
    if (!isValid) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    record.verified = true;
    await record.save();

    res.json({ success: true, message: "Phone verified successfully" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "OTP verification failed" });
  }
});

/* SHARE CONTENT */
router.post("/share", async (req, res) => {
  console.log(`[SHARE] Request received. Type: ${req.body.type}, Title: ${req.body.title}`);
  try {
    const { type, title, subtitle, content } = req.body;
    const id = uuidv4().slice(0, 8); // Short ID

    if (mongoose.connection.readyState === 1) {
      console.log(`[SHARE] Saving to MongoDB. ID: ${id}`);
      await SharedContent.create({
        id,
        type,
        title,
        subtitle,
        content
      });
      console.log(`[SHARE] Saved successfully.`);
    } else {
      console.warn(`[SHARE] MongoDB not connected (State: ${mongoose.connection.readyState}). Cannot save.`);
      return res.status(503).json({ message: "Sharing requires database connection" });
    }

    res.json({ success: true, id });
  } catch (error: any) {
    console.error("[SHARE] Error:", error);
    res.status(500).json({ message: "Failed to share content", error: error.message });
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
