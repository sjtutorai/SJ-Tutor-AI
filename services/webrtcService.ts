import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  collection,
  query,
  where,
  limit,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import {
  CallType,
  DirectCall,
  GroupCall,
  GroupCallParticipant,
} from "../types";
import { NotificationService } from "./notificationService";
import { SettingsService } from "./settingsService";
import {
  CallType,
  DirectCall,
  GroupCall,
  GroupCallParticipant,
  RingtoneStyle,
} from "../types";

// ==========================================
// 1. Web Audio API Ringtone & Chime Synthesizer
// ==========================================
export const RINGTONE_STYLES: { id: RingtoneStyle; name: string; desc: string; icon: string }[] = [
  { id: 'Modern Chime', name: 'Modern Chime', desc: 'Harmonic crystalline chime with gentle melody', icon: '✨' },
  { id: 'Classic Phone', name: 'Classic Phone', desc: 'Traditional dual-tone retro telephone ringer', icon: '☎️' },
  { id: 'Melodic Marimba', name: 'Melodic Marimba', desc: 'Warm acoustic wooden marimba arpeggio', icon: '🪵' },
  { id: 'Cosmic Synth', name: 'Cosmic Synth', desc: 'Futuristic ambient synth wave shimmer', icon: '🚀' },
  { id: 'Gentle Zen', name: 'Gentle Zen', desc: 'Soothing Tibetan singing bowl harmonic chime', icon: '🧘' },
  { id: 'Energetic Pulse', name: 'Energetic Pulse', desc: 'Upbeat bouncy electronic double pulse', icon: '⚡' },
];

class CallAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private ringOscillator: OscillatorNode | null = null;
  private ringInterval: any = null;
  private previewTimeout: any = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getCallSettings() {
    try {
      const s = SettingsService.getSettings();
      return s.calls || {
        ringtone: 'Modern Chime' as RingtoneStyle,
        ringtoneVolume: 80,
        ringbackStyle: 'Standard',
        vibrateOnCall: true,
        enableSoundAlerts: true,
      };
    } catch {
      return {
        ringtone: 'Modern Chime' as RingtoneStyle,
        ringtoneVolume: 80,
        ringbackStyle: 'Standard',
        vibrateOnCall: true,
        enableSoundAlerts: true,
      };
    }
  }

  private getVolume(overrideVolume?: number): number {
    const s = this.getCallSettings();
    if (!s.enableSoundAlerts && overrideVolume === undefined) return 0;
    const vol = overrideVolume !== undefined ? overrideVolume : (s.ringtoneVolume ?? 80);
    return Math.max(0, Math.min(100, vol)) / 100;
  }

  private triggerVibration() {
    try {
      const s = this.getCallSettings();
      if (s.vibrateOnCall && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([300, 150, 300, 150, 600]);
      }
    } catch {
      // ignore
    }
  }

  // --- Synthesis of individual ringtone styles (one single pattern cycle) ---

  private playModernChime(ctx: AudioContext, masterVolume: number) {
    const now = ctx.currentTime;
    const notes = [
      { f: 698.46, t: 0, d: 0.35, g: 0.18 },   // F5
      { f: 880.00, t: 0.12, d: 0.35, g: 0.19 }, // A5
      { f: 1046.50, t: 0.24, d: 0.45, g: 0.22 }, // C6
      { f: 1318.51, t: 0.36, d: 0.60, g: 0.24 }, // E6
      // Response harmony
      { f: 1174.66, t: 0.85, d: 0.40, g: 0.20 }, // D6
      { f: 1567.98, t: 0.98, d: 0.65, g: 0.23 }, // G6
    ];

    notes.forEach((n) => {
      const startTime = now + n.t;
      const osc = ctx.createOscillator();
      const oscHarmonic = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(n.f, startTime);

      oscHarmonic.type = "triangle";
      oscHarmonic.frequency.setValueAtTime(n.f * 2, startTime);

      const targetGain = n.g * masterVolume;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(targetGain, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + n.d);

      osc.connect(gain);
      oscHarmonic.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      oscHarmonic.start(startTime);
      osc.stop(startTime + n.d + 0.05);
      oscHarmonic.stop(startTime + n.d + 0.05);
    });
  }

  private playClassicPhone(ctx: AudioContext, masterVolume: number) {
    const now = ctx.currentTime;
    const bursts = [0, 0.9]; // Two bursts in sequence

    bursts.forEach((offset) => {
      const startTime = now + offset;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(440, startTime); // A4
      osc2.frequency.setValueAtTime(480, startTime); // B4

      const targetGain = 0.20 * masterVolume;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(targetGain, startTime + 0.05);
      gain.gain.setValueAtTime(targetGain, startTime + 0.65);
      gain.gain.linearRampToValueAtTime(0.0001, startTime + 0.75);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + 0.8);
      osc2.stop(startTime + 0.8);
    });
  }

  private playMelodicMarimba(ctx: AudioContext, masterVolume: number) {
    const now = ctx.currentTime;
    const notes = [
      { f: 523.25, t: 0 },    // C5
      { f: 659.25, t: 0.12 }, // E5
      { f: 783.99, t: 0.24 }, // G5
      { f: 987.77, t: 0.36 }, // B5
      { f: 1046.50, t: 0.48 }, // C6
      { f: 783.99, t: 0.68 }, // G5
      { f: 1046.50, t: 0.80 }, // C6
    ];

    notes.forEach((n) => {
      const startTime = now + n.t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(n.f, startTime);

      const targetGain = 0.24 * masterVolume;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(targetGain, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  private playCosmicSynth(ctx: AudioContext, masterVolume: number) {
    const now = ctx.currentTime;
    const notes = [
      { f: 440, t: 0, d: 0.5 },
      { f: 659.25, t: 0.18, d: 0.5 },
      { f: 880, t: 0.36, d: 0.6 },
      { f: 1318.5, t: 0.54, d: 0.8 },
    ];

    notes.forEach((n) => {
      const startTime = now + n.t;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(n.f, startTime);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, startTime);
      filter.frequency.exponentialRampToValueAtTime(2800, startTime + 0.3);

      const targetGain = 0.16 * masterVolume;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(targetGain, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + n.d);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + n.d + 0.05);
    });
  }

  private playGentleZen(ctx: AudioContext, masterVolume: number) {
    const now = ctx.currentTime;
    // Solfeggio 528Hz Love/DNA harmonic bowl resonance
    const freqs = [
      { f: 528, g: 0.22, d: 1.8 },
      { f: 1056, g: 0.12, d: 1.4 },
      { f: 264, g: 0.16, d: 2.0 },
    ];

    freqs.forEach((item) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(item.f, now);

      const targetGain = item.g * masterVolume;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + item.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + item.d + 0.05);
    });
  }

  private playEnergeticPulse(ctx: AudioContext, masterVolume: number) {
    const now = ctx.currentTime;
    const pulses = [
      { f: 783.99, t: 0, d: 0.12 },
      { f: 1046.50, t: 0.12, d: 0.15 },
      { f: 1318.51, t: 0.24, d: 0.18 },
      { f: 1567.98, t: 0.36, d: 0.35 },
      // Second snappy echo
      { f: 1318.51, t: 0.72, d: 0.15 },
      { f: 1567.98, t: 0.84, d: 0.40 },
    ];

    pulses.forEach((p) => {
      const startTime = now + p.t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(p.f, startTime);

      const targetGain = 0.14 * masterVolume;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(targetGain, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + p.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + p.d + 0.02);
    });
  }

  private playRingtoneByStyle(style: RingtoneStyle, ctx: AudioContext, masterVolume: number) {
    switch (style) {
      case 'Classic Phone':
        this.playClassicPhone(ctx, masterVolume);
        break;
      case 'Melodic Marimba':
        this.playMelodicMarimba(ctx, masterVolume);
        break;
      case 'Cosmic Synth':
        this.playCosmicSynth(ctx, masterVolume);
        break;
      case 'Gentle Zen':
        this.playGentleZen(ctx, masterVolume);
        break;
      case 'Energetic Pulse':
        this.playEnergeticPulse(ctx, masterVolume);
        break;
      case 'Modern Chime':
      default:
        this.playModernChime(ctx, masterVolume);
        break;
    }
  }

  // Play continuous incoming ring melody (customizable ringtone across devices)
  startIncomingRing(overrideRingtone?: RingtoneStyle, overrideVolume?: number) {
    this.stopAll();
    try {
      const ctx = this.getContext();
      const callSettings = this.getCallSettings();
      const style = overrideRingtone || callSettings.ringtone || 'Modern Chime';
      const volume = this.getVolume(overrideVolume);

      if (volume <= 0) return;

      const playCycle = () => {
        if (!ctx || ctx.state === "closed") return;
        this.playRingtoneByStyle(style, ctx, volume);
        this.triggerVibration();
      };

      playCycle();
      const intervalMs = style === 'Gentle Zen' ? 3200 : style === 'Classic Phone' ? 3400 : 2800;
      this.ringInterval = setInterval(playCycle, intervalMs);
    } catch (e) {
      console.warn("Could not play incoming ringtone", e);
    }
  }

  // Preview a single cycle of any ringtone style in Settings
  previewRingtone(style: RingtoneStyle, volumePercent?: number) {
    this.stopAll();
    try {
      const ctx = this.getContext();
      const volume = this.getVolume(volumePercent);
      if (volume <= 0) return;

      this.playRingtoneByStyle(style, ctx, volume);
      this.triggerVibration();

      // Auto-stop preview after 2.8s
      this.previewTimeout = setTimeout(() => {
        this.stopAll();
      }, 2800);
    } catch (e) {
      console.warn("Could not preview ringtone", e);
    }
  }

  // Play outgoing ringback tone (soft rhythmic beep / melodic pulse)
  startOutgoingRingback(overrideVolume?: number) {
    this.stopAll();
    try {
      const ctx = this.getContext();
      const callSettings = this.getCallSettings();
      const volume = this.getVolume(overrideVolume);
      if (volume <= 0) return;

      const style = callSettings.ringbackStyle || 'Standard';

      const playBeep = () => {
        if (!ctx || ctx.state === "closed") return;
        const now = ctx.currentTime;

        if (style === 'Melodic') {
          // Soft melodic dual chime
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = "sine";
          osc2.type = "sine";
          osc1.frequency.setValueAtTime(523.25, now);
          osc2.frequency.setValueAtTime(659.25, now + 0.15);

          const targetGain = 0.10 * volume;
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(targetGain, now + 0.04);
          gain.gain.setValueAtTime(targetGain, now + 0.8);
          gain.gain.linearRampToValueAtTime(0.0001, now + 0.95);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now + 0.15);
          osc1.stop(now + 0.95);
          osc2.stop(now + 0.95);
        } else if (style === 'Subtle') {
          // Very gentle low-frequency single pulse
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(380, now);

          const targetGain = 0.08 * volume;
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(targetGain, now + 0.06);
          gain.gain.setValueAtTime(targetGain, now + 0.6);
          gain.gain.linearRampToValueAtTime(0.0001, now + 0.7);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.75);
        } else {
          // Standard ringback beep (425Hz)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(425, now);

          const targetGain = 0.12 * volume;
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(targetGain, now + 0.05);
          gain.gain.setValueAtTime(targetGain, now + 1.1);
          gain.gain.linearRampToValueAtTime(0.0001, now + 1.25);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 1.3);
        }
      };

      playBeep();
      this.ringInterval = setInterval(playBeep, 3500);
    } catch (e) {
      console.warn("Could not play outgoing ringback", e);
    }
  }

  // Play cheerful connected chime
  playConnectedChime(overrideVolume?: number) {
    this.stopAll();
    try {
      const ctx = this.getContext();
      const volume = this.getVolume(overrideVolume);
      if (volume <= 0) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        const targetGain = 0.15 * volume;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(targetGain, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
      });
    } catch (e) {
      console.warn("Could not play connected chime", e);
    }
  }

  // Play call ended drop tone
  playEndedChime(overrideVolume?: number) {
    this.stopAll();
    try {
      const ctx = this.getContext();
      const volume = this.getVolume(overrideVolume);
      if (volume <= 0) return;

      const notes = [440, 330, 220]; // Descending
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        const targetGain = 0.12 * volume;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(targetGain, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.22);
      });
    } catch (e) {
      console.warn("Could not play ended chime", e);
    }
  }

  // Play hand raised ping
  playHandRaisedChime(overrideVolume?: number) {
    try {
      const ctx = this.getContext();
      const volume = this.getVolume(overrideVolume);
      if (volume <= 0) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);

      const targetGain = 0.20 * volume;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch (e) {
      console.warn("Could not play hand raise chime", e);
    }
  }

  stopAll() {
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = null;
    }
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    if (this.ringOscillator) {
      try {
        this.ringOscillator.stop();
        this.ringOscillator.disconnect();
      } catch {
        // ignore
      }
      this.ringOscillator = null;
    }
  }
}

