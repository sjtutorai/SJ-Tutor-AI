import express from "express";
import bcrypt from "bcryptjs";
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// In-memory fallback store for OTPs
interface OTPData {
  otpHash: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}
const memoryStore = new Map<string, OTPData>();

// In-memory store for shared content
interface SharedContentData {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  content: any;
  createdAt: Date;
}
const sharedMemoryStore = new Map<string, SharedContentData>();

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

    // Use memory store
    memoryStore.set(phone, {
      otpHash,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      verified: false
    });

    // Send SMS via Termii (NO Sender ID)
    await axios.post("https://api.ng.termii.com/api/sms/send", {
      to: phone.replace(/\+/g, ""), // Termii often expects digits only
      from: "N-Alert",                 // default system sender
      sms: `Your SJ Tutor AI OTP is ${otp}. Valid for 5 minutes.`,
      type: "plain",
      channel: "generic",
      api_key: process.env.TERMII_API_KEY
    });

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (error: any) {
    console.error("Error sending OTP:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

/* VERIFY OTP */
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    const memData = memoryStore.get(phone);
    if (!memData) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (memData.expiresAt < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (memData.attempts >= 5) {
      return res.status(400).json({ message: "Too many attempts" });
    }

    const isValid = await bcrypt.compare(otp, memData.otpHash);
    if (!isValid) {
      memData.attempts += 1;
      memoryStore.set(phone, memData);
      return res.status(400).json({ message: "Invalid OTP" });
    }

    memData.verified = true;
    memoryStore.set(phone, memData);

    res.json({ success: true, message: "Phone number verified" });
  } catch (error: any) {
    console.error("Error verifying OTP:", error.message);
    res.status(500).json({ message: "OTP verification failed" });
  }
});

/* SHARE CONTENT */
router.post("/share", async (req, res) => {
  try {
    const { type, title, subtitle, content } = req.body;
    const id = uuidv4().slice(0, 8); // Short ID

    sharedMemoryStore.set(id, {
      id,
      type,
      title,
      subtitle,
      content,
      createdAt: new Date()
    });

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
    const record = sharedMemoryStore.get(id);
    
    if (!record) return res.status(404).json({ message: "Content not found" });
    
    res.json({ success: true, data: record });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to retrieve content" });
  }
});

export default router;
