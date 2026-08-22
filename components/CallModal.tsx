import React, { useState, useEffect, useRef } from "react";
import {
  CallType,
  DirectCall,
  GroupCall,
} from "../types";
import {
  callAudio,
  getLocalUserMedia,
  getVideoMediaTrack,
  getScreenShareStream,
  stopAllStreamTracks,
  createAudioLevelMeter,
  answerDirectCall,
  declineDirectCall,
  endDirectCall,
  leaveGroupCall,
  endGroupCallForGroup,
  updateGroupCallParticipantMedia,
  setDirectCallOffer,
  addDirectCallIceCandidate,
  subscribeToDirectCall,
  subscribeToGroupCall,
  ICE_SERVERS,
  GroupMeshManager,
} from "../services/webrtcService";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Hand,
  Maximize2,
  Minimize2,
  Grid,
  Sparkles,
  ShieldCheck,
  Camera,
  Radio,
  Volume2,
  VolumeX,
  X,
  MessageCircle,
  Crown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CallModalProps {
  // Current user info
  currentUser: {
    uid: string;
    displayName: string;
    photoURL?: string;
  };
  // Direct call state (if any)
  activeDirectCall: DirectCall | null;
  incomingDirectCall: DirectCall | null;
  onCloseDirectCall: () => void;
  // Group call state (if any)
  activeGroupCall: GroupCall | null;
  onCloseGroupCall: () => void;
  // Direct call accepted callback
  onDirectCallAccepted?: (call: DirectCall) => void;
  // Toast trigger
  triggerToast?: (title: string, message: string, category?: string) => void;
}