export const callAudio = new CallAudioSynthesizer();

// ==========================================
// 2. Media Stream Utilities & WebRTC Helpers
// ==========================================

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
    { urls: "stun:stun.relay.metered.ca:80" },
  ],
  iceCandidatePoolSize: 10,
};

export async function getLocalUserMedia(type: CallType, facingMode: "user" | "environment" = "user"): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Camera/Microphone access is not supported on this browser.");
  }

  // Multi-tier fallback strategy to guarantee microphone and camera reliably activate across all devices
  // Tier 1: Advanced Studio Audio + HD Video if requested
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: type === "video" ? {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
      } : false,
    });
    stream.getTracks().forEach((t) => { t.enabled = true; });
    return stream;
  } catch (err1: any) {
    console.warn("Tier 1 getUserMedia failed, trying Tier 2 standard constraints...", err1);
  }

  // Tier 2: Standard Audio + Relaxed Video
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video" ? { facingMode } : false,
    });
    stream.getTracks().forEach((t) => { t.enabled = true; });
    return stream;
  } catch (err2: any) {
    console.warn("Tier 2 getUserMedia failed, trying Tier 3 unconstrained video...", err2);
  }

  // Tier 3: Unconstrained Video + Standard Audio
  if (type === "video") {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      stream.getTracks().forEach((t) => { t.enabled = true; });
      return stream;
    } catch (err3: any) {
      console.warn("Tier 3 unconstrained video failed, trying audio-only fallback...", err3);
    }
  }

  // Tier 4: Audio-Only Fallback
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    stream.getTracks().forEach((t) => { t.enabled = true; });
    return stream;
  } catch (err4: any) {
    console.warn("Audio-only getUserMedia failed, attempting silent audio fallback context...", err4);
    // Tier 5: Dummy silent audio track so WebRTC signaling does not fail when no hardware mic is connected
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const dst = ctx.createMediaStreamDestination();
      const gain = ctx.createGain();
      gain.gain.value = 0; // completely silent
      osc.connect(gain);
      gain.connect(dst);
      osc.start();
      const dummyStream = dst.stream;
      return dummyStream;
    } catch (err5) {
      console.error("All getUserMedia attempts failed:", err5);
      throw err4;
    }
  }
}

