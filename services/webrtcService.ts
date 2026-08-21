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

// ==========================================
// 1. Web Audio API Ringtone & Chime Synthesizer
// ==========================================
class CallAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private ringOscillator: OscillatorNode | null = null;
  private ringInterval: any = null;

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

  // Play continuous incoming ring melody (pleasant dual tone)
  startIncomingRing() {
    this.stopAll();
    try {
      const ctx = this.getContext();
      const playTonePattern = () => {
        if (!ctx || ctx.state === "closed") return;
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(440, now); // A4
        osc2.frequency.setValueAtTime(480, now); // B4

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
        gain.gain.setValueAtTime(0.18, now + 0.85);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.95);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.0);
        osc2.stop(now + 1.0);

        // Second chirp in pattern
        const now2 = now + 1.1;
        const osc3 = ctx.createOscillator();
        const osc4 = ctx.createOscillator();
        const gain2 = ctx.createGain();

        osc3.type = "sine";
        osc4.type = "sine";
        osc3.frequency.setValueAtTime(440, now2);
        osc4.frequency.setValueAtTime(480, now2);

        gain2.gain.setValueAtTime(0.001, now2);
        gain2.gain.linearRampToValueAtTime(0.18, now2 + 0.08);
        gain2.gain.setValueAtTime(0.18, now2 + 0.85);
        gain2.gain.linearRampToValueAtTime(0.001, now2 + 0.95);

        osc3.connect(gain2);
        osc4.connect(gain2);
        gain2.connect(ctx.destination);

        osc3.start(now2);
        osc4.start(now2);
        osc3.stop(now2 + 1.0);
        osc4.stop(now2 + 1.0);
      };

      playTonePattern();
      this.ringInterval = setInterval(playTonePattern, 3000);
    } catch (e) {
      console.warn("Could not play incoming ringtone", e);
    }
  }

  // Play outgoing ringback tone (soft rhythmic beep)
  startOutgoingRingback() {
    this.stopAll();
    try {
      const ctx = this.getContext();
      const playBeep = () => {
        if (!ctx || ctx.state === "closed") return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(425, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gain.gain.setValueAtTime(0.12, now + 1.2);
        gain.gain.linearRampToValueAtTime(0.001, now + 1.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.35);
      };

      playBeep();
      this.ringInterval = setInterval(playBeep, 3500);
    } catch (e) {
      console.warn("Could not play outgoing ringback", e);
    }
  }

  // Play cheerful connected chime
  playConnectedChime() {
    this.stopAll();
    try {
      const ctx = this.getContext();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

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
  playEndedChime() {
    this.stopAll();
    try {
      const ctx = this.getContext();
      const notes = [440, 330, 220]; // Descending
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

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
  playHandRaisedChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch (e) {
      console.warn("Could not play hand raise chime", e);
    }
  }

  stopAll() {
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
  ],
  iceCandidatePoolSize: 10,
};

export async function getLocalUserMedia(type: CallType, facingMode: "user" | "environment" = "user"): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Camera/Microphone access is not supported on this browser.");
  }

  try {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: type === "video" ? {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      } : false,
    };

    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err: any) {
    // If video fails (e.g. no camera attached), fallback gracefully to audio-only
    if (type === "video") {
      console.warn("Video stream request failed, falling back to audio only", err);
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      });
    }
    throw err;
  }
}

export async function getVideoMediaTrack(facingMode: "user" | "environment" = "user"): Promise<MediaStreamTrack | null> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return null;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    return stream.getVideoTracks()[0] || null;
  } catch (e) {
    console.warn("Could not acquire standalone video track:", e);
    return null;
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
    where("status", "==", "ringing"),
    limit(1)
  );

  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const docData = snapshot.docs[0].data() as DirectCall;
      // Ensure call is recent (less than 60 seconds old to prevent stale popups)
      if (Date.now() - docData.startedAt < 60000) {
        onIncomingCall(docData);
        return;
      }
    }
    onIncomingCall(null);
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
