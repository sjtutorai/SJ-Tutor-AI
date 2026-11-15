import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Modality, LiveServerMessage } from "@google/genai";
import { getServerGeminiClient } from "../geminiClient";

/**
 * Sets up Gemini Live API bidirectional audio/video WebSocket bridging.
 * Path: /api/gemini/live
 *
 * Client sends:
 *  - { audio: base64_16khz_pcm }
 *  - { video: base64_jpeg }
 *  - { text: string }
 *
 * Server forwards to Gemini Live (gemini-3.8-live), then streams back:
 *  - { audio: base64_24khz_pcm }
 *  - { transcript: string }
 *  - { interrupted: boolean }
 */
export function setupGeminiLiveWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/api/gemini/live" });

  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("[Gemini Live WS] Client connected to Live voice session");
    let session: any = null;
    let isClosed = false;

    try {
      const { ai } = getServerGeminiClient();

      session = await ai.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction:
            "You are SJ Tutor AI, an engaging, patient, and knowledgeable spoken tutor. Help the student understand concepts with clear and friendly voice responses.",
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;

            // Model audio parts (24kHz PCM)
            for (const part of message.serverContent?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
              if (part.text) {
                clientWs.send(JSON.stringify({ transcript: part.text }));
              }
            }

            // User audio transcription if available
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onerror: (err: any) => {
            console.error("[Gemini Live WS Session Error]:", err?.message || err);
            if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ error: err?.message || "Live API error" }));
            }
          },
          onclose: () => {
            console.log("[Gemini Live WS Session] Live session closed");
            if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ closed: true }));
            }
          },
        },
      });

      clientWs.on("message", (raw) => {
        if (!session || isClosed) return;
        try {
          const payload = JSON.parse(raw.toString());

          // Spoken audio input (16kHz PCM little endian base64)
          if (payload.audio) {
            session.sendRealtimeInput({
              audio: { data: payload.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }

          // Optional video/screen frame (max 1 FPS JPEG)
          if (payload.video) {
            session.sendRealtimeInput({
              video: { data: payload.video, mimeType: "image/jpeg" },
            });
          }

          // Text message or interruption prompt
          if (payload.text) {
            session.sendRealtimeInput({
              text: payload.text,
            });
          }
        } catch (err: any) {
          console.warn("[Gemini Live WS Message Parse Warning]:", err?.message || err);
        }
      });

      clientWs.on("close", () => {
        isClosed = true;
        console.log("[Gemini Live WS] Client disconnected");
        try {
          session?.close?.();
        } catch (e: any) {
          console.debug("[Gemini Live WS close notice]:", e?.message || e);
        }
      });

      clientWs.on("error", (err) => {
        isClosed = true;
        console.error("[Gemini Live WS Client Error]:", err);
        try {
          session?.close?.();
        } catch (e: any) {
          console.debug("[Gemini Live WS close on error notice]:", e?.message || e);
        }
      });
    } catch (err: any) {
      console.error("[Gemini Live WS Connection Failure]:", err?.message || err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ error: err?.message || "Could not connect to Gemini Live" }));
        clientWs.close();
      }
    }
  });

  return wss;
}
