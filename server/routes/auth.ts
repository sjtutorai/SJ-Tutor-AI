import express from "express";
import bcrypt from "bcryptjs";
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';
import admin from "firebase-admin";
import nodemailer from "nodemailer";

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;

  if (process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'sj-tutorai',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      projectId: process.env.FIREBASE_PROJECT_ID || 'sj-tutorai',
    });
  } else {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'sj-tutorai',
    });
  }
}

const dbAdmin = admin.firestore();

// Helper to configure Nodemailer SMTP Transporter
function getTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  
  console.warn("⚠️ SMTP credentials not configured. Falling back to log-based JSON transport.");
  return nodemailer.createTransport({
    jsonTransport: true
  });
}

const router = express.Router();

/* CUSTOM SMTP MAGIC LINK: SEND LINK */
router.post("/send-magic-link", async (req, res) => {
  try {
    const { email, displayName } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const token = uuidv4();
    const cleanEmail = email.toLowerCase().trim();

    // Store token in Firestore under magic_links collection with a 15-minute expiration
    await dbAdmin.collection("magic_links").doc(token).set({
      email: cleanEmail,
      displayName: displayName ? displayName.trim() : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
      used: false
    });

    const magicLink = `${req.headers.origin || "http://localhost:3000"}/?loginToken=${token}`;

    const transporter = getTransporter();
    const mailOptions = {
      from: process.env.SMTP_FROM || `"SJ Tutor AI" <noreply@sjtutorai.com>`,
      to: cleanEmail,
      subject: "Sign In to SJ Tutor AI 🎓",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 40px 20px; margin: 0; }
            .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); }
            .logo { font-size: 24px; font-weight: 900; color: #4f46e5; margin-bottom: 24px; text-align: center; letter-spacing: -0.05em; }
            .title { font-size: 20px; font-weight: 800; text-align: center; margin-bottom: 16px; letter-spacing: -0.025em; color: #0f172a; }
            .desc { font-size: 14px; line-height: 24px; color: #64748b; text-align: center; margin-bottom: 32px; }
            .btn-container { text-align: center; margin-bottom: 32px; }
            .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 14px 32px; font-weight: 700; border-radius: 12px; text-decoration: none; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2); }
            .footer { text-align: center; font-size: 12px; color: #94a3b8; line-height: 18px; }
            .link-alt { word-break: break-all; font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">🎓 SJ Tutor AI</div>
            <div class="title">Your Magic Sign-in Link</div>
            <p class="desc">Hello! Click the button below to securely sign into your SJ Tutor AI account. This link is valid for 15 minutes.</p>
            <div class="btn-container">
              <a href="${magicLink}" class="btn">Sign In to SJ Tutor AI</a>
            </div>
            <p class="footer">If you didn't request this link, you can safely ignore this email.</p>
            <div class="link-alt">
              Or copy and paste this link into your browser:<br/>
              <a href="${magicLink}" style="color: #4f46e5; font-weight: 500;">${magicLink}</a>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);

    // If jsonTransport was used, print details to help developers
    if (info && info.message) {
      console.log(`[MAGIC LINK BYPASSED SMTP] Email payload logged below due to local configuration:`);
      console.log(`👉 Link: ${magicLink}`);
    }

    res.json({ success: true, message: "Magic link sent successfully!" });
  } catch (error: any) {
    console.error("Error sending magic link:", error);
    res.status(500).json({ message: "Failed to deliver magic link. Check server logs." });
  }
});

/* CUSTOM SMTP MAGIC LINK: VERIFY LINK */
router.post("/verify-magic-link", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Verification token is required." });
    }

    const tokenDocRef = dbAdmin.collection("magic_links").doc(token);
    const docSnap = await tokenDocRef.get();

    if (!docSnap.exists) {
      return res.status(400).json({ message: "Invalid or expired magic link." });
    }

    const data = docSnap.data();
    if (!data || data.used || data.expiresAt < Date.now()) {
      return res.status(400).json({ message: "This magic link has expired or already been used." });
    }

    // Invalidate the token immediately
    await tokenDocRef.update({ used: true });

    const email = data.email;
    const displayName = data.displayName;

    // Retrieve or register the user record in Firebase Auth
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        userRecord = await admin.auth().createUser({
          email,
          emailVerified: true,
          displayName: displayName || email.split('@')[0],
        });
      } else {
        throw err;
      }
    }

    // Generate Custom Authorization Token
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    res.json({
      success: true,
      customToken,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      }
    });
  } catch (error: any) {
    console.error("Error verifying magic link:", error);
    res.status(500).json({ message: "Internal verification error." });
  }
});

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

    // Use memory store exclusively now
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
      return res.status(400).json({ message: "Invalid OTP" });
    }

    memData.verified = true;
    res.json({ success: true, message: "Phone number verified" });
  } catch (error: any) {
    console.error("Error verifying OTP:", error.message);
    res.status(500).json({ message: "OTP verification failed" });
  }
});

/* SHARE CONTENT */
router.post("/share", async (req, res) => {
  console.log(`[SHARE] Request received. Type: ${req.body.type}, Title: ${req.body.title}`);
  try {
    const { type, title, subtitle, content } = req.body;
    const id = uuidv4().slice(0, 8); // Short ID

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
