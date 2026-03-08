import express from "express";

const router = express.Router();

/* SHARE CONTENT (Disabled - MongoDB Removed) */
router.post("/share", async (req, res) => {
  res.status(501).json({ message: "Sharing is currently disabled as database connection was removed." });
});

/* GET SHARED CONTENT (Disabled - MongoDB Removed) */
router.get("/share/:id", async (req, res) => {
  res.status(501).json({ message: "Sharing is currently disabled as database connection was removed." });
});

export default router;