export async function getVideoMediaTrack(facingMode: "user" | "environment" = "user"): Promise<MediaStreamTrack | null> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return null;
  }
  // Try ideal HD resolution first
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
      },
      audio: false,
    });
    const track = stream.getVideoTracks()[0] || null;
    if (track) track.enabled = true;
    return track;
  } catch (e1) {
    console.warn("HD Video track acquisition failed, trying basic video constraints...", e1);
  }

  // Fallback to basic video with facingMode
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
      audio: false,
    });
    const track = stream.getVideoTracks()[0] || null;
    if (track) track.enabled = true;
    return track;
  } catch (e2) {
    console.warn("Basic video track acquisition failed, trying unconstrained camera...", e2);
  }

  // Fallback to any unconstrained video device
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    const track = stream.getVideoTracks()[0] || null;
    if (track) track.enabled = true;
    return track;
  } catch (e3) {
    console.error("Could not acquire any video media track:", e3);
    return null;
  }
}

export async function getAudioMediaTrack(): Promise<MediaStreamTrack | null> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return null;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    const track = stream.getAudioTracks()[0] || null;
    if (track) track.enabled = true;
    return track;
  } catch {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const track = stream.getAudioTracks()[0] || null;
      if (track) track.enabled = true;
      return track;
    } catch (e) {
      console.error("Could not acquire microphone track:", e);
      return null;
    }
  }
}

export async function getScreenShareStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    throw new Error("Screen sharing is not supported on this browser/device.");
  }
  return await navigator.mediaDevices.getDisplayMedia({
    video: { cursor: "always" } as any,
    audio: false,
  });
}

export function stopAllStreamTracks(stream: MediaStream | null) {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  } catch (e) {
    console.warn("Error stopping stream tracks", e);
  }
}

// Volume level meter helper using Web Audio API
export function createAudioLevelMeter(
  stream: MediaStream,
  onLevelChange: (level: number) => void
): () => void {
  try {
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return () => {};

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationFrameId: number;

    const checkVolume = () => {
      if (ctx.state === "closed") return;

      // If audio track is disabled / muted / ended, immediately report 0 volume
      const activeAudio = stream.getAudioTracks().some(t => t.enabled && t.readyState === "live");
      if (!activeAudio) {
        onLevelChange(0);
        animationFrameId = requestAnimationFrame(checkVolume);
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      // Scale from 0 to 100
      const normalized = Math.min(100, Math.round((average / 128) * 100));
      onLevelChange(normalized);
      animationFrameId = requestAnimationFrame(checkVolume);
    };

    checkVolume();

    return () => {
      cancelAnimationFrame(animationFrameId);
      try {
        source.disconnect();
        analyser.disconnect();
        ctx.close();
      } catch {
        // ignore
      }
    };
  } catch (e) {
    console.warn("Could not create audio level meter", e);
    return () => {};
  }
}

// ==========================================
// 3. 1-on-1 Direct Calling Signaling in Firestore
// ==========================================

export async function initiateDirectCall(params: {
  chatId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  type: CallType;
}): Promise<string> {
  const callId = `call_${params.chatId}_${Date.now()}`;
  const callRef = doc(db, "calls", callId);

  const callData: DirectCall = {
    id: callId,
    chatId: params.chatId,
    callerId: params.callerId,
    callerName: params.callerName,
    callerAvatar: params.callerAvatar || "",
    receiverId: params.receiverId,
    receiverName: params.receiverName,
    receiverAvatar: params.receiverAvatar || "",
    type: params.type,
    status: "ringing",
    startedAt: Date.now(),
    callerCandidates: [],
    receiverCandidates: [],
  };

  await setDoc(callRef, callData);

  // Send background call notification trigger to server/FCM
  fetch("/api/calls/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callId,
      callerId: params.callerId,
      callerName: params.callerName,
      callerAvatar: params.callerAvatar || "",
      receiverId: params.receiverId,
      receiverName: params.receiverName,
      type: params.type,
    }),
  }).catch((err) => {
    console.warn("Background call push trigger notice:", err);
  });

  // Record in-app notification entry for receiver's notification center
  try {
    const callTypeLabel = params.type === "video" ? "Video" : "Voice";
    NotificationService.sendNotification(
      `Incoming ${callTypeLabel} Call 📞`,
      `${params.callerName} called you (${callTypeLabel} Call).`,
      "Important Alerts",
      params.receiverId
    ).catch(() => {});
  } catch (e) {
    console.warn("Failed to create in-app call notification doc:", e);
  }

  return callId;
}

