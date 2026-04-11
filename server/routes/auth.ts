import express from "express";

const router = express.Router();

/* SEND OTP - DISABLED (Requires Database) */
router.post("/send-otp", async (req, res) => {
  res.status(501).json({ message: "OTP service is currently disabled (Database removed)" });
});

/* VERIFY OTP - DISABLED (Requires Database) */
router.post("/verify-otp", async (req, res) => {
  res.status(501).json({ message: "OTP verification is currently disabled (Database removed)" });
});

/* SHARE CONTENT - DISABLED (Requires Database) */
router.post("/share", async (req, res) => {
  res.status(501).json({ message: "Sharing is currently disabled (Database removed)" });
});

/* GET SHARED CONTENT - DISABLED (Requires Database) */
router.get("/share/:id", async (req, res) => {
  res.status(501).json({ message: "Sharing is currently disabled (Database removed)" });
});

export default router;
