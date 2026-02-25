import mongoose from "mongoose";

const sharedContentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true }, // 'SUMMARY', 'ESSAY', 'QUIZ'
  title: { type: String, required: true },
  subtitle: { type: String },
  content: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 } // Expire after 30 days
});

export default mongoose.model("SharedContent", sharedContentSchema);