export async function setDirectCallOffer(callId: string, offer: RTCSessionDescriptionInit) {
  const callRef = doc(db, "calls", callId);
  await updateDoc(callRef, {
    offer: {
      type: offer.type,
      sdp: offer.sdp,
    },
  });
}

export async function answerDirectCall(callId: string, answer: RTCSessionDescriptionInit) {
  const callRef = doc(db, "calls", callId);
  await updateDoc(callRef, {
    status: "connected",
    connectedAt: Date.now(),
    answer: {
      type: answer.type,
      sdp: answer.sdp,
    },
  });
  NotificationService.dismissCallNotification(callId);
}

export async function declineDirectCall(callId: string, reason: "declined" | "busy" = "declined") {
  const callRef = doc(db, "calls", callId);
  await updateDoc(callRef, {
    status: reason,
    endedAt: Date.now(),
  });
  NotificationService.dismissCallNotification(callId);
}

export async function endDirectCall(callId: string, durationSeconds?: number) {
  const callRef = doc(db, "calls", callId);
  await updateDoc(callRef, {
    status: "ended",
    endedAt: Date.now(),
    duration: durationSeconds || 0,
  });
  NotificationService.dismissCallNotification(callId);
}

export async function addDirectCallIceCandidate(callId: string, isCaller: boolean, candidate: RTCIceCandidate) {
  try {
    const callRef = doc(db, "calls", callId);
    const candidateJson = candidate.toJSON();

    if (isCaller) {
      await updateDoc(callRef, {
        callerCandidates: arrayUnion(candidateJson),
      });
    } else {
      await updateDoc(callRef, {
        receiverCandidates: arrayUnion(candidateJson),
      });
    }
  } catch (e) {
    console.warn("Failed to add ICE candidate", e);
  }
}

export function subscribeToDirectCall(callId: string, onUpdate: (call: DirectCall | null) => void): () => void {
  const callRef = doc(db, "calls", callId);
  return onSnapshot(callRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data() as DirectCall);
    } else {
      onUpdate(null);
    }
  }, (err) => {
    console.warn("Direct call snapshot subscription error:", err);
  });
}

// Global listener for incoming calls directed to the current user
export function subscribeToIncomingCalls(
  currentUid: string,
  onIncomingCall: (call: DirectCall | null) => void
): () => void {
  if (!currentUid || currentUid === "guest") return () => {};

  const callsCol = collection(db, "calls");
  const q = query(
    callsCol,
    where("receiverId", "==", currentUid),
    limit(10)
  );

  return onSnapshot(q, (snapshot) => {
    const now = Date.now();
    let activeRingingCall: DirectCall | null = null;

    snapshot.forEach((docSnap) => {
      const docData = docSnap.data() as DirectCall;
      if (
        docData &&
        docData.status === "ringing" &&
        now - (docData.startedAt || 0) < 90000 // 90-second ringing grace window
      ) {
        if (!activeRingingCall || (docData.startedAt || 0) > (activeRingingCall.startedAt || 0)) {
          activeRingingCall = docData;
        }
      }
    });

    onIncomingCall(activeRingingCall);
  }, (err) => {
    console.warn("Incoming calls subscription error:", err);
  });
}

// ==========================================
// 4. Group Study Room Audio & Video Calls
// ==========================================

