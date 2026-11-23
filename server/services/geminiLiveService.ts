import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Modality, LiveServerMessage } from "@google/genai";
import { createDedicatedGeminiClient, getServerGeminiClient } from "../geminiClient";
import { serverGeminiKeyManager } from "../routes/gemini";

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
 *  - { inputTranscript: string }
 *  - { interrupted: boolean }
 */
export function setupGeminiLiveWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/api/gemini/live" });

  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("[Gemini Live WS] Client connected to Live voice session");
    let session: any = null;
    let isClosed = false;

    const liveCallbacks = {
      onmessage: (message: LiveServerMessage) => {
        if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;

        const content = message.serverContent;
        // Model audio parts (24kHz PCM) and text parts
        for (const part of content?.modelTurn?.parts ?? []) {
          if (part.inlineData?.data) {
            clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
          }
          if (part.text) {
            clientWs.send(JSON.stringify({ transcript: part.text }));
          }
        }

        // Audio transcription outputs when responseModalities is AUDIO
        if (content?.outputTranscription?.text) {
          clientWs.send(JSON.stringify({ transcript: content.outputTranscription.text }));
        }
        if (content?.inputTranscription?.text) {
          clientWs.send(JSON.stringify({ inputTranscript: content.inputTranscription.text }));
        }

        if (content?.interrupted) {
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
    };

    try {
      const slots = serverGeminiKeyManager.getSlots();
      const candidateKeys = slots.length > 0 ? slots.map((s) => s.key) : [getServerGeminiClient().key];

      let lastConnectErr: any = null;
      for (const apiKey of candidateKeys) {
        try {
          const ai = createDedicatedGeminiClient(apiKey);
          session = await ai.live.connect({
            model: "gemini-3.8-live",
            config: {
              responseModalities: [Modality.AUDIO],
              outputAudioTranscription: {},
              inputAudioTranscription: {},
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
              },
              systemInstruction:
                "You are SJ Tutor AI, an engaging, patient, and knowledgeable spoken tutor. Help the student understand concepts with clear and friendly voice responses.",
            },
            callbacks: liveCallbacks,
          });
          break;
        } catch (connectErr: any) {
          lastConnectErr = connectErr;
          console.warn("[Gemini Live WS] Key connection attempt failed, rotating:", connectErr?.message || connectErr);
        }
      }

      if (!session) {
        throw lastConnectErr || new Error("Could not connect to Gemini Live");
      }

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