const ParticipantTile: React.FC<{
  participant: any;
  isMe: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isVideoOff: boolean;
  isMuted: boolean;
  cameraFacing: "user" | "environment";
  isSpeaking: boolean;
  isSpeakerMuted: boolean;
  onFlipCamera?: () => void;
}> = ({
  participant,
  isMe,
  localStream,
  remoteStream,
  isVideoOff,
  isMuted,
  cameraFacing,
  isSpeaking,
  isSpeakerMuted,
  onFlipCamera,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stream = isMe ? localStream : remoteStream;
  const hasLiveVideoTrack = Boolean(
    stream &&
    stream.getVideoTracks().length > 0 &&
    stream.getVideoTracks().some((t) => t.enabled && t.readyState === "live")
  );

  const showVideo = isMe ? (!isVideoOff && hasLiveVideoTrack) : (!participant.isVideoOff && hasLiveVideoTrack);

  // Attach video stream to videoRef
  useEffect(() => {
    if (videoRef.current && stream && showVideo) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [stream, showVideo]);

  // For remote members: attach audio stream and strictly respect mute states
  useEffect(() => {
    if (!isMe && audioRef.current && remoteStream) {
      if (audioRef.current.srcObject !== remoteStream) {
        audioRef.current.srcObject = remoteStream;
      }
      const shouldMute = isSpeakerMuted || Boolean(participant.isMuted);
      audioRef.current.muted = shouldMute;
      if (!shouldMute) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isMe, remoteStream, isSpeakerMuted, participant.isMuted]);

  return (
    <div className="relative rounded-3xl bg-slate-900/95 border border-slate-800 overflow-hidden flex flex-col items-center justify-center p-3 sm:p-4 min-h-[180px] sm:min-h-[230px] shadow-xl group transition-all">
      {/* Remote audio playback element */}
      {!isMe && (
        <audio
          ref={audioRef}
          autoPlay
          muted={isSpeakerMuted || Boolean(participant.isMuted)}
          className="hidden"
        />
      )}

      {/* Speaking Glow indicator */}
      {isSpeaking && (
        <div className="absolute inset-0 rounded-3xl border-2 border-emerald-400 animate-pulse pointer-events-none z-20 shadow-[0_0_15px_rgba(52,211,153,0.35)]" />
      )}

      {/* Video View or Avatar */}
      {showVideo && stream ? (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMe}
            className={`w-full h-full object-cover rounded-2xl ${isMe && cameraFacing === "user" ? "scale-x-[-1]" : ""}`}
          />
          {isMe && onFlipCamera && (
            <button
              onClick={onFlipCamera}
              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg text-xs cursor-pointer shadow z-10"
              title="Switch Camera"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative flex flex-col items-center justify-center">
          {/* Avatar with speaking wave */}
          <div className="relative">
            {isSpeaking && (
              <span className="absolute -inset-2 rounded-full border-2 border-emerald-400/80 animate-ping pointer-events-none" />
            )}
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-extrabold text-2xl sm:text-3xl flex items-center justify-center shadow-lg border-2 border-slate-700 overflow-hidden">
              {participant.photoURL ? (
                <img src={participant.photoURL} alt={participant.displayName} className="w-full h-full object-cover" />
              ) : (
                participant.displayName?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>
            {participant.isHandRaised && (
              <div className="absolute -top-1 -right-1 p-2 bg-amber-500 text-white rounded-full shadow-lg animate-bounce z-10">
                <Hand className="w-4 h-4" />
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-2 font-medium">
            {isMe ? (isVideoOff ? "Camera Off" : "Starting camera...") : (participant.isVideoOff ? "Camera Off" : (remoteStream ? "Connecting video..." : "Connecting audio/video..."))}
          </p>
        </div>
      )}

      {/* Participant Name & Mic Status Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-20">
        <div className="px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-xl text-white text-xs font-bold flex items-center gap-1.5 truncate max-w-[80%] shadow">
          <span className="truncate">{participant.displayName} {isMe && "(You)"}</span>
          {participant.role === "host" && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isMuted ? (
            <div className="p-1.5 bg-rose-500 text-white rounded-lg text-xs shadow" title="Muted">
              <MicOff className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className={`p-1.5 rounded-lg text-xs text-white shadow ${isSpeaking ? "bg-emerald-500 animate-pulse" : "bg-slate-700/80"}`} title="Microphone Active">
              <Mic className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CallModal: React.FC<CallModalProps> = ({
  currentUser = { uid: "guest_user", displayName: "Scholar User" },
  activeDirectCall,
  incomingDirectCall,
  onCloseDirectCall,
  activeGroupCall,
  onCloseGroupCall,
  onDirectCallAccepted,
  triggerToast,
}) => {
  // Local media stream states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Control toggles
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [isMinimized, setIsMinimized] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"grid" | "spotlight">("grid");
  const [showInCallChat, setShowInCallChat] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const [sharedNotes, setSharedNotes] = useState<string[]>([]);

  // Audio level meters
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  const [groupRemoteAudioLevels, setGroupRemoteAudioLevels] = useState<Record<string, number>>({});

  // Group Study Room Mesh Connection and Remote Streams
  const groupMeshRef = useRef<GroupMeshManager | null>(null);
  const [groupRemoteStreams, setGroupRemoteStreams] = useState<Record<string, MediaStream>>({});

  // Call duration counter
  const [callDuration, setCallDuration] = useState(0);
  const durationTimerRef = useRef<any>(null);

  // WebRTC Peer Connection ref for 1-on-1
  const peerConnRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const addedIceCandidatesRef = useRef<Set<string>>(new Set());

  // Track if incoming call was answered/dismissed to transition UI immediately
  const [incomingCallDismissed, setIncomingCallDismissed] = useState(false);

  // Live real-time synced state for 1-on-1 call
  const [liveDirectCall, setLiveDirectCall] = useState<DirectCall | null>(activeDirectCall);
  // Live real-time synced state for Group call
  const [liveGroupCall, setLiveGroupCall] = useState<GroupCall | null>(activeGroupCall);

  // Reset incoming dismissed state when incomingDirectCall changes
  useEffect(() => {
    if (incomingDirectCall) {
      setIncomingCallDismissed(false);
    }
  }, [incomingDirectCall?.id]);

  // Tab Title Flashing & Mobile Vibration for Incoming Calls
  useEffect(() => {
    let titleInterval: any = null;
    const originalTitle = document.title || "SJ Tutor AI";

    if (incomingDirectCall && !incomingCallDismissed) {
      let toggle = false;
      titleInterval = setInterval(() => {
        document.title = toggle
          ? `🔴 Incoming Call: ${incomingDirectCall.callerName}!`
          : `📞 Ringing - SJ Tutor AI`;
        toggle = !toggle;
      }, 1000);

      // Trigger device vibration if supported
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate([400, 200, 400, 200, 400]);
        } catch (err) {
          console.warn("Vibration notice:", err);
        }
      }
    } else {
      document.title = originalTitle;
    }

    return () => {
      if (titleInterval) clearInterval(titleInterval);
      document.title = originalTitle;
    };
  }, [incomingDirectCall?.id, incomingCallDismissed]);

  // ----------------------------------------------------
  // Direct Call Live Sync
  // ----------------------------------------------------
  useEffect(() => {
    setLiveDirectCall(activeDirectCall);
    if (!activeDirectCall) return;

    const unsubscribe = subscribeToDirectCall(activeDirectCall.id, (updated) => {
      if (!updated || updated.status === "ended" || updated.status === "declined" || updated.status === "busy") {
        if (updated?.status === "ended") {
          callAudio.playEndedChime();
          triggerToast?.("Call Ended", `Call with ${updated.callerId === currentUser.uid ? updated.receiverName : updated.callerName} ended.`, "Important Alerts");
        } else if (updated?.status === "declined") {
          callAudio.playEndedChime();
          triggerToast?.("Call Declined", "The user is unavailable or declined the call.", "Important Alerts");
        }
        cleanupCall();
        onCloseDirectCall();
      } else {
        setLiveDirectCall(updated);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeDirectCall?.id]);

  // ----------------------------------------------------
  // Group Call Live Sync
  // ----------------------------------------------------
  useEffect(() => {
    setLiveGroupCall(activeGroupCall);
    if (!activeGroupCall) return;

    const unsubscribe = subscribeToGroupCall(activeGroupCall.groupId, (updated) => {
      if (!updated || updated.status === "ended") {
        callAudio.playEndedChime();
        triggerToast?.("Group Call Ended", "The live study room call has concluded.", "Important Alerts");
        cleanupCall();
        onCloseGroupCall();
      } else {
        setLiveGroupCall(updated);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeGroupCall?.groupId]);

  // ----------------------------------------------------
  // Group Call Mesh WebRTC Connections Management
  // ----------------------------------------------------
  useEffect(() => {
    if (!liveGroupCall || liveGroupCall.status !== "active") {
      if (groupMeshRef.current) {
        groupMeshRef.current.close();
        groupMeshRef.current = null;
      }
      setGroupRemoteStreams({});
      setGroupRemoteAudioLevels({});
      return;
    }

    if (!groupMeshRef.current) {
      groupMeshRef.current = new GroupMeshManager(
        liveGroupCall.groupId,
        currentUser.uid,
        (peerUid, stream) => {
          setGroupRemoteStreams((prev) => ({ ...prev, [peerUid]: stream }));
        },
        (peerUid, level) => {
          setGroupRemoteAudioLevels((prev) => ({ ...prev, [peerUid]: level }));
        }
      );
    }

    if (localStream) {
      groupMeshRef.current.setLocalStream(localStream);
    }

    if (liveGroupCall.participants) {
      groupMeshRef.current.syncParticipants(liveGroupCall.participants);
    }
  }, [liveGroupCall?.groupId, liveGroupCall?.participants, localStream]);

  // ----------------------------------------------------
  // Call Duration Timer
  // ----------------------------------------------------
  useEffect(() => {
    const isConnected =
      (liveDirectCall && liveDirectCall.status === "connected") ||
      (liveGroupCall && liveGroupCall.status === "active");

    if (isConnected) {
      if (!durationTimerRef.current) {
        setCallDuration(0);
        durationTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };
  }, [liveDirectCall?.status, liveGroupCall?.status]);

  // ----------------------------------------------------
  // Sound Synthesizer Handling (Ringtone / Ringback)
  // ----------------------------------------------------
  useEffect(() => {
    if (incomingDirectCall) {
      callAudio.startIncomingRing();
    } else if (liveDirectCall && liveDirectCall.status === "ringing" && liveDirectCall.callerId === currentUser.uid) {
      callAudio.startOutgoingRingback();
    } else if (liveDirectCall && liveDirectCall.status === "connected") {
      callAudio.playConnectedChime();
    } else if (liveGroupCall && liveGroupCall.status === "active") {
      callAudio.playConnectedChime();
    } else {
      callAudio.stopAll();
    }

    return () => {
      callAudio.stopAll();
    };
  }, [incomingDirectCall, liveDirectCall?.status, liveGroupCall?.status]);

  // ----------------------------------------------------
  // Initialize Media for Direct or Group Call
  // ----------------------------------------------------
  useEffect(() => {
    const activeCallType = liveDirectCall?.type || liveGroupCall?.type;
    const shouldStartMedia = Boolean(
      (liveDirectCall && (liveDirectCall.status === "ringing" || liveDirectCall.status === "connected")) ||
      (liveGroupCall && liveGroupCall.status === "active")
    );

    if (shouldStartMedia && !localStream) {
      let isMounted = true;
      const callType: CallType = activeCallType || "audio";

      getLocalUserMedia(callType, cameraFacing)
        .then((stream) => {
          if (!isMounted) {
            stopAllStreamTracks(stream);
            return;
          }
          setLocalStream(stream);
          setIsVideoOff(callType === "audio");

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          // Setup Web Audio level meter
          const stopMeter = createAudioLevelMeter(stream, (level) => {
            if (isMounted) setLocalAudioLevel(level);
          });

          // WebRTC Setup if 1-on-1 Direct Call
          if (liveDirectCall) {
            setupDirectWebRTC(stream, liveDirectCall);
          }

          return () => stopMeter();
        })
        .catch((err) => {
          console.warn("Could not access camera/mic:", err);
          triggerToast?.("Media Access Notice", "Microphone/camera access was limited. You can still join the call in listening mode.", "Important Alerts");
        });

      return () => {
        isMounted = false;
      };
    }
  }, [liveDirectCall?.id, liveGroupCall?.id]);

  // Attach local video stream whenever video element or stream updates
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isVideoOff, cameraFacing]);

  // Attach remote video stream whenever remote element or stream updates
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      remoteVideoRef.current.play().catch((err) => console.warn("Remote video play notice:", err));
    }
  }, [remoteStream, isVideoOff]);

  // Ensure remote audio playback across all devices and call types
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      if (remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
      remoteAudioRef.current.muted = isSpeakerMuted;
      remoteAudioRef.current
        .play()
        .catch((err) => console.warn("Autoplay audio blocked by browser policy, will play on interaction:", err));
    }
  }, [remoteStream, isSpeakerMuted]);

  // ----------------------------------------------------
  // WebRTC Peer Connection (1-on-1)
  // ----------------------------------------------------
  const setupDirectWebRTC = async (stream: MediaStream, call: DirectCall) => {
    try {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnRef.current = pc;
      addedIceCandidatesRef.current.clear();

      // Add local stream tracks to connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // If video track is not present (audio call), create video transceiver upfront
      // so turning video ON dynamically works seamlessly with replaceTrack
      const hasVideoTrack = stream.getVideoTracks().length > 0;
      if (!hasVideoTrack && pc.addTransceiver) {
        try {
          pc.addTransceiver("video", { direction: "sendrecv" });
        } catch (e) {
          console.debug("Video transceiver fallback:", e);
        }
      }

      // Handle remote incoming stream tracks
      pc.ontrack = (event) => {
        const [incomingStream] = event.streams;
        const streamToUse = incomingStream || new MediaStream([event.track]);
        setRemoteStream(streamToUse);
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = streamToUse;
          remoteAudioRef.current.play().catch(() => {});
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = streamToUse;
          remoteVideoRef.current.play().catch(() => {});
        }
        // Meter remote audio for visual speaking ripples
        createAudioLevelMeter(streamToUse, (level) => {
          setRemoteAudioLevel(level);
        });
      };

      // Handle local ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDirectCallIceCandidate(call.id, call.callerId === currentUser.uid, event.candidate);
        }
      };

      // If we are Caller, create Offer with both Audio and Video reception
      if (call.callerId === currentUser.uid) {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        await setDirectCallOffer(call.id, offer);
      }
    } catch (e) {
      console.error("WebRTC initialization error:", e);
    }
  };

  // Watch for answer or remote ICE candidates in Direct Call
  useEffect(() => {
    if (!liveDirectCall || !peerConnRef.current) return;
    const pc = peerConnRef.current;
    const isCaller = liveDirectCall.callerId === currentUser.uid;

    // Caller receives Answer
    if (isCaller && liveDirectCall.answer && !pc.currentRemoteDescription) {
      const desc = new RTCSessionDescription(liveDirectCall.answer as any);
      pc.setRemoteDescription(desc)
        .then(() => {
          // Process any queued receiver candidates
          if (liveDirectCall.receiverCandidates && liveDirectCall.receiverCandidates.length > 0) {
            liveDirectCall.receiverCandidates.forEach((cand) => {
              const key = JSON.stringify(cand);
              if (!addedIceCandidatesRef.current.has(key)) {
                addedIceCandidatesRef.current.add(key);
                pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
              }
            });
          }
        })
        .catch((err) => console.warn("Failed to set remote description", err));
    }

    // Add candidate pairs once remoteDescription is established
    const candidateList = isCaller ? liveDirectCall.receiverCandidates : liveDirectCall.callerCandidates;
    if (candidateList && candidateList.length > 0 && pc.remoteDescription) {
      candidateList.forEach((cand) => {
        const key = JSON.stringify(cand);
        if (!addedIceCandidatesRef.current.has(key)) {
          addedIceCandidatesRef.current.add(key);
          try {
            pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          } catch {
            // ignore
          }
        }
      });
    }
  }, [liveDirectCall?.answer, liveDirectCall?.receiverCandidates, liveDirectCall?.callerCandidates]);

  // ----------------------------------------------------
  // Clean up all call streams and peer connections
  // ----------------------------------------------------
  const cleanupCall = () => {
    callAudio.stopAll();
    if (peerConnRef.current) {
      peerConnRef.current.close();
      peerConnRef.current = null;
    }
    if (groupMeshRef.current) {
      groupMeshRef.current.close();
      groupMeshRef.current = null;
    }
    addedIceCandidatesRef.current.clear();
    stopAllStreamTracks(localStream);
    stopAllStreamTracks(screenStream);
    setLocalStream(null);
    setRemoteStream(null);
    setScreenStream(null);
    setGroupRemoteStreams({});
    setGroupRemoteAudioLevels({});
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setIsHandRaised(false);
    setIsMinimized(false);
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  };

  // ----------------------------------------------------
  // Action Handlers
  // ----------------------------------------------------
  const handleAcceptIncomingCall = async (type: CallType) => {
    if (!incomingDirectCall) return;
    callAudio.stopAll();

    try {
      const stream = await getLocalUserMedia(type, cameraFacing);
      setLocalStream(stream);
      setIsVideoOff(type === "audio");

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnRef.current = pc;
      addedIceCandidatesRef.current.clear();

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Ensure video transceiver is available if starting with audio
      const hasVideoTrack = stream.getVideoTracks().length > 0;
      if (!hasVideoTrack && pc.addTransceiver) {
        try {
          pc.addTransceiver("video", { direction: "sendrecv" });
        } catch (e) {
          console.debug("Video transceiver fallback:", e);
        }
      }

      pc.ontrack = (event) => {
        const [incoming] = event.streams;
        const streamToUse = incoming || new MediaStream([event.track]);
        setRemoteStream(streamToUse);
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = streamToUse;
          remoteAudioRef.current.play().catch(() => {});
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = streamToUse;
          remoteVideoRef.current.play().catch(() => {});
        }
        createAudioLevelMeter(streamToUse, (lvl) => setRemoteAudioLevel(lvl));
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDirectCallIceCandidate(incomingDirectCall.id, false, event.candidate);
        }
      };

      if (incomingDirectCall.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingDirectCall.offer as any));
        
        // Add any early caller candidates
        if (incomingDirectCall.callerCandidates && incomingDirectCall.callerCandidates.length > 0) {
          incomingDirectCall.callerCandidates.forEach((cand) => {
            const key = JSON.stringify(cand);
            if (!addedIceCandidatesRef.current.has(key)) {
              addedIceCandidatesRef.current.add(key);
              pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
            }
          });
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await answerDirectCall(incomingDirectCall.id, answer);
      } else {
        await answerDirectCall(incomingDirectCall.id, { type: "answer", sdp: "" } as any);
      }

      const connectedCall: DirectCall = {
        ...incomingDirectCall,
        status: "connected",
      };
      setIncomingCallDismissed(true);
      setLiveDirectCall(connectedCall);
      onDirectCallAccepted?.(connectedCall);

      triggerToast?.("Call Connected! 📞", `Connected with ${incomingDirectCall.callerName}.`, "Important Alerts");
    } catch (err) {
      console.error("Failed to answer call:", err);
      triggerToast?.("Answer Failed", "Could not access audio/video stream.", "Important Alerts");
    }
  };

  const handleDeclineIncomingCall = async () => {
    if (!incomingDirectCall) return;
    callAudio.stopAll();
    await declineDirectCall(incomingDirectCall.id, "declined");
    onCloseDirectCall();
  };

  const handleEndDirectCall = async () => {
    if (!liveDirectCall) return;
    callAudio.playEndedChime();
    await endDirectCall(liveDirectCall.id, callDuration);
    cleanupCall();
    onCloseDirectCall();
  };

  const handleLeaveGroupCall = async () => {
    if (!liveGroupCall) return;
    callAudio.playEndedChime();
    await leaveGroupCall(liveGroupCall.groupId, currentUser.uid);
    cleanupCall();
    onCloseGroupCall();
  };

  const handleEndGroupCallForEveryone = async () => {
    if (!liveGroupCall) return;
    callAudio.playEndedChime();
    await endGroupCallForGroup(liveGroupCall.groupId);
    cleanupCall();
    onCloseGroupCall();
  };

  // Toggle Mic
  const handleToggleMic = () => {
    if (!localStream) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    // 1. Immediately toggle all audio tracks in localStream
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    // 2. Immediately toggle all audio senders in WebRTC RTCPeerConnection (1-on-1)
    if (peerConnRef.current) {
      peerConnRef.current.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === "audio") {
          sender.track.enabled = !nextMuted;
        }
      });
    }

    // 3. Immediately toggle audio in group mesh connections
    if (groupMeshRef.current) {
      groupMeshRef.current.toggleMic(nextMuted);
    }

    // 4. Immediately update Group Call participant state in Firestore
    if (liveGroupCall) {
      updateGroupCallParticipantMedia(liveGroupCall.groupId, currentUser.uid, {
        isMuted: nextMuted,
      });
    }

    if (nextMuted) {
      setLocalAudioLevel(0);
    }
  };

  // Toggle Video
  const handleToggleVideo = async () => {
    if (!localStream) {
      try {
        const newStream = await getLocalUserMedia("video", cameraFacing);
        setLocalStream(newStream);
        setIsVideoOff(false);
        if (peerConnRef.current) {
          newStream.getTracks().forEach((t) => peerConnRef.current?.addTrack(t, newStream));
        }
        if (groupMeshRef.current) {
          groupMeshRef.current.setLocalStream(newStream);
          groupMeshRef.current.toggleVideo(false);
        }
        if (liveGroupCall) {
          updateGroupCallParticipantMedia(liveGroupCall.groupId, currentUser.uid, {
            isVideoOff: false,
          });
        }
      } catch (e) {
        console.warn("Could not acquire initial video stream", e);
        triggerToast?.("Camera Notice", "Could not access camera device.", "Important Alerts");
      }
      return;
    }

    const currentVideoTracks = localStream.getVideoTracks();
    if (currentVideoTracks.length > 0) {
      const nextVideoOff = !isVideoOff;
      setIsVideoOff(nextVideoOff);
      currentVideoTracks.forEach((track) => {
        track.enabled = !nextVideoOff;
      });

      if (peerConnRef.current) {
        peerConnRef.current.getSenders().forEach((sender) => {
          if (sender.track && sender.track.kind === "video") {
            sender.track.enabled = !nextVideoOff;
          }
        });
      }

      if (groupMeshRef.current) {
        groupMeshRef.current.toggleVideo(nextVideoOff);
      }

      if (liveGroupCall) {
        updateGroupCallParticipantMedia(liveGroupCall.groupId, currentUser.uid, {
          isVideoOff: nextVideoOff,
        });
      }
    } else {
      // No video track in localStream yet (e.g. started as audio-only call) -> Request new video track from camera!
      try {
        const newVideoTrack = await getVideoMediaTrack(cameraFacing);
        if (newVideoTrack) {
          localStream.addTrack(newVideoTrack);
          setIsVideoOff(false);

          if (peerConnRef.current) {
            const pc = peerConnRef.current;
            const videoSender = pc.getSenders().find(
              (s) => s.track?.kind === "video" || (!s.track && (s as any).dtlsTransport)
            );
            if (videoSender) {
              await videoSender.replaceTrack(newVideoTrack);
            } else {
              pc.addTrack(newVideoTrack, localStream);
            }
          }

          if (groupMeshRef.current) {
            await groupMeshRef.current.addOrReplaceVideoTrack(newVideoTrack);
            groupMeshRef.current.toggleVideo(false);
          }

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }

          if (liveGroupCall) {
            updateGroupCallParticipantMedia(liveGroupCall.groupId, currentUser.uid, {
              isVideoOff: false,
            });
          }
        }
      } catch (err) {
        console.error("Failed to acquire video track on camera toggle:", err);
        triggerToast?.("Camera Error", "Could not turn on camera. Check browser permissions.", "Important Alerts");
      }
    }
  };

  // Screen Share Toggle
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      stopAllStreamTracks(screenStream);
      setScreenStream(null);
      setIsScreenSharing(false);
      if (liveGroupCall) {
        updateGroupCallParticipantMedia(liveGroupCall.groupId, currentUser.uid, {
          isScreenSharing: false,
        });
      }
    } else {
      try {
        const stream = await getScreenShareStream();
        setScreenStream(stream);
        setIsScreenSharing(true);
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
        }
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          if (liveGroupCall) {
            updateGroupCallParticipantMedia(liveGroupCall.groupId, currentUser.uid, {
              isScreenSharing: false,
            });
          }
        };
        if (liveGroupCall) {
          updateGroupCallParticipantMedia(liveGroupCall.groupId, currentUser.uid, {
            isScreenSharing: true,
          });
        }
      } catch (err) {
        console.warn("Screen sharing cancelled or failed", err);
      }
    }
  };

  // Raise Hand Toggle in Group Call
  const handleToggleRaiseHand = () => {
    const nextHand = !isHandRaised;
    setIsHandRaised(nextHand);
    if (nextHand) {
      callAudio.playHandRaisedChime();
    }
    if (liveGroupCall) {
      updateGroupCallParticipantMedia(liveGroupCall.groupId, currentUser.uid, {
        isHandRaised: nextHand,
      });
    }
  };

  // Flip Camera
  const handleFlipCamera = async () => {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(nextFacing);

    try {
      const newVideoTrack = await getVideoMediaTrack(nextFacing);
      if (newVideoTrack && localStream) {
        // Stop and remove old video tracks
        localStream.getVideoTracks().forEach((oldTrack) => {
          oldTrack.stop();
          localStream.removeTrack(oldTrack);
        });

        localStream.addTrack(newVideoTrack);
        setIsVideoOff(false);

        if (peerConnRef.current) {
          const videoSender = peerConnRef.current.getSenders().find(
            (s) => s.track?.kind === "video" || (!s.track && (s as any).dtlsTransport)
          );
          if (videoSender) {
            await videoSender.replaceTrack(newVideoTrack);
          }
        }

        if (groupMeshRef.current) {
          await groupMeshRef.current.addOrReplaceVideoTrack(newVideoTrack);
          groupMeshRef.current.toggleVideo(false);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
      }
    } catch (e) {
      console.warn("Failed to switch camera:", e);
      triggerToast?.("Camera Switch Failed", "Could not switch camera facing mode.", "Important Alerts");
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // =========================================================================
  // 1. INCOMING CALL POPUP MODAL (Ringing)
  // =========================================================================
  if (incomingDirectCall && !incomingCallDismissed && (!liveDirectCall || liveDirectCall.status === "ringing")) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Caller Avatar with Pulsing Rings */}
          <div className="relative w-24 h-24 mx-auto mb-5">
            <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-40"></span>
            <span className="animate-pulse absolute -inset-2 rounded-full bg-emerald-500/30"></span>
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-white font-extrabold text-3xl flex items-center justify-center overflow-hidden shadow-lg border-4 border-white dark:border-slate-800">
              {incomingDirectCall.callerAvatar ? (
                <img
                  src={incomingDirectCall.callerAvatar}
                  alt={incomingDirectCall.callerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                incomingDirectCall.callerName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="absolute bottom-0 right-0 p-1.5 bg-emerald-500 text-white rounded-full border-2 border-white dark:border-slate-900 shadow-md">
              {incomingDirectCall.type === "video" ? (
                <Video className="w-4 h-4" />
              ) : (
                <Phone className="w-4 h-4" />
              )}
            </div>
          </div>

          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">
            {incomingDirectCall.callerName}
          </h3>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-6 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Incoming {incomingDirectCall.type === "video" ? "Video" : "Audio"} Call...
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleDeclineIncomingCall}
              className="flex-1 py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <PhoneOff className="w-5 h-5" />
              <span>Decline</span>
            </button>

            <button
              onClick={() => handleAcceptIncomingCall(incomingDirectCall.type)}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer animate-bounce"
            >
              {incomingDirectCall.type === "video" ? (
                <Video className="w-5 h-5" />
              ) : (
                <PhoneCall className="w-5 h-5" />
              )}
              <span>Accept</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // =========================================================================
  // 2. ACTIVE 1-ON-1 DIRECT CALL (Fullscreen / PiP)
  // =========================================================================
  if (liveDirectCall) {
    const isCaller = liveDirectCall.callerId === currentUser.uid;
    const otherPersonName = isCaller ? liveDirectCall.receiverName : liveDirectCall.callerName;
    const otherPersonAvatar = isCaller ? liveDirectCall.receiverAvatar : liveDirectCall.callerAvatar;
    const isConnecting = liveDirectCall.status === "ringing";

    // Minimized Floating Widget
    if (isMinimized) {
      return (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white p-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-fade-in backdrop-blur-lg">
          {/* Dedicated Audio Element for Minimized State */}
          <audio ref={remoteAudioRef} autoPlay muted={isSpeakerMuted} className="hidden" />
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center overflow-hidden">
              {otherPersonAvatar ? (
                <img src={otherPersonAvatar} alt={otherPersonName} className="w-full h-full object-cover" />
              ) : (
                otherPersonName.charAt(0).toUpperCase()
              )}
            </div>
            {remoteAudioLevel > 15 && (
              <span className="absolute -inset-1 rounded-xl border-2 border-emerald-400 animate-ping pointer-events-none" />
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-slate-200 truncate max-w-[110px]">{otherPersonName}</p>
            <p className="text-[10px] font-mono text-emerald-400">{formatSeconds(callDuration)}</p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleMic}
              className={`p-2 rounded-xl text-xs ${
                isMuted ? "bg-rose-500/20 text-rose-400" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsMinimized(false)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
              title="Expand Call"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleEndDirectCall}
              className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700"
              title="End Call"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    // Full Screen Direct Call Modal
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col justify-between overflow-hidden">
        {/* Dedicated Hidden Audio Element to ensure two-way voice stream playback */}
        <audio
          ref={remoteAudioRef}
          autoPlay
          muted={isSpeakerMuted}
          className="hidden"
        />

        {/* Top Floating Info Bar */}
        <div className="p-4 sm:p-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold flex items-center justify-center overflow-hidden">
              {otherPersonAvatar ? (
                <img src={otherPersonAvatar} alt={otherPersonName} className="w-full h-full object-cover" />
              ) : (
                otherPersonName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                {otherPersonName}
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </h3>
              <p className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {isConnecting ? "Ringing..." : formatSeconds(callDuration)} • {liveDirectCall.type === "video" ? "HD Video" : "Studio Audio"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition cursor-pointer"
              title="Minimize to Floating PiP"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Stage Video / Audio View */}
        <div className="flex-1 relative flex items-center justify-center p-4">
          {/* Main Remote View */}
          {remoteStream && remoteStream.getVideoTracks().length > 0 && remoteStream.getVideoTracks().some(t => t.enabled) ? (
            <div className="relative w-full h-full max-w-4xl flex items-center justify-center">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain rounded-3xl shadow-2xl"
              />
            </div>
          ) : (
            <div className="text-center relative">
              {/* Outer Ambient Audio Ripples */}
              {!isSpeakerMuted && remoteAudioLevel > 10 && (
                <div
                  className="absolute inset-0 -m-8 rounded-full border-2 border-emerald-500/40 animate-ping pointer-events-none"
                  style={{ animationDuration: "1.5s" }}
                />
              )}
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 mx-auto rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-white font-extrabold text-5xl sm:text-6xl flex items-center justify-center shadow-2xl border-4 border-slate-800 overflow-hidden">
                {otherPersonAvatar ? (
                  <img src={otherPersonAvatar} alt={otherPersonName} className="w-full h-full object-cover" />
                ) : (
                  otherPersonName.charAt(0).toUpperCase()
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-4">{otherPersonName}</h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {isConnecting ? "Waiting for answer..." : "End-to-End Encrypted Live Study Call"}
              </p>
            </div>
          )}

          {/* Local User PiP Thumbnail (in corner) */}
          {localStream && localStream.getVideoTracks().length > 0 && (
            <div className="absolute bottom-6 right-6 w-32 h-44 sm:w-44 sm:h-60 rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-slate-900 z-10">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraFacing === "user" ? "scale-x-[-1]" : ""}`}
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-slate-400 text-xs font-bold">
                  Camera Off
                </div>
              )}
              {!isVideoOff && (
                <button
                  onClick={handleFlipCamera}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg text-xs cursor-pointer shadow"
                  title="Switch Camera"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Floating Control Bar */}
        <div className="p-6 pb-8 flex items-center justify-center gap-3 sm:gap-5 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          {/* Mic Toggle */}
          <button
            onClick={handleToggleMic}
            className={`p-4 rounded-2xl text-white font-bold transition shadow-lg cursor-pointer ${
              isMuted
                ? "bg-rose-500 hover:bg-rose-600 ring-2 ring-rose-400/50"
                : "bg-white/15 hover:bg-white/25 backdrop-blur-md"
            }`}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Video Toggle */}
          <button
            onClick={handleToggleVideo}
            className={`p-4 rounded-2xl text-white font-bold transition shadow-lg cursor-pointer ${
              isVideoOff
                ? "bg-rose-500 hover:bg-rose-600 ring-2 ring-rose-400/50"
                : "bg-white/15 hover:bg-white/25 backdrop-blur-md"
            }`}
            title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>

          {/* Screen Share Toggle */}
          <button
            onClick={handleToggleScreenShare}
            className={`p-4 rounded-2xl text-white font-bold transition shadow-lg cursor-pointer ${
              isScreenSharing
                ? "bg-indigo-600 hover:bg-indigo-700 ring-2 ring-indigo-400"
                : "bg-white/15 hover:bg-white/25 backdrop-blur-md"
            }`}
            title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
          >
            {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
          </button>

          {/* Speaker Mute Toggle */}
          <button
            onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
            className={`p-4 rounded-2xl text-white font-bold transition shadow-lg cursor-pointer ${
              isSpeakerMuted
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-white/15 hover:bg-white/25 backdrop-blur-md"
            }`}
            title={isSpeakerMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isSpeakerMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndDirectCall}
            className="p-4 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-xl shadow-rose-600/40 flex items-center gap-2 transition active:scale-95 cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
            <span className="hidden sm:inline">End</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. ACTIVE GROUP STUDY ROOM CALL (Multi-User Lounge)
  // =========================================================================
  if (liveGroupCall) {
    const participantsList = Object.values(liveGroupCall.participants || {});
    const isHost = liveGroupCall.hostUid === currentUser.uid;

    // Minimized Floating Widget for Group Call
    if (isMinimized) {
      return (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3.5 animate-fade-in backdrop-blur-lg">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <p className="text-xs font-bold text-slate-200 truncate max-w-[130px]">{liveGroupCall.groupName}</p>
              <p className="text-[10px] font-mono text-emerald-400">{participantsList.length} in room • {formatSeconds(callDuration)}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleMic}
              className={`p-2 rounded-xl text-xs ${
                isMuted ? "bg-rose-500/20 text-rose-400" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsMinimized(false)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
              title="Expand Room"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleLeaveGroupCall}
              className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700"
              title="Leave Room"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    // Full Screen Group Study Lounge
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col justify-between overflow-hidden">
        {/* TOP HEADER */}
        <div className="p-4 sm:p-5 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                {liveGroupCall.groupName}
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  LIVE STUDY ROOM
                </span>
              </h3>
              <p className="text-xs font-mono text-slate-400 flex items-center gap-2">
                <span className="text-emerald-400 font-bold">{participantsList.length} participants</span>
                <span>•</span>
                <span>{formatSeconds(callDuration)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <button
              onClick={() => setLayoutMode(layoutMode === "grid" ? "spotlight" : "grid")}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition cursor-pointer text-xs font-semibold flex items-center gap-1.5"
              title="Toggle Layout"
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">{layoutMode === "grid" ? "Spotlight" : "Grid"}</span>
            </button>

            {/* Quick In-Call Notes / Chat Toggle */}
            <button
              onClick={() => setShowInCallChat(!showInCallChat)}
              className={`p-2.5 rounded-2xl backdrop-blur-md transition cursor-pointer text-xs font-semibold flex items-center gap-1.5 ${
                showInCallChat ? "bg-amber-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"
              }`}
              title="In-Call Study Notes"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Notes</span>
            </button>

            {/* Minimize */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition cursor-pointer"
              title="Minimize to Floating PiP"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MAIN BODY (Grid + Optional Notes Drawer) */}
        <div className="flex-1 min-h-0 flex relative overflow-hidden p-3 sm:p-4 gap-3">
          {/* PARTICIPANTS GRID */}
          <div className={`flex-1 min-h-0 overflow-y-auto ${
            layoutMode === "grid"
              ? `grid gap-3 ${
                  participantsList.length === 1
                    ? "grid-cols-1"
                    : participantsList.length === 2
                    ? "grid-cols-1 md:grid-cols-2"
                    : participantsList.length <= 4
                    ? "grid-cols-2"
                    : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                }`
              : "flex flex-col gap-3"
          }`}>
            {/* If Screen Share is Active, Show Spotlight Stage */}
            {isScreenSharing && (
              <div className="col-span-full h-80 sm:h-96 rounded-3xl bg-slate-900 border-2 border-indigo-500/50 overflow-hidden relative shadow-2xl">
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md">
                  <Monitor className="w-3.5 h-3.5" />
                  Your Screen Presentation
                </div>
              </div>
            )}

            {participantsList.map((p) => {
              const isMe = p.uid === currentUser.uid;
              const isSpeaking = isMe
                ? (!isMuted && localAudioLevel > 12)
                : (!p.isMuted && (groupRemoteAudioLevels[p.uid] || 0) > 12);

              return (
                <ParticipantTile
                  key={p.uid}
                  participant={p}
                  isMe={isMe}
                  localStream={localStream}
                  remoteStream={groupRemoteStreams[p.uid] || null}
                  isVideoOff={isMe ? isVideoOff : p.isVideoOff}
                  isMuted={isMe ? isMuted : p.isMuted}
                  cameraFacing={cameraFacing}
                  isSpeaking={isSpeaking}
                  isSpeakerMuted={isSpeakerMuted}
                  onFlipCamera={isMe ? handleFlipCamera : undefined}
                />
              );
            })}
          </div>

          {/* IN-CALL STUDY NOTES & CHAT DRAWER */}
          <AnimatePresence>
            {showInCallChat && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 300, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between shadow-2xl h-full"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Live Study Scratchpad
                    </h4>
                    <button
                      onClick={() => setShowInCallChat(false)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {sharedNotes.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">
                        Post formulas, takeaways, or quick answers during this study session.
                      </p>
                    ) : (
                      sharedNotes.map((note, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-slate-800/80 rounded-xl text-xs text-slate-200 border border-slate-700/50"
                        >
                          {note}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={quickNote}
                      onChange={(e) => setQuickNote(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && quickNote.trim()) {
                          setSharedNotes((prev) => [...prev, `${currentUser.displayName}: ${quickNote.trim()}`]);
                          setQuickNote("");
                        }
                      }}
                      placeholder="Type a formula or note..."
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      onClick={() => {
                        if (quickNote.trim()) {
                          setSharedNotes((prev) => [...prev, `${currentUser.displayName}: ${quickNote.trim()}`]);
                          setQuickNote("");
                        }
                      }}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM CONTROLS BAR */}
        <div className="p-4 sm:p-6 flex items-center justify-center gap-2.5 sm:gap-4 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent border-t border-slate-800/60 flex-wrap">
          {/* Mic Mute */}
          <button
            onClick={handleToggleMic}
            className={`p-3.5 sm:p-4 rounded-2xl text-white font-bold transition shadow-lg cursor-pointer ${
              isMuted
                ? "bg-rose-500 hover:bg-rose-600 ring-2 ring-rose-400/50"
                : "bg-white/15 hover:bg-white/25 backdrop-blur-md"
            }`}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={handleToggleVideo}
            className={`p-3.5 sm:p-4 rounded-2xl text-white font-bold transition shadow-lg cursor-pointer ${
              isVideoOff
                ? "bg-rose-500 hover:bg-rose-600 ring-2 ring-rose-400/50"
                : "bg-white/15 hover:bg-white/25 backdrop-blur-md"
            }`}
            title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={handleToggleScreenShare}
            className={`p-3.5 sm:p-4 rounded-2xl text-white font-bold transition shadow-lg cursor-pointer ${
              isScreenSharing
                ? "bg-indigo-600 hover:bg-indigo-700 ring-2 ring-indigo-400"
                : "bg-white/15 hover:bg-white/25 backdrop-blur-md"
            }`}
            title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </button>

          {/* Raise Hand */}
          <button
            onClick={handleToggleRaiseHand}
            className={`p-3.5 sm:p-4 rounded-2xl text-white font-bold transition shadow-lg cursor-pointer ${
              isHandRaised
                ? "bg-amber-500 hover:bg-amber-600 ring-2 ring-amber-300 text-slate-950"
                : "bg-white/15 hover:bg-white/25 backdrop-blur-md"
            }`}
            title={isHandRaised ? "Lower Hand" : "Raise Hand ✋"}
          >
            <Hand className="w-5 h-5" />
          </button>

          {/* Leave Room Button */}
          <button
            onClick={handleLeaveGroupCall}
            className="p-3.5 sm:p-4 px-5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-xl shadow-rose-600/30 flex items-center gap-2 transition active:scale-95 cursor-pointer"
            title="Leave Call"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden sm:inline">Leave</span>
          </button>

          {/* Host End for Everyone */}
          {isHost && (
            <button
              onClick={handleEndGroupCallForEveryone}
              className="p-3.5 sm:p-4 px-4 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold rounded-2xl transition cursor-pointer text-xs"
              title="End call for all members"
            >
              End Room
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};