export async function startOrJoinGroupCall(
  groupId: string,
  groupName: string,
  user: { uid: string; displayName: string; photoURL?: string },
  type: CallType
): Promise<string> {
  const callDocRef = doc(db, "group_calls", groupId);
  const snap = await getDoc(callDocRef);

  const participant: GroupCallParticipant = {
    uid: user.uid,
    displayName: user.displayName || "Study Member",
    photoURL: user.photoURL || "",
    isMuted: false,
    isVideoOff: type === "audio",
    isScreenSharing: false,
    isHandRaised: false,
    joinedAt: Date.now(),
    role: snap.exists() && snap.data()?.status === "active" ? "participant" : "host",
  };

  if (snap.exists() && snap.data()?.status === "active") {
    const data = snap.data() as GroupCall;
    const participants = { ...data.participants, [user.uid]: participant };
    await updateDoc(callDocRef, {
      participants,
    });
    return data.id;
  } else {
    const callId = `group_call_${groupId}_${Date.now()}`;
    const newGroupCall: GroupCall = {
      id: callId,
      groupId,
      groupName,
      hostUid: user.uid,
      hostName: user.displayName || "Study Host",
      type,
      status: "active",
      startedAt: Date.now(),
      participants: {
        [user.uid]: participant,
      },
    };
    await setDoc(callDocRef, newGroupCall);
    return callId;
  }
}

export async function updateGroupCallParticipantMedia(
  groupId: string,
  uid: string,
  updates: Partial<GroupCallParticipant>
) {
  try {
    const callDocRef = doc(db, "group_calls", groupId);
    const snap = await getDoc(callDocRef);
    if (!snap.exists()) return;

    const data = snap.data() as GroupCall;
    if (!data.participants || !data.participants[uid]) return;

    const updatedParticipant = { ...data.participants[uid], ...updates };
    const participants = { ...data.participants, [uid]: updatedParticipant };

    await updateDoc(callDocRef, { participants });
  } catch (e) {
    console.warn("Failed to update group call participant media", e);
  }
}

export async function leaveGroupCall(groupId: string, uid: string) {
  try {
    const callDocRef = doc(db, "group_calls", groupId);
    const snap = await getDoc(callDocRef);
    if (!snap.exists()) return;

    const data = snap.data() as GroupCall;
    const participants = { ...data.participants };
    delete participants[uid];

    // If no participants left, end call
    if (Object.keys(participants).length === 0) {
      await updateDoc(callDocRef, {
        status: "ended",
        endedAt: Date.now(),
        participants: {},
      });
    } else {
      await updateDoc(callDocRef, {
        participants,
      });
    }
  } catch (e) {
    console.warn("Failed to leave group call", e);
  }
}

export async function endGroupCallForGroup(groupId: string) {
  try {
    const callDocRef = doc(db, "group_calls", groupId);
    await updateDoc(callDocRef, {
      status: "ended",
      endedAt: Date.now(),
      participants: {},
    });
  } catch (e) {
    console.warn("Failed to end group call", e);
  }
}

export function subscribeToGroupCall(groupId: string, onUpdate: (call: GroupCall | null) => void): () => void {
  const callDocRef = doc(db, "group_calls", groupId);
  return onSnapshot(callDocRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data() as GroupCall;
      if (data.status === "active") {
        onUpdate(data);
      } else {
        onUpdate(null);
      }
    } else {
      onUpdate(null);
    }
  }, (err) => {
    console.warn("Group call snapshot subscription error:", err);
  });
}

export function subscribeToAllActiveGroupCalls(onUpdate: (callsMap: Record<string, GroupCall>) => void): () => void {
  const colRef = collection(db, "group_calls");
  const q = query(colRef, where("status", "==", "active"));
  return onSnapshot(q, (snapshot) => {
    const map: Record<string, GroupCall> = {};
    snapshot.forEach((d) => {
      const call = d.data() as GroupCall;
      map[call.groupId] = call;
    });
    onUpdate(map);
  }, (err) => {
    console.warn("All active group calls subscription error:", err);
  });
}

// ==========================================
// 5. Group Study WebRTC Multi-Peer Mesh Signaling
// ==========================================

export interface GroupSignalMessage {
  id?: string;
  fromUid: string;
  toUid: string;
  type: "offer" | "answer" | "candidate";
  sdp?: any;
  candidate?: any;
  timestamp: number;
}

