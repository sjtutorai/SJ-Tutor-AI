import express from "express";
import bcrypt from "bcryptjs";
import axios from "axios";
import Otp from "../models/Otp";

const router = express.Router();

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

  await Otp.deleteMany({ phone });

  await Otp.create({
    phone,
    otpHash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 min
  });

  // 🔔 SEND SMS (Termii Example)
  try {
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
    console.error("Error sending OTP via Termii:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to send OTP. Please try again later." });
  }
});

/* VERIFY OTP */
router.post("/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;

  const record = await Otp.findOne({ phone });
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
});

export default router;
