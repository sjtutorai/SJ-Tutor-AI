import dotenv from "dotenv";
import { SarvamAIClient } from "sarvamai";
import path from "path";

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });

const apiKey = process.env.SARVAM_API_KEY;
if (!apiKey) {
  console.error("❌ SARVAM_API_KEY is missing from environment. Add it to your .env file.");
  process.exit(1);
}

// Initialize the official Sarvam AI client
const client = new SarvamAIClient({ apiKey });

async function main() {
  console.log("🚀 Calling Sarvam AI Chat Completion API (model: sarvam-105b-conversations)...");

  try {
    const response = await client.chat.completionsV2({
      model: "sarvam-105b-conversations",
      messages: [
        {
          role: "system",
          content: "You are SJ Tutor AI, an encouraging and clear academic study assistant.",
        },
        {
          role: "user",
          content: "In one encouraging sentence, explain why asking questions is the best way to learn.",
        },
      ],
      temperature: 0.3,
      maxTokens: 150,
    });

    const reply = response.choices?.[0]?.message?.content;
    console.log("\n✅ Sarvam AI Response Received:");
    console.log("--------------------------------------------------");
    console.log(reply);
    console.log("--------------------------------------------------");
    console.log(`Model: ${response.model}`);
    console.log(`Tokens used: ${response.usage?.total_tokens ?? "N/A"}`);
  } catch (error: any) {
    console.error("❌ Error calling Sarvam Chat API:", error?.message || error);
    process.exit(1);
  }
}

main();
