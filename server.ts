import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// In-memory OTP storage (for production, use Redis or a database)
interface OTPData {
  otp: string;
  expiresAt: number;
}
const otpStore: Record<string, OTPData> = {};

// Termii API Configuration
const TERMII_API_KEY = process.env.TERMII_API_KEY || "TLpCNHKhknhFLieWkkACxGoydEmqnoJKavEXgmsoujhMwqQxUHvUcFMNMPreWX";
const TERMII_BASE_URL = "https://api.ng.termii.com/api";

// API routes
app.post("/api/otp/send", async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes from now

  otpStore[phoneNumber] = { otp, expiresAt };

  try {
    // Send SMS via Termii
    // Note: Termii requires the phone number in a specific format (usually with country code)
    // We assume the frontend sends it correctly.
    const response = await axios.post(`${TERMII_BASE_URL}/sms/send`, {
      api_key: TERMII_API_KEY,
      to: phoneNumber.replace(/\+/g, ""), // Termii often expects digits only
      from: "SJ Tutor",
      sms: `Your SJ Tutor AI verification code is: ${otp}. It expires in 5 minutes.`,
      type: "plain",
      channel: "generic"
    });

    console.log("Termii response:", response.data);
    res.json({ message: "OTP sent successfully" });
  } catch (error: any) {
    console.error("Error sending OTP via Termii:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to send OTP. Please try again later." });
  }
});

app.post("/api/otp/verify", (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    return res.status(400).json({ error: "Phone number and OTP are required" });
  }

  const storedData = otpStore[phoneNumber];

  if (!storedData) {
    return res.status(400).json({ error: "No OTP found for this number. Please request a new one." });
  }

  if (Date.now() > storedData.expiresAt) {
    delete otpStore[phoneNumber];
    return res.status(400).json({ error: "OTP has expired. Please request a new one." });
  }

  if (storedData.otp === otp) {
    delete otpStore[phoneNumber];
    res.json({ message: "Phone number verified successfully!" });
  } else {
    res.status(400).json({ error: "Incorrect OTP. Please check and try again." });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