export async function sendGroupSignal(groupId: string, message: GroupSignalMessage) {
  try {
    const docId = `${message.fromUid}_to_${message.toUid}_${message.type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const signalRef = doc(db, "group_calls", groupId, "signals", docId);
    await setDoc(signalRef, {
      ...message,
      timestamp: Date.now(),
    });
  } catch (e) {
    console.warn("Failed to send group signal", e);
  }
}

export function subscribeToGroupSignals(
  groupId: string,
  currentUid: string,
  onSignal: (signal: GroupSignalMessage) => void
): () => void {
  const signalsCol = collection(db, "group_calls", groupId, "signals");
  const connectionStartTime = Date.now() - 45000; // Allow recent messages up to 45 seconds old

  return onSnapshot(signalsCol, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const data = change.doc.data() as GroupSignalMessage;
        if (data.toUid === currentUid && data.fromUid !== currentUid) {
          // Discard signals older than 45 seconds to avoid corrupting renegotiation with stale sessions
          if (data.timestamp && data.timestamp < connectionStartTime) {
            return;
          }
          onSignal(data);
        }
      }
    });
  }, (err) => {
    console.warn("Group signals subscription error:", err);
  });
}

export class GroupMeshManager {
  private groupId: string;
  private currentUid: string;
  private localStream: MediaStream | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private remoteStreams = new Map<string, MediaStream>();
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  private unsubscribeSignals: (() => void) | null = null;
  private onRemoteTrackCallback: (peerUid: string, stream: MediaStream) => void;
  private onRemoteAudioLevelCallback?: (peerUid: string, level: number) => void;
  private audioMeters = new Map<string, () => void>();

  constructor(
    groupId: string,
    currentUid: string,
    onRemoteTrack: (peerUid: string, stream: MediaStream) => void,
    onRemoteAudioLevel?: (peerUid: string, level: number) => void
  ) {
    this.groupId = groupId;
    this.currentUid = currentUid;
    this.onRemoteTrackCallback = onRemoteTrack;
    this.onRemoteAudioLevelCallback = onRemoteAudioLevel;

    this.unsubscribeSignals = subscribeToGroupSignals(groupId, currentUid, (signal) => {
      this.handleIncomingSignal(signal);
    });
  }

  setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    if (!stream) return;

    // Attach or update tracks across all active peer connections
    this.peerConnections.forEach((pc) => {
      const senders = pc.getSenders();
      stream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track && s.track.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track).catch(() => {});
        } else {
          try {
            pc.addTrack(track, stream);
          } catch (e) {
            console.debug("addTrack warning:", e);
          }
        }
      });
    });
  }

  async syncParticipants(participants: Record<string, GroupCallParticipant>) {
    const peerUids = Object.keys(participants).filter((uid) => uid !== this.currentUid);

    // Close removed peers
    this.peerConnections.forEach((pc, peerUid) => {
      if (!peerUids.includes(peerUid)) {
        pc.close();
        this.peerConnections.delete(peerUid);
        this.remoteStreams.delete(peerUid);
        if (this.audioMeters.has(peerUid)) {
          this.audioMeters.get(peerUid)!();
          this.audioMeters.delete(peerUid);
        }
      }
    });

    // For new peers, initiate if currentUid > peerUid (prevents dual-offer collisions)
    for (const peerUid of peerUids) {
      if (!this.peerConnections.has(peerUid)) {
        if (this.currentUid > peerUid) {
          await this.createOfferForPeer(peerUid);
        }
      }
    }
  }

  private getOrCreatePeerConnection(peerUid: string): RTCPeerConnection {
    if (this.peerConnections.has(peerUid)) {
      return this.peerConnections.get(peerUid)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(peerUid, pc);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, this.localStream!);
        } catch (err) {
          console.debug("Could not add initial track:", err);
        }
      });
    }

    // Always add video and audio transceivers if not present so any member can toggle camera at any time
    const senders = pc.getSenders();
    const hasAudio = senders.some((s) => s.track?.kind === "audio");
    const hasVideo = senders.some((s) => s.track?.kind === "video");

    if (!hasAudio && pc.addTransceiver) {
      try {
        pc.addTransceiver("audio", { direction: "sendrecv" });
      } catch (e) {
        console.debug("Audio transceiver init:", e);
      }
    }

    if (!hasVideo && pc.addTransceiver) {
      try {
        pc.addTransceiver("video", { direction: "sendrecv" });
      } catch (e) {
        console.debug("Video transceiver init:", e);
      }
    }

    pc.ontrack = (event) => {
      let rStream = this.remoteStreams.get(peerUid);
      if (!rStream) {
        const [incomingStream] = event.streams;
        rStream = incomingStream ? new MediaStream(incomingStream.getTracks()) : new MediaStream();
        this.remoteStreams.set(peerUid, rStream);
      }

      // Add or update track in peer's remote stream
      if (event.track) {
        event.track.enabled = true;
        const existingTrack = rStream.getTracks().find((t) => t.kind === event.track.kind);
        if (existingTrack && existingTrack.id !== event.track.id) {
          try {
            rStream.removeTrack(existingTrack);
          } catch (e) {
            console.debug("Track removal notice:", e);
          }
        }
        if (!rStream.getTracks().some((t) => t.id === event.track.id)) {
          rStream.addTrack(event.track);
        }

        // Listen for unmuting or track activation
        event.track.onunmute = () => {
          const updatedStream = new MediaStream(rStream!.getTracks());
          this.remoteStreams.set(peerUid, updatedStream);
          this.onRemoteTrackCallback(peerUid, updatedStream);
        };
      }

      const streamSnapshot = new MediaStream(rStream.getTracks());
      this.onRemoteTrackCallback(peerUid, streamSnapshot);

      if (this.onRemoteAudioLevelCallback) {
        if (this.audioMeters.has(peerUid)) {
          this.audioMeters.get(peerUid)!();
        }
        const stopMeter = createAudioLevelMeter(streamSnapshot, (level) => {
          this.onRemoteAudioLevelCallback?.(peerUid, level);
        });
        this.audioMeters.set(peerUid, stopMeter);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendGroupSignal(this.groupId, {
          fromUid: this.currentUid,
          toUid: peerUid,
          type: "candidate",
          candidate: event.candidate.toJSON(),
          timestamp: Date.now(),
        });
      }
    };

    return pc;
  }

  async createOfferForPeer(peerUid: string) {
    try {
      const pc = this.getOrCreatePeerConnection(peerUid);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      await sendGroupSignal(this.groupId, {
        fromUid: this.currentUid,
        toUid: peerUid,
        type: "offer",
        sdp: { type: offer.type, sdp: offer.sdp },
        timestamp: Date.now(),
      });
    } catch (e) {
      console.warn("Failed to create offer for group peer:", peerUid, e);
    }
  }

  private async handleIncomingSignal(signal: GroupSignalMessage) {
    const peerUid = signal.fromUid;
    try {
      if (signal.type === "offer" && signal.sdp) {
        const pc = this.getOrCreatePeerConnection(peerUid);
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

        // Process any queued ICE candidates
        if (this.pendingCandidates.has(peerUid)) {
          const candidates = this.pendingCandidates.get(peerUid)!;
          for (const c of candidates) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          }
          this.pendingCandidates.delete(peerUid);
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await sendGroupSignal(this.groupId, {
          fromUid: this.currentUid,
          toUid: peerUid,
          type: "answer",
          sdp: { type: answer.type, sdp: answer.sdp },
          timestamp: Date.now(),
        });
      } else if (signal.type === "answer" && signal.sdp) {
        const pc = this.peerConnections.get(peerUid);
        if (pc && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          if (this.pendingCandidates.has(peerUid)) {
            const candidates = this.pendingCandidates.get(peerUid)!;
            for (const c of candidates) {
              await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
            }
            this.pendingCandidates.delete(peerUid);
          }
        }
      } else if (signal.type === "candidate" && signal.candidate) {
        const pc = this.peerConnections.get(peerUid);
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
        } else {
          const list = this.pendingCandidates.get(peerUid) || [];
          list.push(signal.candidate);
          this.pendingCandidates.set(peerUid, list);
        }
      }
    } catch (e) {
      console.warn("Error handling incoming group signal:", signal.type, e);
    }
  }

  toggleMic(isMuted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
    this.peerConnections.forEach((pc) => {
      pc.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === "audio") {
          sender.track.enabled = !isMuted;
        }
      });
    });
  }

  toggleVideo(isVideoOff: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !isVideoOff;
      });
    }
    this.peerConnections.forEach((pc) => {
      pc.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === "video") {
          sender.track.enabled = !isVideoOff;
        }
      });
    });
  }

  async addOrReplaceVideoTrack(videoTrack: MediaStreamTrack) {
    for (const [peerUid, pc] of this.peerConnections.entries()) {
      const senders = pc.getSenders();
      const videoSender = senders.find((s) => s.track?.kind === "video" || (!s.track && (s as any).dtlsTransport));
      if (videoSender) {
        await videoSender.replaceTrack(videoTrack);
      } else {
        pc.addTrack(videoTrack, this.localStream || new MediaStream([videoTrack]));
      }
      // Trigger renegotiation offer so remote peer immediately receives and renders the video stream
      await this.createOfferForPeer(peerUid);
    }
  }

  close() {
    if (this.unsubscribeSignals) {
      this.unsubscribeSignals();
      this.unsubscribeSignals = null;
    }
    this.audioMeters.forEach((stop) => stop());
    this.audioMeters.clear();
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.clear();
    this.pendingCandidates.clear();
  }
}
