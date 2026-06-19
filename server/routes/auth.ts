import express from "express";
import bcrypt from "bcryptjs";
import axios from "axios";
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

// Send OTP helper

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

// Initialize a separate server Firebase instance to avoid client auth imports in Node server environment
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyApvrjOz196Z3feFfkW6y3W7r4OQiM6oIY",
  authDomain: "sj-tutorai.firebaseapp.com",
  projectId: "sj-tutorai",
};

const serverApp = initializeApp(firebaseConfig, "serverApp");
const serverDb = getFirestore(serverApp);

/* SHARE CONTENT */
router.post("/share", async (req, res) => {
  console.log(`[SHARE] API Request received. Type: ${req.body.type}, Title: ${req.body.title}`);
  try {
    const { type, title, subtitle, content, score, ownerUid, ownerEmail } = req.body;
    const shareId = uuidv4().slice(0, 9); // Create a 9-char alphanumeric short ID

    const sharedData = {
      shareId,
      id: shareId, // alias for old schema
      type: (type || "summary").toLowerCase(),
      title: title || `Untitled ${type}`,
      subtitle: subtitle || "",
      content,
      score,
      ownerUid: ownerUid || "system_anonymous",
      ownerEmail: ownerEmail || "",
      createdAt: Date.now(),
      views: 0,
      likes: 0,
      isPublic: true
    };

    const docRef = doc(serverDb, "sharedContent", shareId);
    await setDoc(docRef, sharedData);
    
    console.log(`[SHARE] Saved to Firestore successfully. ID: ${shareId}`);
    res.json({ success: true, id: shareId });
  } catch (error: any) {
    console.error("[SHARE] Error writing to Firestore:", error);
    res.status(500).json({ message: "Failed to share content", error: error.message });
  }
});

/* GET SHARED CONTENT */
router.get("/share/:id", async (req, res) => {
  console.log(`[SHARE GET] Retrieving ID: ${req.params.id}`);
  try {
    const { id } = req.params;
    const docRef = doc(serverDb, "sharedContent", id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log(`[SHARE GET] Content not found for ID: ${id}`);
      return res.status(404).json({ message: "Content not found" });
    }
    
    res.json({ success: true, data: docSnap.data() });
  } catch (error) {
    console.error("[SHARE GET] Error fetching from Firestore:", error);
    res.status(500).json({ message: "Failed to retrieve content" });
  }
});

export default router;
