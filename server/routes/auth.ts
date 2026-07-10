import express from "express";
import bcrypt from "bcryptjs";
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';
import nodemailer from "nodemailer";
import { adminAuth } from "../firebaseAdmin";

const router = express.Router();

// In-memory fallback store
interface OTPData {
  otpHash: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}
const memoryStore = new Map<string, OTPData>();

// Simple memory store for shared content
const sharedContentStore = new Map<string, any>();

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

    memoryStore.set(phone, {
      otpHash,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      verified: false
    });

    await axios.post("https://api.ng.termii.com/api/sms/send", {
      to: phone.replace(/\+/g, ""), 
      from: "N-Alert",
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
      return res.status(400).json({ message: "Invalid OTP" });
    }

    memData.verified = true;
    res.json({ success: true, message: "Phone number verified" });
  } catch (error: any) {
    console.error("Error verifying OTP:", error.message);
    res.status(500).json({ message: "OTP verification failed" });
  }
});

/* MAGIC LINK (Email Delivery) */
router.post("/magic-link", async (req, res) => {
  console.log("Magic Link request received");
  try {
    const { email, continueUrl } = req.body;
    console.log("User email:", email);
    
    if (!email || !continueUrl) {
      return res.status(400).json({ success: false, message: "Email and continueUrl are required", code: "auth/invalid-request" });
    }

    // Verify SMTP env vars
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.EMAIL_FROM) {
      console.error("Missing SMTP Configuration in environment variables.");
      return res.status(500).json({ success: false, message: "Server email configuration is missing", code: "auth/server-config-error" });
    }

    console.log("Generating Firebase sign-in link...");
    const actionCodeSettings = {
      url: continueUrl,
      handleCodeInApp: true,
    };
    
    const signInLink = await adminAuth.generateSignInWithEmailLink(email, actionCodeSettings);
    console.log("Magic Link generated successfully");

    // Development only: console.log("Generated Magic Link:", signInLink);

    console.log("Calling email provider...");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Sign in to SJ Tutor AI",
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: auto; padding: 20px; text-align: center; border: 1px solid #eee; border-radius: 10px;">
          <h2>Welcome to SJ Tutor AI!</h2>
          <p>Click the secure link below to sign in to your account.</p>
          <a href="${signInLink}" style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #3b82f6; color: white; text-decoration: none; font-weight: bold; border-radius: 6px;">Sign In Now</a>
          <p style="font-size: 12px; color: #888;">If you did not request this email, you can safely ignore it.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
    console.log("Accepted recipients:", info.accepted);
    console.log("SMTP response:", info.response);
    console.log("Magic Link flow completed");

    res.json({ success: true, message: "Sign-in link sent to your email address" });
  } catch (error: any) {
    console.error("Error in magic link flow:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to send magic link", code: error.code || "auth/internal-error", details: error.message });
  }
});

/* SHARE CONTENT */
router.post("/share", async (req, res) => {
  console.log(`[SHARE] Request received. Type: ${req.body.type}, Title: ${req.body.title}`);
  try {
    const { type, title, subtitle, content } = req.body;
    const id = uuidv4().slice(0, 8);

    sharedContentStore.set(id, {
      id,
      type,
      title,
      subtitle,
      content,
      createdAt: new Date()
    });
    
    console.log(`[SHARE] Saved to memory store. ID: ${id}`);
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
    const record = sharedContentStore.get(id);
    
    if (!record) return res.status(404).json({ message: "Content not found" });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to retrieve content" });
  }
});

export default router;
