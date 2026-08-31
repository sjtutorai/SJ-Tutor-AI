import React, { useState, useEffect, useRef } from "react";
import {
  AppMode,
  StudyRequestData,
  INITIAL_FORM_DATA,
  QuizQuestion,
  HistoryItem,
  UserProfile,
  SJTUTOR_AVATAR,
  HomeworkFile,
  DirectCall,
  GroupCall,
} from "./types";
import { calculateProfileCompletion } from "./utils/profileUtils";
import InputForm from "./components/InputForm";
import QRScanner from "./components/QRScanner";
import ResultsView from "./components/ResultsView";
import QuizView from "./components/QuizView";
import TutorChat from "./components/TutorChat";
import ProfileView from "./components/ProfileView";
import Auth from "./components/Auth";
import SharedLockScreen from "./components/SharedLockScreen";
import PremiumModal from "./components/PremiumModal";
import LoadingState from "./components/LoadingState";
import SplashScreen from "./components/SplashScreen";
import DashboardSkeleton from "./components/DashboardSkeleton";
import NotesView from "./components/NotesView";
import GroupsView from "./components/GroupsView";
import GroupInviteView from "./components/GroupInviteView";
import { CallModal } from "./components/CallModal";
import { subscribeToIncomingCalls, declineDirectCall } from "./services/webrtcService";
import { NotificationService } from "./services/notificationService";
import SettingsView from "./components/SettingsView";
import AboutView from "./components/AboutView";
import AboutModal from "./components/AboutModal";
import ShortcutsModal from "./components/ShortcutsModal";
import IdCardView from "./components/IdCardView";
import LandingPage from "./components/LandingPage";
import StudyTimerView from "./components/StudyTimerView";
import PrivacyPolicyView from "./components/PrivacyPolicyView";
import TermsOfServiceView from "./components/TermsOfServiceView";
import NotificationsView from "./components/NotificationsView";
import { useNotifications } from "./components/NotificationContext";
import NotificationDropdown from "./components/NotificationDropdown";
import Tutorial from "./components/Tutorial";
import { useStreak } from "./components/StreakContext";
import { FloatingStreakWidget } from "./components/FloatingStreakWidget";
import { TrialHeaderBadge, TrialBannerCard, calculateTrialInfo } from "./components/TrialTimerWidget";
import { SharedContentView } from "./components/SharedContentView";
import { PublicShareViewer } from "./components/PublicShareViewer";
import { DevicesHeaderButton } from "./components/DevicesHeaderButton";
import { DevicesModal } from "./components/DevicesModal";
import { DeviceService, DeviceSession, getCurrentDeviceId } from "./services/deviceService";
import { SecurityPinLockScreen } from "./components/SecurityPinLockScreen";
import { TwoStepLoginModal } from "./components/TwoStepLoginModal";
import { SecurityPasswordReminderCard } from "./components/SecurityPasswordReminderCard";
import { SecurityPinService } from "./services/securityPinService";
import {
  saveProfileToFirestore,
  saveHistoryItemToFirestore,
  syncHistoryWithFirestore,
  createSharedContent,
  getSharedContent,
  saveQuizScoreToLeaderboard,
  deleteHistoryItemFromFirestore,
} from "./utils/firebaseUtils";
import Logo from "./components/Logo";
import { GeminiService } from "./services/geminiService";
import { SettingsService } from "./services/settingsService";
import { SEOService } from "./services/seoService";
import { db, auth } from "./firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { StudyGroup } from "./types";
import { getCurrentUserProfile, getMembershipByEmail } from "./utils/userService";
import { onAuthStateChanged, signOut, isSignInWithEmailLink, signInWithEmailLink, } from "firebase/auth";
import type { User } from "firebase/auth";
import {
  FileText,
  BrainCircuit,
  MessageCircle,
  Sparkles,
  AlertCircle,
  Menu,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  ArrowLeft,
  Calendar,
  LogOut,
  Crown,
  Plus,
  Clock,
  Settings,
  Share2,
  CreditCard,
  QrCode,
  Users,
  Eye,
  BookOpen,
  User as UserIcon,
  Bell,
  Copy,
  Sun,
  Moon,
  Search,
  X,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GenerateContentResponse } from "@google/genai";

const sanitizeSlug = (str: string) => str ? str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : "general";

const THEME_COLORS: Record<string, Record<string, string>> = {
  Gold: {
    50: "#FFFAF0",
    100: "#FDF5E6",
    200: "#FEEBC8",
    300: "#FBD38D",
    400: "#F6AD55",
    500: "#D4AF37",
    600: "#B7950B",
    700: "#975A16",
    800: "#744210",
    900: "#742A2A",
  },
  Blue: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },
  Emerald: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
  },
  Violet: {
    50: "#f5f3ff",
    100: "#ede9fe",
    200: "#ddd6fe",
    300: "#c4b5fd",
    400: "#a78bfa",
    500: "#8b5cf6",
    600: "#7c3aed",
    700: "#6d28d9",
    800: "#5b21b6",
    900: "#4c1d95",
  },
  Rose: {
    50: "#fff1f2",
    100: "#ffe4e6",
    200: "#fecdd3",
    300: "#fda4af",
    400: "#fb7185",
    500: "#f43f5e",
    600: "#e11d48",
    700: "#be123c",
    800: "#9f1239",
    900: "#881337",
  },
};

const App: React.FC = () => {
  // Notifications
  const { unreadCount, requestPermission, sendNotification, triggerToast } = useNotifications();
  const sendNotificationRef = useRef(sendNotification);
  useEffect(() => {
    sendNotificationRef.current = sendNotification;
  }, [sendNotification]);

  const { recordActivity } = useStreak();

  // Video & Audio Calling States (1-on-1 & Group)
  const [activeDirectCall, setActiveDirectCall] = useState<DirectCall | null>(null);
  const [incomingDirectCall, setIncomingDirectCall] = useState<DirectCall | null>(null);
  const [activeGroupCall, setActiveGroupCall] = useState<GroupCall | null>(null);

  const [pendingGroupInvite, setPendingGroupInvite] = useState<{ groupId: string; inviterName: string; groupName: string } | null>(null);

  const handleNavigateToGroupInvite = (groupId: string, inviterName: string, groupName: string) => {
    setPendingGroupInvite({ groupId, inviterName, groupName });
    setMode(AppMode.GROUP_INVITE);
  };

  // Process group invite link parameters from URL (e.g. ?groupId=xxx or ?groupInvite=xxx or ?invite=xxx)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const groupIdFromUrl = params.get("groupId") || params.get("groupInvite") || params.get("invite");
    const inviterFromUrl = params.get("inviter") || "A student";

    if (groupIdFromUrl) {
      const checkAndRouteGroupInvite = async () => {
        try {
          const groupRef = doc(db, "groups", groupIdFromUrl);
          const groupSnap = await getDoc(groupRef);
          
          if (groupSnap.exists()) {
            const groupData = groupSnap.data() as StudyGroup;
            const currentUid = auth.currentUser ? auth.currentUser.uid : null;
            const isMember = currentUid && groupData.members && !!groupData.members[currentUid];

            if (isMember) {
              // Already a member -> redirect directly to group chat
              localStorage.setItem('sjtutor_active_group_id', groupIdFromUrl);
              setMode(AppMode.GROUPS);
              triggerToast('Welcome Back! 🎉', `Opened "${groupData.name}" group chat.`, 'Important Alerts');
            } else {
              // Not a member yet -> open group invite view with Accept/Decline buttons
              setPendingGroupInvite({
                groupId: groupIdFromUrl,
                inviterName: inviterFromUrl,
                groupName: groupData.name,
              });
              setMode(AppMode.GROUP_INVITE);
            }
          } else {
            triggerToast('Invalid Group Link', 'The group in this link was not found or has been deleted.', 'Important Alerts');
          }
        } catch (err) {
          console.error("Error processing group invite link:", err);
        } finally {
          // Clean search params from URL so refresh doesn't re-trigger
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };

      checkAndRouteGroupInvite();
    }
  }, []);

  // Request notification permission on first visit
  useEffect(() => {
    const hasRequested = localStorage.getItem("has_requested_notif_permission");
    if (!hasRequested) {
      setTimeout(() => {
        requestPermission().then(() => {
          localStorage.setItem("has_requested_notif_permission", "true");
        });
      }, 3000);
    }
  }, [requestPermission]);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  const openAuthModal = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showCompletionReminder, setShowCompletionReminder] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [loggedInDevices, setLoggedInDevices] = useState<DeviceSession[]>([]);
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [isTwoStepVerified, setIsTwoStepVerified] = useState<boolean>(true);
  const [isPinSessionUnlocked, setIsPinSessionUnlocked] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<any>('account');
  const [settingsOpenPinTab, setSettingsOpenPinTab] = useState<'twostep' | 'pin' | undefined>(undefined);
  const [dismissed2faReminder, setDismissed2faReminder] = useState<boolean>(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(() => {
    return localStorage.getItem("hasSeenTutorial") === "true";
  });

  const navigateToPrivacySettings = (openTwoStepModal = false) => {
    setSettingsInitialTab('privacy');
    setSettingsOpenPinTab(openTwoStepModal ? 'twostep' : undefined);
    setMode(AppMode.SETTINGS);
  };

  // App State
  const [publicShareId, setPublicShareId] = useState<string | null>(() => {
    const path = window.location.pathname;
    
    // 9. Error Logging: Detecting path on load
    console.log("[SHARE AUDIT] Detecting public share path on initial load:", path);
    
    if (path.startsWith("/share/")) {
      const shareId = path.substring(7).replace(/\/$/, "");
      console.log("[SHARE AUDIT] Match /share/ style ID:", shareId);
      return shareId;
    }
    
    // Support type-specific custom URLs (Requirement 2)
    const prefixes = ["/quiz/", "/summary/", "/notes/", "/homework/", "/tutor/"];
    for (const prefix of prefixes) {
      if (path.startsWith(prefix)) {
        const segments = path.substring(prefix.length).split('/').filter(Boolean);
        if (segments.length === 1) {
          console.log(`[SHARE AUDIT] Match single segment share ID under ${prefix}:`, segments[0]);
          return segments[0]; // e.g. /quiz/{quizId} -> {quizId}
        } else if (segments.length > 1) {
          // Structured quiz slug fallback
          const prefixName = prefix.substring(1, prefix.length - 1);
          const slug = `${prefixName}_${segments.join("_")}`;
          console.log(`[SHARE AUDIT] Match multi-segment slug under ${prefix}:`, slug);
          return slug;
        }
      }
    }
    
    const params = new URLSearchParams(window.location.search);
    const queryShare = params.get("share");
    if (queryShare) {
      console.log("[SHARE AUDIT] Match query-param share ID:", queryShare);
      return queryShare;
    }
    return null;
  });

  const [shareSuccessModal, setShareSuccessModal] = useState<{
    isOpen: boolean;
    shareId: string;
    title: string;
    type: string;
    customUrl?: string;
  } | null>(null);

  const [quizNotFoundError, setQuizNotFoundError] = useState(false);

  const [mode, setMode] = useState<AppMode>(() => {
    try {
      const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
      if (path === '/privacy') return AppMode.PRIVACY;
      if (path === '/terms') return AppMode.TERMS;
      if (path === '/about') return AppMode.ABOUT;
      return (localStorage.getItem('sjtutor_autosave_mode') as AppMode) || AppMode.DASHBOARD;
    } catch {
      return AppMode.DASHBOARD;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sjtutor_autosave_mode', mode);
    } catch (e) {
      console.warn("Could not save mode", e);
    }
  }, [mode]);

  // Route & Hash Popstate Listener
  useEffect(() => {
    const handleNavigationChange = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
      if (path === '/privacy') setMode(AppMode.PRIVACY);
      else if (path === '/terms') setMode(AppMode.TERMS);
      else if (path === '/about') setMode(AppMode.ABOUT);
    };

    window.addEventListener('popstate', handleNavigationChange);
    window.addEventListener('hashchange', handleNavigationChange);
    return () => {
      window.removeEventListener('popstate', handleNavigationChange);
      window.removeEventListener('hashchange', handleNavigationChange);
    };
  }, []);

  // Initialize form data with auto-saved local copies or fallback language from settings
  const [formData, setFormData] = useState<StudyRequestData>(() => {
    try {
      const saved = localStorage.getItem('sjtutor_autosave_form_data');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Could not load autosaved form data", e);
    }
    const settings = SettingsService.getSettings();
    return {
      ...INITIAL_FORM_DATA,
      language: settings.learning.language || INITIAL_FORM_DATA.language,
    };
  });

  // Auto-save form data to localStorage as the user types
  useEffect(() => {
    try {
      localStorage.setItem('sjtutor_autosave_form_data', JSON.stringify(formData));
    } catch (e) {
      console.warn("Could not autosave form data", e);
    }
  }, [formData]);

  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('sjtutor_sidebar_open');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch (e) {
      console.warn("Could not read sidebar open state", e);
    }
    return window.innerWidth >= 1024;
  });

  const isExpanded = isSidebarOpen || isSidebarHovered;

  useEffect(() => {
    try {
      localStorage.setItem('sjtutor_sidebar_open', String(isSidebarOpen));
    } catch (e) {
      console.warn("Could not write sidebar open state", e);
    }
  }, [isSidebarOpen]);
  const [showSplash, setShowSplash] = useState(true);
  const [historySearchQuery, setHistorySearchQuery] = useState("");

  // Profile State
  const initialProfileState: UserProfile = {
    displayName: "",
    phoneNumber: "",
    institution: "",
    grade: "",
    bio: "",
    photoURL: "",
    learningGoal: "",
    learningStyle: "Visual",
    credits: 100,
    planType: "Free",
    dob: "",
    registrationNumber: "",
  };
  const [userProfile, setUserProfile] =
    useState<UserProfile>(initialProfileState);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoadedUid, setHistoryLoadedUid] = useState<string>("none");
  const [dashboardView, setDashboardView] = useState<AppMode | "OVERVIEW">(
    "OVERVIEW",
  );
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [sharedContent, setSharedContent] = useState<any | null>(null);
  const [isViewingShared, setIsViewingShared] = useState(false);
  const [isAddedSharedContent, setIsAddedSharedContent] = useState(false);

  // Content States
  const [summaryContent, setSummaryContent] = useState(() => {
    try {
      return localStorage.getItem('sjtutor_autosave_summary') || "";
    } catch { return ""; }
  });
  const [homeworkContent, setHomeworkContent] = useState(() => {
    try {
      return localStorage.getItem('sjtutor_autosave_homework') || "";
    } catch { return ""; }
  });
  const [homeworkFiles, setHomeworkFiles] = useState<HomeworkFile[]>([]);
  const [quizData, setQuizData] = useState<QuizQuestion[] | null>(() => {
    try {
      const saved = localStorage.getItem('sjtutor_autosave_quiz');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [existingQuizScore, setExistingQuizScore] = useState<
    number | undefined
  >(() => {
    try {
      const saved = localStorage.getItem('sjtutor_autosave_quiz_score');
      return saved ? parseInt(saved) : undefined;
    } catch { return undefined; }
  });

  // Save active outputs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sjtutor_autosave_summary', summaryContent);
      localStorage.setItem('sjtutor_autosave_homework', homeworkContent);
      if (quizData) {
        localStorage.setItem('sjtutor_autosave_quiz', JSON.stringify(quizData));
      } else {
        localStorage.removeItem('sjtutor_autosave_quiz');
      }
      if (existingQuizScore !== undefined) {
        localStorage.setItem('sjtutor_autosave_quiz_score', existingQuizScore.toString());
      } else {
        localStorage.removeItem('sjtutor_autosave_quiz_score');
      }
    } catch (e) {
      console.warn("Could not autosave active outputs", e);
    }
  }, [summaryContent, homeworkContent, quizData, existingQuizScore]);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  useEffect(() => {
    // Basic detection for India
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (
      tz.includes("Kolkata") ||
      tz.includes("Calcutta") ||
      tz.includes("India")
    ) {
      setDetectedCountry("IN");
    }
  }, []);

  // Dynamic SEO & Metadata Synchronization
  useEffect(() => {
    if (publicShareId && sharedContent) {
      SEOService.updateSEO({
        title: `${sharedContent.title || 'Shared Practice Quiz'} | SJ Tutor AI`,
        description: sharedContent.description || `Study, test, and practice ${sharedContent.title || 'interactive learning challenges'} on SJ Tutor AI.`,
        canonicalPath: sharedContent.customUrl || `/share/${publicShareId}`,
        ogType: 'article',
      });
      return;
    }

    if (!user && mode === AppMode.DASHBOARD) {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#about') {
        SEOService.updateSEO(SEOService.getPresetForRoute('/about'));
      } else if (hash === '#how' || hash === '#features') {
        SEOService.updateSEO(SEOService.getPresetForRoute('/features'));
      } else if (hash === '#contact') {
        SEOService.updateSEO(SEOService.getPresetForRoute('/contact'));
      } else {
        SEOService.updateSEO(SEOService.getPresetForRoute('/'));
      }
      return;
    }

    switch (mode) {
      case AppMode.PRIVACY:
        SEOService.updateSEO(SEOService.getPresetForRoute('/privacy'));
        break;
      case AppMode.TERMS:
        SEOService.updateSEO(SEOService.getPresetForRoute('/terms'));
        break;
      case AppMode.ABOUT:
        SEOService.updateSEO(SEOService.getPresetForRoute('/about'));
        break;
      case AppMode.TUTOR:
        SEOService.updateSEO(SEOService.getPresetForRoute('/tutor'));
        break;
      case AppMode.QUIZ:
        SEOService.updateSEO(SEOService.getPresetForRoute('/quiz'));
        break;
      case AppMode.SUMMARY:
        SEOService.updateSEO(SEOService.getPresetForRoute('/summary'));
        break;
      case AppMode.HOMEWORK:
        SEOService.updateSEO(SEOService.getPresetForRoute('/homework'));
        break;
      case AppMode.NOTES:
        SEOService.updateSEO(SEOService.getPresetForRoute('/notes'));
        break;
      case AppMode.TIMER:
        SEOService.updateSEO(SEOService.getPresetForRoute('/timer'));
        break;
      case AppMode.GROUPS:
        SEOService.updateSEO(SEOService.getPresetForRoute('/groups'));
        break;
      case AppMode.PROFILE:
        SEOService.updateSEO({
          title: 'Student Profile & Goals | SJ Tutor AI',
          description: 'View your student profile, academic grades, badges, and learning goals in SJ Tutor AI.',
          canonicalPath: '/profile',
          noindex: true,
        });
        break;
      case AppMode.ID_CARD:
        SEOService.updateSEO({
          title: 'Digital Student ID Card | SJ Tutor AI',
          description: 'Access and export your verified digital student ID card with SJ Tutor AI.',
          canonicalPath: '/id-card',
          noindex: true,
        });
        break;
      case AppMode.SETTINGS:
        SEOService.updateSEO({
          title: 'Settings & Preferences | SJ Tutor AI',
          description: 'Manage your AI Tutor preferences, language, appearance, notifications, and study configurations.',
          canonicalPath: '/settings',
          noindex: true,
        });
        break;
      case AppMode.NOTIFICATIONS:
        SEOService.updateSEO({
          title: 'Notifications & Alerts | SJ Tutor AI',
          description: 'View study group invites, streak updates, and practice alerts.',
          canonicalPath: '/notifications',
          noindex: true,
        });
        break;
      case AppMode.DASHBOARD:
      default:
        SEOService.updateSEO(SEOService.getPresetForRoute(user ? '/dashboard' : '/'));
        break;
    }
  }, [mode, user, publicShareId, sharedContent]);

  // Helper for navigation with form pre-fill
  const navigateToMode = (newMode: AppMode) => {
    setMode(newMode);
    setDashboardView("OVERVIEW");
    setSummaryContent("");
    setHomeworkContent("");
    setHomeworkFiles([]);
    setQuizData(null);
    setExistingQuizScore(undefined);
    if (newMode !== AppMode.TUTOR) {
      setCurrentHistoryId(null);
    } else if (!currentHistoryId) {
      const recentTutor = history.find((h) => h.type === AppMode.TUTOR);
      if (recentTutor) {
        setCurrentHistoryId(recentTutor.id);
      }
    }
    setError(null);

    // Reset form with profile defaults
    const settings = SettingsService.getSettings();
    setFormData({
      ...INITIAL_FORM_DATA,
      language: settings.learning.language || INITIAL_FORM_DATA.language,
      gradeClass: userProfile.grade || INITIAL_FORM_DATA.gradeClass,
      board: userProfile.board || INITIAL_FORM_DATA.board || "",
    });
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in form input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMod = e.ctrlKey || e.metaKey;

      if (isMod) {
        const key = e.key.toLowerCase();

        if (e.shiftKey && key === 'a') {
          e.preventDefault();
          setShowAboutModal(true);
          triggerToast('About SJ Tutor AI', 'Opened Creators & Innovators showcase modal.', 'Important Alerts');
          return;
        }

        switch (key) {
          case 's':
            e.preventDefault();
            navigateToMode(AppMode.SUMMARY);
            triggerToast('Instant Summary Mode', 'Navigated via Ctrl+S shortcut.', 'Important Alerts');
            break;
          case 'q':
            e.preventDefault();
            navigateToMode(AppMode.QUIZ);
            triggerToast('Quiz Creator Mode', 'Navigated via Ctrl+Q shortcut.', 'Quiz Updates');
            break;
          case 'h':
            e.preventDefault();
            navigateToMode(AppMode.HOMEWORK);
            triggerToast('Homework Solver Mode', 'Navigated via Ctrl+H shortcut.', 'Important Alerts');
            break;
          case 't':
            e.preventDefault();
            navigateToMode(AppMode.TUTOR);
            triggerToast('AI Tutor Sessions Mode', 'Navigated via Ctrl+T shortcut.', 'Important Alerts');
            break;
          case 'g':
            e.preventDefault();
            navigateToMode(AppMode.GROUPS);
            triggerToast('Study Groups Mode', 'Navigated via Ctrl+G shortcut.', 'Important Alerts');
            break;
          case 'n':
            e.preventDefault();
            navigateToMode(AppMode.NOTES);
            triggerToast('Notes & Schedule Mode', 'Navigated via Ctrl+N shortcut.', 'Important Alerts');
            break;
          case 'd':
            e.preventDefault();
            setMode(AppMode.DASHBOARD);
            setDashboardView('OVERVIEW');
            triggerToast('Dashboard Overview', 'Returned to Dashboard via Ctrl+D shortcut.', 'Important Alerts');
            break;
          case 'k':
            e.preventDefault();
            setShowShortcutsModal(prev => !prev);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Notification Timer Ref
  const lastNotificationCheck = useRef(Date.now());

  // Notification Service
  useEffect(() => {
    // Request permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const lastCheck = lastNotificationCheck.current;
      const key = user ? `reminders_${user.uid}` : "reminders_guest";

      try {
        const storedReminders = localStorage.getItem(key);
        if (storedReminders) {
          const items = JSON.parse(storedReminders);

          items.forEach((item: any) => {
            if (!item.completed && item.dueTime) {
              const dueTime = new Date(item.dueTime).getTime();
              // Check if the due time fell within the last check interval window
              if (dueTime > lastCheck && dueTime <= now) {
                if (Notification.permission === "granted") {
                  new Notification("SJ Tutor AI Reminder", {
                    body: item.task,
                    icon: SJTUTOR_AVATAR,
                  });
                } else if (Notification.permission !== "denied") {
                  Notification.requestPermission().then((permission) => {
                    if (permission === "granted") {
                      new Notification("SJ Tutor AI Reminder", {
                        body: item.task,
                        icon: SJTUTOR_AVATAR,
                      });
                    }
                  });
                }
              }
            }
          });
        }
      } catch (e) {
        console.error("Error checking reminders", e);
      }

      lastNotificationCheck.current = now;
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [user]);

  // Notified call IDs tracker to prevent duplicate system notification triggers
  const alertedIncomingCallIdRef = useRef<string | null>(null);

  // Subscribe to real-time incoming 1-on-1 calls for current user
  useEffect(() => {
    if (!user || !user.uid) {
      if (alertedIncomingCallIdRef.current) {
        NotificationService.dismissCallNotification(alertedIncomingCallIdRef.current);
      }
      setIncomingDirectCall(null);
      alertedIncomingCallIdRef.current = null;
      return;
    }

    const unsub = subscribeToIncomingCalls(user.uid, (call) => {
      // If ringing incoming call directed to this receiver and user is not in an active direct call
      if (call && call.callerId !== user.uid && call.receiverId === user.uid && (!activeDirectCall || activeDirectCall.id === call.id)) {
        setIncomingDirectCall(call);

        // Deliver native device system notification & vibration on call arrival (Incoming only)
        if (call.id !== alertedIncomingCallIdRef.current) {
          alertedIncomingCallIdRef.current = call.id;

          // Dispatch native phone/WhatsApp style notification with Accept & Decline buttons
          NotificationService.showIncomingCallNotification(call, user.uid);

          if ("vibrate" in navigator) {
            try {
              navigator.vibrate([500, 250, 500, 250, 500, 250, 1000]);
            } catch (err) {
              console.warn("Vibration notice:", err);
            }
          }
        }
      } else {
        if (alertedIncomingCallIdRef.current) {
          NotificationService.dismissCallNotification(alertedIncomingCallIdRef.current);
        }
        setIncomingDirectCall(null);
        alertedIncomingCallIdRef.current = null;
      }
    });

    return () => unsub();
  }, [user?.uid, activeDirectCall]);

  // Handle incoming call actions from Service Worker buttons or deep link URLs
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (!event.data) return;

      if (event.data.type === "ACCEPT_CALL_ACTION" && event.data.callId) {
        const targetCallId = event.data.callId;
        if (incomingDirectCall && incomingDirectCall.id === targetCallId) {
          setActiveDirectCall(incomingDirectCall);
          setIncomingDirectCall(null);
          NotificationService.dismissCallNotification(targetCallId);
        }
      } else if (event.data.type === "DECLINE_CALL_ACTION" && event.data.callId) {
        const targetCallId = event.data.callId;
        declineDirectCall(targetCallId);
        if (incomingDirectCall?.id === targetCallId) {
          setIncomingDirectCall(null);
        }
        NotificationService.dismissCallNotification(targetCallId);
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    }

    // Check URL parameters for call actions (e.g., when launched by clicking an accept/decline action)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const action = urlParams.get("action");
      const callId = urlParams.get("callId");

      if (action === "accept_call" && callId) {
        if (incomingDirectCall && incomingDirectCall.id === callId) {
          setActiveDirectCall(incomingDirectCall);
          setIncomingDirectCall(null);
          NotificationService.dismissCallNotification(callId);
        } else {
          // Cold-start fallback: Fetch directly from Firestore doc
          getDoc(doc(db, "calls", callId)).then((callSnap) => {
            if (callSnap.exists()) {
              const data = callSnap.data() as DirectCall;
              if (data.status === "ringing" || data.status === "connected") {
                setActiveDirectCall(data);
                setIncomingDirectCall(null);
                NotificationService.dismissCallNotification(callId);
              }
            }
          }).catch((err) => {
            console.warn("Failed to load cold-start call doc:", err);
          });
        }
        // Clean URL search query
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (action === "decline_call" && callId) {
        declineDirectCall(callId);
        NotificationService.dismissCallNotification(callId);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.warn("Error processing call query parameter:", e);
    }

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
      }
    };
  }, [incomingDirectCall]);

  // Check for shared content on load
  useEffect(() => {
    const shareId = publicShareId;

    if (shareId) {
      const fetchShared = async () => {
        setAuthLoading(true);
        setIsAddedSharedContent(false);
        try {
          // 1. Try loading directly from Firestore first (primary ground truth)
          console.log("[SHARE AUDIT] Fetching shared content with ID:", shareId);
          let item = await getSharedContent(shareId);
          console.log("[SHARE AUDIT] Firestore fetch status:", item ? "Success" : "Not found in Firestore, attempting API fallback");
          
          // 2. Fallback to server API if not found in Firestore
          if (!item) {
            try {
              console.log("[SHARE AUDIT] Calling API route fallback /api/auth/share/" + shareId);
              const response = await fetch(`/api/auth/share/${shareId}`);
              const data = await response.json();
              if (response.ok && data.success) {
                item = data.data;
                console.log("[SHARE AUDIT] API route fallback Success:", item);
              } else {
                console.warn("[SHARE AUDIT] API route fallback returned failure:", data);
              }
            } catch (apiErr) {
              console.error("[SHARE AUDIT] Shared API route fallback failed:", apiErr);
            }
          }

          if (item) {
            setSharedContent(item);
            setIsViewingShared(true);

            // Load the content into the view
            if (item.type === AppMode.SUMMARY || item.type === "Summary") {
              setSummaryContent(item.content);
              setMode(AppMode.SUMMARY);
            } else if (item.type === AppMode.ESSAY || item.type === "Essay" || item.type === AppMode.HOMEWORK || item.type === "Homework Solution" || item.type === "Homework Solver") {
              setHomeworkContent(item.content);
              setMode(AppMode.HOMEWORK);
            } else if (item.type === AppMode.QUIZ || item.type === "Interactive Quiz" || item.type === "Quiz Creator") {
              setQuizData(item.content);
              setMode(AppMode.QUIZ);
            }
            // Update form data for context
            setFormData((prev) => ({
              ...prev,
              chapterName: item.title,
              subject: item.subtitle?.split(" • ")[1] || "",
              gradeClass: item.subtitle?.split(" • ")[0] || "",
            }));
          } else {
            console.error("Shared content not found or expired.");
            if (shareId.startsWith("quiz_")) {
              setQuizNotFoundError(true);
            }
          }
        } catch (err) {
          console.error("Failed to fetch shared content", err);
          if (shareId.startsWith("quiz_")) {
            setQuizNotFoundError(true);
          }
        } finally {
          setAuthLoading(false);
          // Clear any path or search parameters to reset URL back to base without refreshing the page
          if (window.location.pathname !== "/" || window.location.search) {
            window.history.replaceState({}, document.title, "/");
          }
        }
      };
      fetchShared();
    }
  }, [publicShareId, setSummaryContent, setHomeworkContent, setQuizData, setMode, setFormData]);

  // Sync formData language with settings whenever settings change
  useEffect(() => {
    const syncLanguage = () => {
      const settings = SettingsService.getSettings();
      setFormData((prev) => ({
        ...prev,
        language: settings.learning.language || prev.language,
      }));
    };

    syncLanguage();
    window.addEventListener("settings-changed", syncLanguage);
    return () => window.removeEventListener("settings-changed", syncLanguage);
  }, []);

  const handleThemeToggle = () => {
    const settings = SettingsService.getSettings();
    const currentTheme = settings.appearance.theme;
    let nextTheme: "Light" | "Dark" | "System" = "Dark";
    
    if (currentTheme === "Light" || (currentTheme === "System" && !window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      nextTheme = "Dark";
    } else {
      nextTheme = "Light";
    }

    SettingsService.updateSettings({
      appearance: {
        ...settings.appearance,
        theme: nextTheme
      }
    });
  };

  // Theme Management
  useEffect(() => {
    const applyTheme = () => {
      const settings = SettingsService.getSettings();
      const theme = settings.appearance.theme;
      const primaryColorName = settings.appearance.primaryColor || "Gold";
      const fontFamily = settings.appearance.fontFamily || "Inter";
      const animationsEnabled = settings.appearance.animations;

      const root = window.document.documentElement;
      const body = window.document.body;

      const isDark =
        theme === "Dark" ||
        (theme === "System" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      const palette = THEME_COLORS[primaryColorName] || THEME_COLORS["Gold"];
      Object.entries(palette).forEach(([shade, value]) => {
        root.style.setProperty(`--color-primary-${shade}`, value);
      });

      const formattedFont = fontFamily.includes(" ")
        ? `'${fontFamily}'`
        : fontFamily;
      root.style.setProperty("--font-sans", formattedFont);

      if (animationsEnabled) {
        body.classList.remove("reduce-motion");
      } else {
        body.classList.add("reduce-motion");
      }
    };

    applyTheme();
    window.addEventListener("settings-changed", applyTheme);
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      if (SettingsService.getSettings().appearance.theme === "System")
        applyTheme();
    };
    mediaQuery.addEventListener("change", handleSystemChange);

    return () => {
      window.removeEventListener("settings-changed", applyTheme);
      mediaQuery.removeEventListener("change", handleSystemChange);
    };
  }, []);

  // Check API Key
  useEffect(() => {
    if (!process.env.API_KEY) {
      console.warn("API_KEY is missing in environment variables!");
    }
  }, []);

  // Auto-fill grade from profile when switching modes
  useEffect(() => {
    if (
      mode === AppMode.SUMMARY ||
      mode === AppMode.QUIZ ||
      mode === AppMode.HOMEWORK
    ) {
      if (
        userProfile.grade &&
        (!formData.gradeClass ||
          formData.gradeClass === INITIAL_FORM_DATA.gradeClass)
      ) {
        setFormData((prev) => ({ ...prev, gradeClass: userProfile.grade }));
      }
    }
  }, [mode, userProfile.grade]);

  // Magic Link Login Processor
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      setAuthLoading(true);
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(async (result) => {
            window.localStorage.removeItem('emailForSignIn');
            if (result.user?.uid) {
              SecurityPinService.clearTwoStepVerified(result.user.uid);
              SecurityPinService.lockSession(result.user.uid);
            }
            const additionalUserInfo = getAdditionalUserInfo(result);
            if (additionalUserInfo?.isNewUser) {
               const storedDisplayName = window.localStorage.getItem('displayNameForSignIn') || '';
               window.localStorage.removeItem('displayNameForSignIn');
               handleSignUpSuccess({ displayName: storedDisplayName });
            }
            // Clear URL of auth parameters
            window.history.replaceState({}, document.title, window.location.pathname);
          })
          .catch((error) => {
            console.error('Error signing in with email link', error);
            triggerToast("Sign-In Error 🚫", "This sign-in link has expired or has already been used. Please request a new sign-in link.", "Important Alerts");
          })
          .finally(() => {
             setAuthLoading(false);
          });
      } else {
        setAuthLoading(false);
      }
    }
  }, []);

  // Auth Listener
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (authLoading) {
        console.warn("Auth check timed out, defaulting to guest.");
        setAuthLoading(false);
      }
    }, 4000);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        clearTimeout(timeoutId);
        if (currentUser) {

           setUser(currentUser);
           try {
             const userProf = await getCurrentUserProfile(currentUser);
             const isRegisteredInDb = userProf.isRegisteredInFirestore || userProf.hasCompletedOnboarding;
             setUserProfile({
               ...initialProfileState,
               ...userProf,
               hasCompletedOnboarding: isRegisteredInDb ? true : userProf.hasCompletedOnboarding,
             } as any);

             if (userProf.language) {
               SettingsService.updateSettings({
                 learning: {
                   ...SettingsService.getSettings().learning,
                   language: userProf.language,
                 }
               });
               setFormData((prev) => ({
                 ...prev,
                 language: userProf.language || prev.language,
               }));
             }

             if (isRegisteredInDb) {
               // User is already registered in Firestore - navigate to dashboard, hide welcome & profile prompts
               setMode(AppMode.DASHBOARD);
               setShowCompletionReminder(false);
               setShowTutorial(false);
             } else if (!userProf.hasCompletedOnboarding) {
               setMode(AppMode.PROFILE);
             } else {
               setMode(AppMode.DASHBOARD);
             }
           } catch (e) {
             console.error("Error fetching/creating profile:", e);
           }
        } else {
          // Check if there is an active ID Card / Registration session
          const activeIdUid = localStorage.getItem('sjtutor_active_id_session');
          if (activeIdUid) {
            const cachedProfileRaw = localStorage.getItem(`profile_${activeIdUid}`);
            if (cachedProfileRaw) {
              try {
                const cachedProfile = JSON.parse(cachedProfileRaw);
                const mockUser: any = {
                  uid: activeIdUid,
                  displayName: cachedProfile.displayName || 'Scholar Member',
                  email: cachedProfile.email || `${activeIdUid}@sjtutor.ai`,
                  photoURL: cachedProfile.photoURL || '',
                };
                setUser(mockUser);
                setUserProfile(cachedProfile);
                setMode(AppMode.DASHBOARD);
                setAuthLoading(false);
                return;
              } catch {
                // Ignore parse error
              }
            }
          }

          setUser(null);
          setUserProfile(initialProfileState);
          setMode(AppMode.DASHBOARD);
        }
        setAuthLoading(false);
      },
      (err) => {
        console.error("Auth Error:", err);
        setAuthLoading(false);
        clearTimeout(timeoutId);
      },
    );

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // Real-time Active Devices & Session Revocation Synchronization
  useEffect(() => {
    if (!user) {
      setLoggedInDevices([]);
      return;
    }

    // 1. Register current device session
    DeviceService.registerCurrentDevice(user.uid);

    // 2. Subscribe to all active logged-in devices in real-time
    const unsubscribeDevices = DeviceService.subscribeToUserDevices(user.uid, (devicesList) => {
      setLoggedInDevices(devicesList);
    });

    // 3. Listen if this current device gets remotely logged out/revoked
    const unsubscribeRevocation = DeviceService.listenForRevocation(user.uid, async () => {
      triggerToast(
        "Session Terminated 🔒",
        "This device was logged out remotely from another device. You can log back in at any time.",
        "Important Alerts"
      );
      if (user?.uid) {
        SecurityPinService.clearTwoStepVerified(user.uid);
        SecurityPinService.lockSession(user.uid);
      }
      DeviceService.cleanupLocalDeviceState();
      try {
        await signOut(auth);
      } catch (err) {
        console.warn("Sign-out on revocation warning:", err);
      }
      setIsTwoStepVerified(true);
      setIsPinSessionUnlocked(true);
      setMode(AppMode.DASHBOARD);
      setDashboardView("OVERVIEW");
    });

    return () => {
      unsubscribeDevices();
      unsubscribeRevocation();
      DeviceService.stopHeartbeat();
    };
  }, [user?.uid]);

  // Sync hasSeenTutorial state with localStorage
  useEffect(() => {
    const saved = localStorage.getItem("hasSeenTutorial") === "true";
    if (saved !== hasSeenTutorial) {
      setHasSeenTutorial(saved);
    }
  }, []);

  // Profile Persistence
  useEffect(() => {
    if (user) {
      // Check if 30 days have passed since last tutorial
      const lastShownKey = `tutorial_last_shown_${user.uid}`;
      const lastShown = localStorage.getItem(lastShownKey);
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      if (!lastShown || now - parseInt(lastShown) > thirtyDaysMs) {
        if (!userProfile.isRegisteredInFirestore && !userProfile.hasCompletedOnboarding) {
          setShowTutorial(true);
        }
        localStorage.setItem(lastShownKey, now.toString());
      }

      // SPEED OPTIMIZATION: Load locally stored profile from LocalStorage IMMEDIATELY
      const savedProfile = localStorage.getItem(`profile_${user.uid}`);
      let cached: any = null;
      if (savedProfile) {
        try {
          cached = JSON.parse(savedProfile);
        } catch {
          // Ignore parse errors
        }
      }

      const membership = getMembershipByEmail(user.email);
      const initialProfile = {
        ...initialProfileState,
        credits: membership ? membership.credits : 100,
        planType: membership ? membership.planType : "Free",
        ...cached,
        ...(membership ? { planType: membership.planType, credits: membership.credits, hasCompletedOnboarding: true } : {}),
        displayName: (cached && cached.displayName) || user.displayName || "",
        photoURL: (cached && cached.photoURL) || user.photoURL || "",
      };

      // Set user profile instantly to avoid blocking or lagging perceived speed!
      setUserProfile((prev) => ({
        ...initialProfile,
        isRegisteredInFirestore: prev.isRegisteredInFirestore || cached?.isRegisteredInFirestore,
        hasCompletedOnboarding: !!membership || prev.hasCompletedOnboarding || cached?.hasCompletedOnboarding,
      }));

      // Check profile completion to trigger alerts/notifications (skip for users registered in Firestore)
      const isRegisteredInDb = userProfile.isRegisteredInFirestore || cached?.isRegisteredInFirestore || userProfile.hasCompletedOnboarding;
      const cachedCompletion = calculateProfileCompletion(initialProfile);
      const isDismissedPrompt = localStorage.getItem(`profile_reminder_dismissed_${user.uid}`) === "true";

      if (!isRegisteredInDb && cachedCompletion < 100 && !isDismissedPrompt) {
        setTimeout(() => {
          setShowCompletionReminder(true);
        }, 2000);

        const profileNotifKey = `profile_notif_sent_${user.uid}`;
        const lastSentProfileNotif = localStorage.getItem(profileNotifKey);
        const oneHourMs = 60 * 60 * 1000;
        if (!lastSentProfileNotif || now - parseInt(lastSentProfileNotif) > oneHourMs) {
          sendNotificationRef.current(
            "Profile Incomplete 📋",
            "Complete your learning profile details to unlock personalized recommendations, custom study tools, and claim 10 bonus credits!",
            "Important Alerts",
            user.uid
          ).catch((e) => console.warn("Failed to send profile incomplete notification:", e));
          localStorage.setItem(profileNotifKey, now.toString());
        }
      } else {
        setShowCompletionReminder(false);
      }

      // Check if 2-Step Verification password is not kept, and send a security reminder notification
      const hasTwoStep = !!userProfile.twoFactorPassword || !!userProfile.twoFactorEnabled;
      if (!hasTwoStep) {
        const twoStepNotifKey = `twostep_reminder_notif_${user.uid}`;
        const lastSentTwoStepNotif = localStorage.getItem(twoStepNotifKey);
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (!lastSentTwoStepNotif || now - parseInt(lastSentTwoStepNotif) > oneDayMs) {
          sendNotificationRef.current(
            "Account Security Notice 🛡️",
            "You haven't set a 2-Step Verification password yet. Protect your account from unauthorized logins across all devices in Settings > Privacy & Security.",
            "Important Alerts",
            user.uid
          ).catch((e) => console.warn("Failed to send 2-step reminder notification:", e));
          localStorage.setItem(twoStepNotifKey, now.toString());
        }
      }
    }
  }, [user]);

  // Two-Step Verification (on Login) & PIN Lock (on Refresh/Visit) Check
  useEffect(() => {
    if (!user) {
      setIsTwoStepVerified(true);
      setIsPinSessionUnlocked(true);
      return;
    }

    // 1. Two-Step Verification on Login Check
    const alreadyTwoStepVerified = SecurityPinService.isTwoStepVerified(user.uid);
    setIsTwoStepVerified(alreadyTwoStepVerified);

    // 2. PIN Lock on Refresh / Revisit Check
    const isPinRequired = !!userProfile.pinLockEnabled || !!userProfile.securityPin || !!SettingsService.getSettings().privacy.pinLock || !!SettingsService.getSettings().privacy.pin;
    if (isPinRequired) {
      const alreadyPinUnlocked = SecurityPinService.isSessionUnlocked(user.uid);
      setIsPinSessionUnlocked(alreadyPinUnlocked);
    } else {
      setIsPinSessionUnlocked(true);
    }
  }, [user?.uid, userProfile.twoFactorEnabled, userProfile.twoFactorPassword, userProfile.pinLockEnabled, userProfile.securityPin]);

  // Monitor trial expiration and ensure post-trial 100 credits are awarded
  useEffect(() => {
    if (!user) return;
    const trialInfo = calculateTrialInfo(userProfile, user.uid);
    if (trialInfo.isExpired && (!userProfile.planType || userProfile.planType === "Free")) {
      const grantKey = `post_trial_credits_granted_${user.uid}`;
      const alreadyAwarded = localStorage.getItem(grantKey) === "true";
      if (!alreadyAwarded) {
        localStorage.setItem(grantKey, "true");
        const currentCredits = typeof userProfile.credits === "number" ? userProfile.credits : 0;
        const newCredits = Math.max(100, currentCredits);
        const updated = {
          ...userProfile,
          credits: newCredits,
        };
        setUserProfile(updated);
        localStorage.setItem(`profile_${user.uid}`, JSON.stringify(updated));
        saveProfileToFirestore(user.uid, updated);

        sendNotificationRef.current(
          "100 Free Credits Awarded 🎁",
          "Your 10-day unlimited trial has concluded. We've credited 100 free study credits to your account so you can continue learning!",
          "Important Alerts",
          user.uid
        ).catch((e) => console.warn("Failed to send trial expiration notification:", e));
      }
    }
  }, [userProfile.trialStartDate, user, userProfile.planType]);

  // History Persistence and Database Synchronization
  useEffect(() => {
    setHistoryLoadedUid("none");
    let active = true;
    const loadAndSyncHistory = async () => {
      const storageKey = user ? `history_${user.uid}` : "history_guest";
      const savedHistory = localStorage.getItem(storageKey);
      let initialHistory: HistoryItem[] = [];
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory);
          if (Array.isArray(parsedHistory)) {
            initialHistory = parsedHistory;
          }
        } catch {
          initialHistory = [];
        }
      }

      // Migrate guest history if user just logged in
      if (user) {
        try {
          const guestHistoryKey = "history_guest";
          const savedGuestHistory = localStorage.getItem(guestHistoryKey);
          if (savedGuestHistory) {
            const parsedGuest = JSON.parse(savedGuestHistory);
            if (Array.isArray(parsedGuest) && parsedGuest.length > 0) {
              const existingIds = new Set(initialHistory.map(item => item.id));
              let migratedCount = 0;
              parsedGuest.forEach(guestItem => {
                if (!existingIds.has(guestItem.id)) {
                  // Merge guest items into initialHistory, keeping guest item details
                  initialHistory.push(guestItem);
                  migratedCount++;
                }
              });
              if (migratedCount > 0) {
                // Save merged history back to local storage
                localStorage.setItem(`history_${user.uid}`, JSON.stringify(initialHistory));
                // Remove guest history so we don't migrate multiple times
                localStorage.removeItem(guestHistoryKey);
              }
            }
          }
        } catch (e) {
          console.warn("Guest history migration failed:", e);
        }
      }

      // 1. Immediately (synchronously) populate history from local storage so that
      // counters and dashboard items render instantly without network delay!
      if (active) {
        setHistory(initialHistory);
        setHistoryLoadedUid(user ? user.uid : "guest");
      }

      if (user) {
        try {
          // 2. background-sync/fetch from Firestore, reconciling offline modifications
          const syncedHistory = await syncHistoryWithFirestore(user.uid, initialHistory);
          if (active) {
            setHistory(syncedHistory);
            localStorage.setItem(`history_${user.uid}`, JSON.stringify(syncedHistory));
            setHistoryLoadedUid(user.uid);
          }
        } catch (err) {
          console.warn("Firestore history sync failed, fallback to local:", err);
          if (active) {
            setHistory(initialHistory);
            setHistoryLoadedUid(user.uid);
          }
        }
      }
    };

    loadAndSyncHistory();

    // Setup 30-seconds sync timer to seamlessly match history across devices

    return () => {
      active = false;
      
    };
  }, [user]);

  useEffect(() => {
    const currentUid = user ? user.uid : "guest";
    if (historyLoadedUid !== currentUid) return;
    localStorage.setItem(`history_${currentUid}`, JSON.stringify(history));
  }, [history, user, historyLoadedUid]);

  const handleProfileSave = async (
    newProfile: UserProfile,
    redirectDashboard = false,
  ) => {
    setUserProfile(newProfile);
    if (newProfile.grade) {
      SettingsService.updateSettings({
        learning: {
          ...SettingsService.getSettings().learning,
          grade: newProfile.grade
        }
      });
    }
    if (user) {
      localStorage.setItem(`profile_${user.uid}`, JSON.stringify(newProfile));
      await saveProfileToFirestore(user.uid, newProfile);
    }
    
    // Automatically redirect to Dashboard after completing onboarding
    if (newProfile.hasCompletedOnboarding && redirectDashboard) {
       setMode(AppMode.DASHBOARD);
       setShowAuthModal(false);
    }
  };

  const handleSignUpSuccess = async (signupData?: Partial<UserProfile>) => {
    let activeUid = auth.currentUser?.uid || (signupData as any)?.uid;
    if (!activeUid) {
      activeUid = localStorage.getItem('sjtutor_active_id_session') || (signupData?.sjTutorId ? `id_${signupData.sjTutorId.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '') || `id_${Date.now()}`;
    }

    const mockUser: any = auth.currentUser || {
      uid: activeUid,
      displayName: signupData?.displayName || 'Scholar Member',
      email: signupData?.email || `${activeUid}@sjtutor.ai`,
      photoURL: signupData?.photoURL || '',
    };
    setUser(mockUser);

    try {
      const userProf = auth.currentUser ? await getCurrentUserProfile(auth.currentUser) : (signupData || {});
      const finalSjTutorId = signupData?.sjTutorId || (userProf as any)?.sjTutorId || generateSjTutorId();
      const mergedProfile = {
        ...initialProfileState,
        ...userProf,
        ...(signupData || {}),
        sjTutorId: finalSjTutorId,
        registrationNumber: finalSjTutorId,
        isRegisteredInFirestore: true,
        hasCompletedOnboarding: true,
      };
      setUserProfile(mergedProfile as any);

      if (activeUid) {
        localStorage.setItem(`profile_${activeUid}`, JSON.stringify(mergedProfile));
        localStorage.setItem('sjtutor_active_id_session', activeUid);
        await saveProfileToFirestore(activeUid, mergedProfile);
      }

      if (signupData?.language) {
        SettingsService.updateSettings({
          learning: {
            ...SettingsService.getSettings().learning,
            language: signupData.language,
          }
        });
        setFormData((prev) => ({
          ...prev,
          language: signupData.language || prev.language,
        }));
      }

      // Prompt 2-Step Verification Password after Signing IN
      SecurityPinService.clearTwoStepVerified(activeUid);
      setIsTwoStepVerified(false);

      setMode(AppMode.DASHBOARD);
    } catch (e) {
      console.error("Error fetching/creating profile on signup success:", e);
    }

    setShowAuthModal(false);
  };

  const handlePaymentSuccess = (
    creditsToAdd: number,
    planName: "STARTER" | "SCHOLAR" | "ACHIEVER",
  ) => {
    const planTypeMap: Record<string, "Starter" | "Scholar" | "Achiever"> = {
      STARTER: "Starter",
      SCHOLAR: "Scholar",
      ACHIEVER: "Achiever",
    };
    const updatedProfile: UserProfile = {
      ...userProfile,
      credits: userProfile.credits + creditsToAdd,
      planType: planTypeMap[planName],
    };
    handleProfileSave(updatedProfile);
  };

  const handleFormChange = (
    field: keyof StudyRequestData,
    value: string | number | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * Generates a dynamic educational example based on the user's Preferred Subject
   * and Grade/Class from their settings.
   */
  const handleFillSample = () => {
    const settings = SettingsService.getSettings();
    const subject = settings.learning.preferredSubject || "Science";
    const grade = settings.learning.grade || "10th";
    const language = settings.learning.language || "English";

    // Intelligent educational mapping for realistic chapter names
    let chapter = "Introduction to the Topic";
    const subLower = subject.toLowerCase();

    if (subLower.includes("science")) {
      if (grade.includes("8")) chapter = "Synthetic Fibres and Plastics";
      else if (grade.includes("9")) chapter = "Atoms and Molecules";
      else if (grade.includes("10")) chapter = "Heredity and Evolution";
      else chapter = "The Fundamental Unit of Life";
    } else if (subLower.includes("history") || subLower.includes("social")) {
      if (grade.includes("9")) chapter = "The French Revolution";
      else if (grade.includes("10")) chapter = "Nationalism in India";
      else chapter = "The Age of Industrialization";
    } else if (subLower.includes("math")) {
      if (grade.includes("10")) chapter = "Arithmetic Progressions";
      else if (grade.includes("11") || grade.includes("12"))
        chapter = "Integration and Differentiation";
      else chapter = "Linear Equations in Two Variables";
    } else if (subLower.includes("physics")) {
      chapter = "Laws of Motion and Force";
    } else if (subLower.includes("chemistry")) {
      chapter = "Carbon and its Compounds";
    } else if (subLower.includes("geography")) {
      chapter = "Climate and Natural Vegetation";
    } else if (subLower.includes("english")) {
      chapter = "Modern Literature & Poetry Analysis";
    } else if (subLower.includes("computer") || subLower.includes("coding")) {
      chapter = "Introduction to Data Structures";
    }

    setFormData({
      ...INITIAL_FORM_DATA,
      subject: subject,
      gradeClass: grade,
      board: "CBSE", // Defaulting to a standard board for the example
      language: language,
      chapterName: chapter,
      questionCount: mode === AppMode.QUIZ ? 10 : 5,
      difficulty: settings.learning.difficulty || "Medium",
    });
  };

  const validateForm = () => {
    if (!formData.subject || !formData.gradeClass || !formData.chapterName) {
      setError("Please fill in at least Subject, Class, and Chapter Name.");
      return false;
    }
    setError(null);
    return true;
  };

  const addToHistory = (type: AppMode, content: any) => {
    const newId = Date.now().toString();
    const newItem: HistoryItem = {
      id: newId,
      type,
      title: formData.chapterName || "Untitled Chapter",
      subtitle: `${formData.gradeClass} • ${formData.subject}`,
      timestamp: Date.now(),
      content,
      formData: { ...formData },
    };
    setHistory((prev) => [newItem, ...prev]);
    setCurrentHistoryId(newId);

    if (user) {
      saveHistoryItemToFirestore(user.uid, newItem);
    }

    // Record learning activity sequence progress
    recordActivity().then((res) => {
      if (res.success && res.incremented) {
        if (res.milestoneReached) {
          setTimeout(() => {
            alert(`🎉 STREAK MILESTONE REACHED! 🎉\n\nYou have completed ${res.milestoneReached} consecutive learning days on SJ Tutor AI!\n\nOpen the Streak Widget on your screen to claim your Reward in learning credits!`);
          }, 1500);
        }
      }
    });
  };

  const handleSharePublicLink = async (type: string, title: string, content: any, customId?: string, customUrl?: string, customMessage?: string) => {
    // 9. Error Logging: Button click detected
    console.log("[SHARE AUDIT] Share button click detected inside App.tsx:", { type, title, customId, customUrl, customMessage });
    
    try {
      // 5. User Feedback: "Sharing..." toast
      triggerToast("Sharing...", "Generating and storing your public share link...", "Important Alerts");
      
      const uid = user ? user.uid : "guest";
      
      // 7. Firebase Check: Ensure document is created/exists in Firestore with a valid document ID
      console.log("[SHARE AUDIT] Storing share item to Firestore with owner ID:", uid);
      const shareId = await createSharedContent(type, title, content, uid, customId);
      console.log("[SHARE AUDIT] Firestore document created successfully. shareId:", shareId);
      
      if (!shareId) {
        // 5. User Feedback: "Unable to generate share link."
        triggerToast("Unable to generate share link.", "The database could not create a unique resource identifier.", "Important Alerts");
        return;
      }

      // 2. Generate the Share URL
      const shareLink = customUrl || `${window.location.origin}/share/${shareId}`;
      console.log("[SHARE AUDIT] URL generated:", shareLink);

      // 3. Web Share API detection and usage
      const webShareSupported = !!navigator.share;
      console.log("[SHARE AUDIT] Web Share API available in environment:", webShareSupported);

      if (webShareSupported) {
        try {
          console.log("[SHARE AUDIT] Attempting Web Share API share...");
          await navigator.share({
            title: title || "SJ Tutor AI",
            text: customMessage || `Check out this study content on SJ Tutor AI!`,
            url: shareLink
          });
          console.log("[SHARE AUDIT] Web Share API success: Share dialog opened successfully.");
          triggerToast("Share dialog opened.", "Native sharing dialog has been opened.", "Important Alerts");
          
          setShareSuccessModal({
            isOpen: true,
            shareId: shareId,
            title,
            type: type,
            customUrl: shareLink,
          });
          return;
        } catch (shareErr: any) {
          console.warn("[SHARE AUDIT] Web Share API call was cancelled or blocked by browser security:", shareErr);
          // If user cancels or if not allowed in iframe, proceed to clipboard copy fallback
        }
      }

      // 4. Fallback: Copy URL using navigator.clipboard
      try {
        console.log("[SHARE AUDIT] Attempting navigator.clipboard.writeText...");
        await navigator.clipboard.writeText(shareLink);
        console.log("[SHARE AUDIT] Clipboard copy success.");
        triggerToast("Link copied successfully!", "The share link was copied to your clipboard.", "Important Alerts");
      } catch (clipErr: any) {
        console.error("[SHARE AUDIT] Clipboard copy failed:", clipErr);
        triggerToast("Sharing...", "Opening sharing panel with link.", "Important Alerts");
      }

      setShareSuccessModal({
        isOpen: true,
        shareId: shareId,
        title,
        type: type,
        customUrl: shareLink,
      });

    } catch (error: any) {
      console.error("[SHARE AUDIT] Failed to share publicly. Exception caught:", error);
      triggerToast("Failed to share.", `Unable to generate share link: ${error.message || error}`, "Important Alerts");
    }
  };

  const handleQuizComplete = (score: number) => {
    setExistingQuizScore(score);
    if (currentHistoryId) {
      const historyItem = history.find((item) => item.id === currentHistoryId);
      if (!historyItem) return;

      const updatedItem = { ...historyItem, score };
      setHistory((prev) =>
        prev.map((item) =>
          item.id === currentHistoryId ? updatedItem : item,
        ),
      );

      // Save score to leaderboard
      const userUid = user?.uid || "guest";
      const userDispName = userProfile.displayName || "Guest Learner";
      const userPhoto = userProfile.photoURL || "";
      saveQuizScoreToLeaderboard(userUid, userDispName, userPhoto, score);

      if (user) {
        saveHistoryItemToFirestore(user.uid, updatedItem);
      }

      // Record active quiz completion sequence
      recordActivity().then((res) => {
        if (res.success && res.incremented) {
          if (res.milestoneReached) {
            setTimeout(() => {
              triggerToast(
                "Streak Milestone! 🔥",
                `You have completed ${res.milestoneReached} consecutive learning days on SJ Tutor AI! Open the Streak Widget to claim your reward.`,
                "Daily Streak Reminders"
              );
            }, 1500);
          }
        }
      });

      // Calculate rewards
      const qCount = (historyItem.content as QuizQuestion[]).length;
      const percentage = (score / qCount) * 100;

      // 1. General Reward: 90% score on 10+ questions quiz gets 50% refund
      if (qCount >= 10 && percentage >= 90) {
        const cost = calculateCost(AppMode.QUIZ, historyItem.formData);
        if (cost > 0) {
          const refundAmount = Math.ceil(cost * 0.5);
          const newCredits = userProfile.credits + refundAmount;
          handleProfileSave({ ...userProfile, credits: newCredits }, false);

          setTimeout(() => {
            triggerToast(
              "Academic Excellence! 🏆",
              `You scored ${percentage}% on your quiz! We have refunded ${refundAmount} credits (50%) to your account. Keep it up!`,
              "Competition Announcements"
            );
          }, 1500);
        }
      }

      // 2. Specific Challenge Reward (Legacy 10-Question Hard Challenge)
      if (
        historyItem.formData.questionCount === 10 &&
        historyItem.formData.difficulty === "Hard" &&
        percentage >= 75
      ) {
        const bonus = 50;
        const newCredits = userProfile.credits + bonus;
        handleProfileSave({ ...userProfile, credits: newCredits }, false);

        setTimeout(() => {
          triggerToast(
            "Challenge Mastered! 🎉",
            `You scored ${score}/${qCount} (${percentage}%) and earned ${bonus} credits!`,
            "Competition Announcements"
          );
        }, 1000);
      } else if (
        historyItem.formData.questionCount === 10 &&
        historyItem.formData.difficulty === "Hard" &&
        percentage < 75
      ) {
        setTimeout(() => {
          triggerToast(
            "Challenge Attempted",
            `You scored ${percentage}%. Score 75% or higher to earn the 50 credit bonus! Keep practicing!`,
            "Quiz Updates"
          );
        }, 1000);
      }
    }
  };

  const calculateCost = (
    targetMode: AppMode,
    data: StudyRequestData,
  ): number => {
    if (targetMode === AppMode.SUMMARY) return 10;
    if (targetMode === AppMode.HOMEWORK) {
      return 10;
    }
    if (targetMode === AppMode.QUIZ) {
      if (data.questionCount === 10 && data.difficulty === "Hard") return 0;
      let cost = 10;
      const qCount = data.questionCount || 5;
      cost += Math.ceil(qCount / 2);
      if (data.difficulty === "Hard") cost += 5;
      return cost;
    }
    return 0;
  };

  const deductCredit = (amount: number) => {
    const trialInfo = calculateTrialInfo(userProfile, user?.uid);
    if (!trialInfo.isExpired) {
      return true; // Unlimited credits during trial
    }

    if (userProfile.credits >= amount) {
      const updatedProfile = {
        ...userProfile,
        credits: userProfile.credits - amount,
      };
      handleProfileSave(updatedProfile, false);
      return true;
    }
    return false;
  };

  const handleGenerate = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const cost = calculateCost(mode, formData);
    const trialInfo = calculateTrialInfo(userProfile, user?.uid);
    if (userProfile.credits < cost && trialInfo.isExpired) {
      setError(
        `Insufficient credits. This generation requires ${cost} credits, but you have ${userProfile.credits}. Upgrade to Premium for more.`,
      );
      return;
    }

    if (!process.env.API_KEY) {
      setError(
        "Configuration Error: API_KEY is missing. Please check your environment variables.",
      );
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    setExistingQuizScore(undefined);
    setCurrentHistoryId(null);

    try {
      if (mode === AppMode.SUMMARY) {
        setSummaryContent("");
        const stream = await GeminiService.generateSummaryStream(formData);

        let text = "";
        for await (const chunk of stream) {
          const c = chunk as GenerateContentResponse;
          if (c.text) {
            text += c.text;
            setSummaryContent(text);
          }
        }
        addToHistory(AppMode.SUMMARY, text);
        deductCredit(cost);
        sendNotification(
          "Summary Ready 📝",
          `Your comprehensive AI study summary and key concepts list for "${formData.subject || 'your chosen topic'}" is ready! Double-down on your revisions now.`,
          "Important Alerts",
          user?.uid || "all"
        ).catch(() => {});
      } else if (mode === AppMode.HOMEWORK) {
        setHomeworkContent("");
        const stream = await GeminiService.solveHomeworkStream(
          formData,
          homeworkFiles,
        );

        let text = "";
        for await (const chunk of stream) {
          const c = chunk as GenerateContentResponse;
          if (c.text) {
            text += c.text;
            setHomeworkContent(text);
          }
        }

        addToHistory(AppMode.HOMEWORK, text);
        deductCredit(cost);
        sendNotification(
          "Homework Solved 📚",
          `Your detailed step-by-step key insights and explanation for "${formData.subject || 'your chosen topic'}" are ready! Check out the homework section.`,
          "Important Alerts",
          user?.uid || "all"
        ).catch(() => {});
      } else if (mode === AppMode.QUIZ) {
        setQuizData(null);
        const questions = await GeminiService.generateQuiz(formData);
        setQuizData(questions);
        addToHistory(AppMode.QUIZ, questions);
        deductCredit(cost);
        sendNotification(
          "Quiz Generated 🧠",
          `Your custom quiz challenge for "${formData.subject || 'your topic'}" is ready! Test your knowledge and score high.`,
          "Quiz Updates",
          user?.uid || "all"
        ).catch(() => {});
      }
    } catch (err: any) {
      console.error(err);
      let errorMessage =
        err.message || "Failed to generate content. Please try again.";
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error?.message) errorMessage = parsed.error.message;
      } catch {
        // Silently fail if not JSON
      }

      if (
        errorMessage.includes("quota") ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("429")
      ) {
        errorMessage = "QUOTA_EXHAUSTED";
      } else if (
        errorMessage.includes("Generative Language API has not been used") ||
        errorMessage.includes("PERMISSION_DENIED")
      ) {
        errorMessage = "API_DISABLED";
      } else if (errorMessage.includes("API key not valid")) {
        errorMessage = "API_KEY_INVALID_ERROR";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    if (item.formData) {
      setFormData(item.formData);
    }
    setCurrentHistoryId(item.id);

    if (item.type === AppMode.SUMMARY) {
      setSummaryContent(item.content);
      setMode(AppMode.SUMMARY);
    } else if (item.type === AppMode.ESSAY || item.type === AppMode.HOMEWORK) {
      setHomeworkContent(item.content);
      setMode(AppMode.HOMEWORK);
    } else if (item.type === AppMode.QUIZ) {
      setQuizData(item.content);
      setExistingQuizScore(item.score);
      setMode(AppMode.QUIZ);
    } else if (item.type === AppMode.TUTOR) {
      setMode(AppMode.TUTOR);
    }
  };

  const handleShareHistoryItem = async (
    e: React.MouseEvent,
    item: HistoryItem,
  ) => {
    e.stopPropagation();

    try {
      let shareId = "";
      // 1. Try Firestore direct save first
      try {
        const uid = user ? user.uid : "guest";
        shareId = await createSharedContent(item.type, item.title, item.content, uid);
      } catch (fsErr) {
        console.warn("Firestore share failed, attempting server API fallback:", fsErr);
      }

      // 2. Fallback to server API if Firestore failed to return shareId
      if (!shareId) {
        try {
          const response = await fetch("/api/auth/share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: item.type,
              title: item.title,
              subtitle: item.subtitle,
              content: item.content,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.id) {
              shareId = data.id;
            }
          }
        } catch (apiErr) {
          console.error("API share fallback failed:", apiErr);
        }
      }

      if (!shareId) {
        throw new Error("Could not register shared content ID on server or database.");
      }

      // 3. Open Success Modal!
      setShareSuccessModal({
        isOpen: true,
        shareId: shareId,
        title: item.title,
        type: item.type,
      });

      // 4. Fallback or additional standard native share options
      const shareUrl = `${window.location.origin}/share/${shareId}`;
      let text = `${item.title} (${item.type})\n\n`;

      if (item.type === AppMode.QUIZ) {
        const qData = item.content as QuizQuestion[];
        qData.forEach((q, i) => {
          text += `Q${i + 1}: ${q.question}\n`;
          q.options.forEach((opt, j) => {
            text += `   ${String.fromCharCode(65 + j)}) ${opt}\n`;
          });
          text += "\n";
        });
        if (item.score !== undefined) {
          text += `I scored ${item.score}/${qData.length}!\n`;
        }
      } else if (typeof item.content === "string") {
        text += item.content;
      }

      text += `\nView here: ${shareUrl}\n\nGenerated by SJ Tutor AI`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: item.title,
            text: text,
            url: shareUrl,
          });
        } catch {
          // User closed sharing sheet or unsupported context
        }
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl);
        } catch {
          console.warn("Clipboard copy blocked or unsupported, user can copy from modal");
        }
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("Sharing failed.", err.message || "An unexpected sharing error occurred.", "Important Alerts");
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('sjtutor_active_id_session');
      if (user) {
        SecurityPinService.clearTwoStepVerified(user.uid);
        SecurityPinService.lockSession(user.uid);
        const currentDeviceId = getCurrentDeviceId();
        await DeviceService.logoutDevice(user.uid, currentDeviceId);
      }
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setUser(null);
      setUserProfile(initialProfileState);
      setIsTwoStepVerified(true);
      setIsPinSessionUnlocked(true);
      setMode(AppMode.DASHBOARD);
      setDashboardView("OVERVIEW");
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      localStorage.removeItem('sjtutor_active_id_session');
      if (user) {
        SecurityPinService.clearTwoStepVerified(user.uid);
        SecurityPinService.lockSession(user.uid);
        await DeviceService.logoutAllDevices(user.uid);
      }
      await signOut(auth);
      triggerToast("Logged Out Successfully", "You have been logged out from all devices.", "Important Alerts");
    } catch (error) {
      console.error("Error signing out all devices:", error);
    } finally {
      setUser(null);
      setUserProfile(initialProfileState);
      setIsTwoStepVerified(true);
      setIsPinSessionUnlocked(true);
      setMode(AppMode.DASHBOARD);
      setDashboardView("OVERVIEW");
    }
  };

  const navItems = [
    { id: AppMode.DASHBOARD, label: "Dashboard", icon: LayoutDashboard },
    { id: AppMode.ID_CARD, label: "Student ID Card", icon: CreditCard },
    { id: AppMode.GROUPS, label: "Study Groups", icon: Users },
    { id: AppMode.SUMMARY, label: "Instant Summary", icon: FileText },
    { id: AppMode.QUIZ, label: "Quiz Creator", icon: BrainCircuit },
    { id: AppMode.HOMEWORK, label: "Homework Solver", icon: BookOpen },
    { id: AppMode.TUTOR, label: "AI Tutor Sessions", icon: MessageCircle },
    { id: AppMode.NOTES, label: "Notes & Schedule", icon: Calendar },
    { id: AppMode.TIMER, label: "Study Timer", icon: Clock },
    { id: AppMode.SETTINGS, label: "Settings", icon: Settings },
  ];

  const handleTutorialClose = () => {
    setShowTutorial(false);
    setHasSeenTutorial(true);
    localStorage.setItem("hasSeenTutorial", "true");
  };

  const renderDashboard = () => {
    const getSingularName = (view: AppMode) => {
      switch (view) {
        case AppMode.SUMMARY:
          return "Summary";
        case AppMode.QUIZ:
          return "Quiz";
        case AppMode.HOMEWORK:
          return "Homework";
        case AppMode.TUTOR:
          return "Chat";
        default:
          return "Item";
      }
    };

    const noteCount = (() => {
      try {
        const key = user ? `notes_${user.uid}` : "notes_guest";
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved).length : 0;
      } catch {
        return 0;
      }
    })();

    const stats = {
      summaries: history.filter((h) => h.type === AppMode.SUMMARY).length,
      essays: history.filter((h) => h.type === AppMode.ESSAY).length,
      quizzes: history.filter((h) => h.type === AppMode.QUIZ).length,
      homeworks: history.filter((h) => h.type === AppMode.HOMEWORK).length,
      chats: history.filter((h) => h.type === AppMode.TUTOR).length,
    };

    const dashboardCards = [
      {
        id: AppMode.GROUPS,
        label: "Study Groups",
        count: null,
        icon: Users,
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-[#FDF5E6] dark:bg-emerald-900/30",
      },
      {
        id: AppMode.ID_CARD,
        label: "My ID Card",
        count: null,
        icon: CreditCard,
        color: "text-indigo-600 dark:text-indigo-400",
        bg: "bg-[#FDF5E6] dark:bg-indigo-900/30",
      },
      {
        id: AppMode.SUMMARY,
        label: "Summaries",
        count: stats.summaries,
        icon: FileText,
        color: "text-amber-800 dark:text-amber-300",
        bg: "bg-[#FDF5E6] dark:bg-amber-900/30",
      },
      {
        id: AppMode.QUIZ,
        label: "Quizzes",
        count: stats.quizzes,
        icon: BrainCircuit,
        color: "text-amber-700 dark:text-amber-400",
        bg: "bg-[#FDF5E6] dark:bg-amber-900/30",
      },
      {
        id: AppMode.HOMEWORK,
        label: "Homework Solutions",
        count: stats.homeworks + stats.essays,
        icon: BookOpen,
        color: "text-amber-600 dark:text-amber-500",
        bg: "bg-[#FDF5E6] dark:bg-amber-900/30",
      },
      {
        id: AppMode.TUTOR,
        label: "AI Tutor Sessions",
        count: stats.chats,
        icon: MessageCircle,
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-[#FDF5E6] dark:bg-blue-900/30",
      },
      {
        id: AppMode.NOTIFICATIONS,
        label: "Notifications",
        count: unreadCount,
        icon: Bell,
        color: "text-violet-600 dark:text-violet-400",
        bg: "bg-[#FDF5E6] dark:bg-violet-900/30",
      },
      {
        id: AppMode.NOTES,
        label: "Notes",
        count: noteCount,
        icon: Calendar,
        color: "text-emerald-700 dark:text-emerald-400",
        bg: "bg-[#FDF5E6] dark:bg-emerald-900/30",
      },
    ];

    const dashboardContainerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.05,
          delayChildren: 0.03,
        },
      },
    };

    const dashboardCardVariants = {
      hidden: { opacity: 0, y: 14, scale: 0.97 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          type: "spring",
          damping: 24,
          stiffness: 340,
          mass: 0.7,
        },
      },
    };

    const sectionVariants = {
      hidden: { opacity: 0, y: 16 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          type: "spring",
          damping: 26,
          stiffness: 300,
          mass: 0.8,
        },
      },
    };

    const quickActionVariants = {
      hidden: { opacity: 0, y: 10, scale: 0.96 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          type: "spring",
          damping: 22,
          stiffness: 340,
        },
      },
    };

    const historyItemVariants = {
      hidden: { opacity: 0, y: 10 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.28,
          ease: [0.16, 1, 0.3, 1],
        },
      },
    };

    if (dashboardView !== "OVERVIEW") {
      const baseFiltered = history.filter((h) => 
        h.type === dashboardView || 
        (dashboardView === AppMode.HOMEWORK && h.type === AppMode.ESSAY)
      );
      const filteredHistory = baseFiltered.filter((h) => 
        h.title.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
        h.subtitle.toLowerCase().includes(historySearchQuery.toLowerCase())
      );
      const categoryLabel =
        dashboardCards.find((c) => c.id === dashboardView)?.label || "History";

      return (
        <motion.div 
          variants={dashboardContainerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10"
        >
          <button
            onClick={() => {
              setDashboardView("OVERVIEW");
              setHistorySearchQuery("");
            }}
            className="flex items-center text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 mb-6 transition-all hover:-translate-x-1 group text-sm"
          >
            <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mr-2 border border-slate-100 dark:border-slate-700 group-hover:border-primary-200 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium">Back to Dashboard</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary-400" />
              {categoryLabel} History
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              {/* Delete All Button */}
              {baseFiltered.length > 0 && (
                <button
                  onClick={async () => {
                    const itemsToDelete = baseFiltered.map(item => item.id);
                    const updatedHistory = history.filter(h => !itemsToDelete.includes(h.id));
                    
                    setHistory(updatedHistory);
                    const currentUid = user ? user.uid : "guest";
                    localStorage.setItem(`history_${currentUid}`, JSON.stringify(updatedHistory));
                    
                    if (user) {
                      // Delete each item from Firestore in parallel
                      await Promise.all(itemsToDelete.map(id => deleteHistoryItemFromFirestore(user.uid, id))).catch(console.error);
                    }
                    triggerToast("History Cleared 🗑️", `All ${categoryLabel.toLowerCase()} history was deleted.`, "Study & Quizzes");
                  }}
                  className="flex items-center px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors shrink-0"
                  title={`Delete all ${categoryLabel.toLowerCase()}`}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </button>
              )}

              {/* Premium Search Bar */}
              {baseFiltered.length > 0 && (
                <div className="relative w-full sm:max-w-xs group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder={`Search ${categoryLabel.toLowerCase()}...`}
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl border border-slate-200/60 dark:border-slate-700/60 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none"
                  />
                  <AnimatePresence>
                    {historySearchQuery && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => setHistorySearchQuery("")}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5 bg-slate-100 dark:bg-slate-700 rounded-full p-0.5" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {baseFiltered.length === 0 ? (
            <motion.div variants={sectionVariants} className="text-center py-20 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-xl border border-slate-200/60 dark:border-slate-700 border-dashed">
              <div className="w-16 h-16 bg-primary-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary-100 dark:border-slate-600 p-1">
                <Logo className="w-full h-full" iconOnly noBorder />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-5 text-sm">
                No {categoryLabel.toLowerCase()} found yet.
              </p>

              <button
                onClick={() => {
                  setSummaryContent("");
                  setHomeworkContent("");
                  setHomeworkFiles([]);
                  setQuizData(null);
                  setExistingQuizScore(undefined);
                  setCurrentHistoryId(null);
                  setError(null);
                  const settings = SettingsService.getSettings();
                  setFormData({
                    ...INITIAL_FORM_DATA,
                    language:
                      settings.learning.language || INITIAL_FORM_DATA.language,
                    gradeClass:
                      userProfile.grade || INITIAL_FORM_DATA.gradeClass,
                  });
                  setMode(dashboardView as AppMode);
                  setDashboardView("OVERVIEW");
                }}
                className="inline-flex items-center px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-primary-500/20 text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New {getSingularName(dashboardView as AppMode)}
              </button>
            </motion.div>
          ) : filteredHistory.length === 0 ? (
            <motion.div variants={sectionVariants} className="text-center py-16 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-xl border border-slate-200/60 dark:border-slate-700 p-8">
              <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                No history entries match &quot;{historySearchQuery}&quot;
              </p>
              <button
                onClick={() => setHistorySearchQuery("")}
                className="mt-3 text-xs text-primary-600 dark:text-primary-400 font-bold hover:underline"
              >
                Clear search filter
              </button>
            </motion.div>
          ) : (
            <motion.div variants={dashboardContainerVariants} className="grid gap-4">
              {filteredHistory.map((item) => (
                <motion.div
                  key={item.id}
                  variants={historyItemVariants}
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                  className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-5 rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 flex justify-between items-center group cursor-pointer"
                  onClick={() => loadHistoryItem(item)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center bg-primary-100 dark:bg-slate-700 text-primary-600 dark:text-primary-400`}
                    >
                      {item.type === AppMode.QUIZ ? (
                        <BrainCircuit className="w-4 h-4" />
                      ) : item.type === AppMode.SUMMARY ? (
                        <FileText className="w-4 h-4" />
                      ) : (item.type === AppMode.HOMEWORK || item.type === AppMode.ESSAY) ? (
                        <BookOpen className="w-4 h-4" />
                      ) : (
                        <MessageCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-white mb-0.5 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                        <span className="font-medium bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                          {item.subtitle}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                        {item.type === AppMode.QUIZ &&
                          item.score !== undefined && (
                            <span className="flex items-center gap-1 text-primary-600 font-bold bg-primary-50 dark:bg-slate-900 px-2 py-0.5 rounded-full">
                              Score: {item.score}
                            </span>
                          )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 relative z-20">
                    <button
                      onClick={(e) => {
                        console.log("[SHARE AUDIT] Share history item button click event captured directly in onClick handler! Item:", item);
                        handleShareHistoryItem(e, item);
                      }}
                      className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-primary-50 hover:text-primary-600 relative z-20 pointer-events-auto"
                      title="Share"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const updatedHistory = history.filter(h => h.id !== item.id);
                        setHistory(updatedHistory);
                        const currentUid = user ? user.uid : "guest";
                        localStorage.setItem(`history_${currentUid}`, JSON.stringify(updatedHistory));
                        if (user) {
                          await deleteHistoryItemFromFirestore(user.uid, item.id);
                        }
                        triggerToast("Item Deleted 🗑️", `"${item.title}" was removed from history.`, "Study & Quizzes");
                      }}
                      className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center opacity-80 sm:opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 hover:text-rose-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <Eye className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      );
    }

    if (dashboardView === "OVERVIEW" && historyLoadedUid === "none") {
      return <DashboardSkeleton />;
    }

    return (
      <motion.div 
        variants={dashboardContainerVariants}
        initial="hidden"
        animate="visible"
        className="w-full h-full"
      >
        <motion.div variants={sectionVariants} className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              Welcome back, {userProfile.displayName || "Scholar"}! 👋
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Ready to learn something new today?
            </p>
          </div>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <TrialBannerCard 
            userProfile={userProfile} 
            uid={user?.uid} 
            onOpenUpgrade={() => setShowPremiumModal(true)} 
          />
        </motion.div>

        {user && !userProfile.twoFactorPassword && !dismissed2faReminder && (
          <motion.div variants={sectionVariants}>
            <SecurityPasswordReminderCard
              onSetupClick={() => navigateToPrivacySettings(true)}
              onDismiss={() => {
                setDismissed2faReminder(true);
                if (user) {
                  localStorage.setItem(`dismissed_2fa_reminder_${user.uid}`, "true");
                }
              }}
            />
          </motion.div>
        )}

        <motion.div 
          variants={dashboardContainerVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {dashboardCards.map((card) => (
            <motion.button
              key={card.id}
              variants={dashboardCardVariants}
              whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (card.id === AppMode.ID_CARD && !user) {
                  setShowAuthModal(true);
                  return;
                }

                if (card.id === AppMode.NOTES) {
                  setMode(AppMode.NOTES);
                } else if (card.id === AppMode.GROUPS) {
                  setMode(AppMode.GROUPS);
                } else if (card.id === AppMode.ID_CARD) {
                  setMode(AppMode.ID_CARD);
                } else if (card.id === AppMode.NOTIFICATIONS) {
                  setMode(AppMode.NOTIFICATIONS);
                } else {
                  setDashboardView(card.id as any);
                }
              }}
              className={`p-5 rounded-xl border border-transparent hover:border-amber-200 dark:hover:border-amber-800 transition-all hover:shadow-md text-left group bg-white dark:bg-slate-800 shadow-sm border-slate-100 dark:border-slate-700 relative overflow-hidden`}
            >
              <div
                className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${card.color}`}
              >
                <card.icon className="w-16 h-16" />
              </div>
              <div className="flex justify-between items-start mb-3 relative z-10">
                <div
                  className={`p-2.5 rounded-lg shadow-sm ${card.color} ${card.bg}`}
                >
                  <card.icon className="w-5 h-5" />
                </div>
                {card.count !== null && (
                  historyLoadedUid === "none" ? (
                    <div className="h-6 w-10 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                  ) : (
                    <span className="text-2xl font-bold text-slate-800 dark:text-white">
                      {card.count}
                    </span>
                  )
                )}
              </div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1 relative z-10">
                {card.label}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors flex items-center gap-1 relative z-10">
                View Details <ChevronRight className="w-3 h-3" />
              </p>
            </motion.button>
          ))}
        </motion.div>

        <motion.div variants={sectionVariants} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-bold text-slate-800 dark:text-white mb-4">
            Quick Actions
          </h3>
          <motion.div variants={dashboardContainerVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <motion.button
              variants={quickActionVariants}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigateToMode(AppMode.SUMMARY)}
              className="p-4 bg-white dark:bg-slate-700/50 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-400 rounded-xl text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 flex flex-col items-center gap-2 border border-slate-100 dark:border-slate-600 hover:border-amber-100 dark:hover:border-amber-900"
            >
              <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              New Summary
            </motion.button>
            <motion.button
              variants={quickActionVariants}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigateToMode(AppMode.HOMEWORK)}
              className="p-4 bg-white dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-xl text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 flex flex-col items-center gap-2 border border-slate-100 dark:border-slate-600 hover:border-emerald-100 dark:hover:border-emerald-900"
            >
              <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Homework Solver
            </motion.button>
            <motion.button
              variants={quickActionVariants}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigateToMode(AppMode.QUIZ)}
              className="p-4 bg-white dark:bg-slate-700/50 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-400 rounded-xl text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 flex flex-col items-center gap-2 border border-slate-100 dark:border-slate-600 hover:border-amber-100 dark:hover:border-amber-900"
            >
              <BrainCircuit className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              New Quiz
            </motion.button>
            <motion.button
              variants={quickActionVariants}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigateToMode(AppMode.TUTOR)}
              className="p-4 bg-white dark:bg-slate-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-400 rounded-xl text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 flex flex-col items-center gap-2 border border-slate-100 dark:border-slate-600 hover:border-purple-100 dark:hover:border-purple-900"
            >
              <MessageCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              Ask Tutor
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Recent Study History */}
        {history.length > 0 && (
          <motion.div variants={sectionVariants} className="mt-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Recent Study History
              </h3>
              <span className="text-xs text-slate-400 font-medium font-mono bg-slate-150 dark:bg-slate-900 px-2.5 py-1 rounded">
                {history.length} items
              </span>
            </div>
            <motion.div variants={dashboardContainerVariants} className="grid gap-3">
              {history.slice(0, 5).map((item) => (
                <motion.div
                  key={item.id}
                  variants={historyItemVariants}
                  whileHover={{ x: 3, transition: { duration: 0.15 } }}
                  onClick={() => loadHistoryItem(item)}
                  className="bg-slate-50/50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-800 shadow-sm hover:shadow-md transition-all duration-300 flex justify-between items-center group cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center bg-primary-50 dark:bg-slate-750 text-primary-600 dark:text-primary-400`}
                    >
                      {item.type === AppMode.QUIZ ? (
                        <BrainCircuit className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      ) : item.type === AppMode.SUMMARY ? (
                        <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      ) : (item.type === AppMode.HOMEWORK || item.type === AppMode.ESSAY) ? (
                        <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <MessageCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-white text-sm group-hover:text-amber-700 dark:group-hover:text-amber-405 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 mt-1">
                        <span className="font-medium bg-slate-200/50 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-350">
                          {getSingularName(item.type)}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const updatedHistory = history.filter(h => h.id !== item.id);
                        setHistory(updatedHistory);
                        const currentUid = user ? user.uid : "guest";
                        localStorage.setItem(`history_${currentUid}`, JSON.stringify(updatedHistory));
                        if (user) {
                          await deleteHistoryItemFromFirestore(user.uid, item.id);
                        }
                        triggerToast("Item Deleted 🗑️", `"${item.title}" was removed from history.`, "Study & Quizzes");
                      }}
                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 rounded-lg transition opacity-80 sm:opacity-0 group-hover:opacity-100"
                      title="Delete study history item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm opacity-60 group-hover:opacity-100 group-hover:text-amber-600 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    );
  };

  const handleAddSharedToMyList = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!sharedContent) return;

    const newItem: HistoryItem = {
      id: "shared-" + (sharedContent.shareId || sharedContent.id || "content") + "-" + Date.now(),
      type: sharedContent.type,
      title: sharedContent.title,
      subtitle: sharedContent.subtitle || `${sharedContent.type} Shared with you`,
      timestamp: Date.now(),
      content: sharedContent.content,
    };

    const success = await saveHistoryItemToFirestore(user.uid, newItem);
    if (success) {
      setHistory(prev => [newItem, ...prev]);
      setIsAddedSharedContent(true);
      triggerToast("Added to List! 📂", "Successfully added to your Study History & Dashboard List!", "Important Alerts");
    } else {
      triggerToast("Save Failed", "Please make sure you are signed in and online.", "Important Alerts");
    }
  };

  const renderContent = () => {
    if (quizNotFoundError) {
      return (
        <div className="max-w-3xl mx-auto mt-20 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
            <div className="text-6xl mb-6 flex justify-center">
              <span role="img" aria-label="sad">😢</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-4">Quiz Not Found</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
              The quiz you are looking for doesn&apos;t exist, has been removed, or the link is incorrect.
            </p>
            <button
              onClick={() => {
                setQuizNotFoundError(false);
                setMode(AppMode.DASHBOARD);
                window.history.pushState({}, document.title, "/");
              }}
              className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg transition active:scale-95"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }
    if (loading) return <LoadingState mode={mode} />;

    switch (mode) {
      case AppMode.DASHBOARD:
        return renderDashboard();

      case AppMode.ID_CARD:
        return (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <IdCardView
              userProfile={userProfile}
              email={user?.email || "Guest User"}
            />
          </div>
        );

      case AppMode.TIMER:
        return null; // Rendered persistently outside switch to prevent unmounting and losing timer state

      case AppMode.SUMMARY:
        if (summaryContent) {
          return (
            <ResultsView
              title={formData.chapterName}
              content={summaryContent}
              type="Summary"
              isLoading={false}
              onBack={() => {
                setSummaryContent("");
                setCurrentHistoryId(null);
                setIsViewingShared(false);
                setSharedContent(null);
              }}
              isViewingShared={isViewingShared}
              onAddToMyList={handleAddSharedToMyList}
              isAddedToList={isAddedSharedContent}
              onSharePublicLink={async (type, title, content) => {
                const classSlug = sanitizeSlug(formData.gradeClass || "general");
                const subjectSlug = sanitizeSlug(formData.subject || "general");
                const chapterSlug = sanitizeSlug(formData.chapterName || type.toLowerCase());                                
                const prefixMap: Record<string, string> = {
                  "Summary": "summary",
                  "Homework Solution": "homework",
                  "Notes": "notes",
                  "Interactive Quiz": "quiz",
                  "Tutor Chat": "tutor"
                };
                const mappedType = prefixMap[type] || type.toLowerCase();
                const customId = `${mappedType}_${classSlug}_${subjectSlug}_${chapterSlug}`;
                const customUrl = `${window.location.origin}/${mappedType}/${classSlug}/${subjectSlug}/${chapterSlug}`;
                const customMessage = `🎓 SJ Tutor AI - ${title} 🎓\nClass: ${formData.gradeClass || "General"}\nSubject: ${formData.subject || "General"}\n\nReview this study content here:`;
                await handleSharePublicLink(type, title, content, customId, customUrl, customMessage);
              }}
            />
          );
        }
        return (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <InputForm
              data={formData}
              mode={AppMode.SUMMARY}
              onChange={handleFormChange}
              onFillSample={handleFillSample}
              lockGradeClass={!userProfile.planType || userProfile.planType === 'Free'}
              userProfile={userProfile}
              onOpenUpgrade={() => setShowPremiumModal(true)}
            />
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 flex items-center gap-2 animate-in slide-in-from-top-2 border border-red-100">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            <button
              onClick={handleGenerate}
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 group"
            >
              <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
              Generate Summary
            </button>
          </div>
        );

      case AppMode.HOMEWORK:
        if (homeworkContent) {
          return (
            <ResultsView
              title={formData.chapterName}
              content={homeworkContent}
              type="Homework Solution"
              isLoading={false}
              onBack={() => {
                setHomeworkContent("");
                setHomeworkFiles([]);
                setCurrentHistoryId(null);
                setIsViewingShared(false);
                setSharedContent(null);
              }}
              isViewingShared={isViewingShared}
              onAddToMyList={handleAddSharedToMyList}
              isAddedToList={isAddedSharedContent}
              onSharePublicLink={async (type, title, content) => {
                const classSlug = sanitizeSlug(formData.gradeClass || "general");
                const subjectSlug = sanitizeSlug(formData.subject || "general");
                const chapterSlug = sanitizeSlug(formData.chapterName || type.toLowerCase());                                
                const prefixMap: Record<string, string> = {
                  "Summary": "summary",
                  "Homework Solution": "homework",
                  "Notes": "notes",
                  "Interactive Quiz": "quiz",
                  "Tutor Chat": "tutor"
                };
                const mappedType = prefixMap[type] || type.toLowerCase();
                const customId = `${mappedType}_${classSlug}_${subjectSlug}_${chapterSlug}`;
                const customUrl = `${window.location.origin}/${mappedType}/${classSlug}/${subjectSlug}/${chapterSlug}`;
                const customMessage = `🎓 SJ Tutor AI - ${title} 🎓\nClass: ${formData.gradeClass || "General"}\nSubject: ${formData.subject || "General"}\n\nReview this study content here:`;
                await handleSharePublicLink(type, title, content, customId, customUrl, customMessage);
              }}
            />
          );
        }
        return (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <InputForm
              data={formData}
              mode={AppMode.HOMEWORK}
              onChange={handleFormChange}
              onFillSample={handleFillSample}
              lockGradeClass={!userProfile.planType || userProfile.planType === 'Free'}
              userProfile={userProfile}
              onOpenUpgrade={() => setShowPremiumModal(true)}
              onFilesUpload={setHomeworkFiles}
              homeworkFiles={homeworkFiles}
            />
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 flex items-center gap-2 animate-in slide-in-from-top-2 border border-red-100">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={
                !formData.subject &&
                homeworkFiles.length === 0 &&
                !formData.homeworkQuery
              }
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:transform-none"
            >
              <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
              Solve Homework
            </button>
          </div>
        );

      case AppMode.QUIZ:
        if (quizData) {
          return (
            <QuizView
              questions={quizData}
              onReset={() => {
                setQuizData(null);
                setExistingQuizScore(undefined);
                setCurrentHistoryId(null);
                setIsViewingShared(false);
                setSharedContent(null);
              }}
              onComplete={handleQuizComplete}
              existingScore={existingQuizScore}
              isViewingShared={isViewingShared}
              onAddToMyList={handleAddSharedToMyList}
              isAddedToList={isAddedSharedContent}
              onSharePublicLink={(type, title, content, customScore) => {
                                const classSlug = sanitizeSlug(formData.gradeClass || "general");
                const subjectSlug = sanitizeSlug(formData.subject || "general");
                const chapterSlug = sanitizeSlug(formData.chapterName || "quiz");
                
                const customId = `quiz_${classSlug}_${subjectSlug}_${chapterSlug}`;
                const customUrl = `${window.location.origin}/quiz/${classSlug}/${subjectSlug}/${chapterSlug}`;
                const scoreText = customScore !== undefined ? ` Score: ${customScore}/${content.length}.` : '';
                const studentNameText = userProfile.displayName ? ` Taken by ${userProfile.displayName}.` : '';
                const quizTitleText = formData.chapterName ? `"${formData.chapterName}"` : title;
                const customMessage = `🎓 SJ Tutor AI - Quiz Results 🎓\nTitle: ${quizTitleText}\nClass: ${formData.gradeClass || "General"}\nSubject: ${formData.subject || "General"}${studentNameText}${scoreText}\n\nChallenge yourself or review results here:`;

                handleSharePublicLink(type, quizTitleText, content, customId, customUrl, customMessage);
              }}
            />
          );
        }
        return (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <InputForm
              data={formData}
              mode={AppMode.QUIZ}
              onChange={handleFormChange}
              onFillSample={handleFillSample}
              lockGradeClass={!userProfile.planType || userProfile.planType === 'Free'}
              userProfile={userProfile}
              onOpenUpgrade={() => setShowPremiumModal(true)}
            />
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 flex items-center gap-2 animate-in slide-in-from-top-2 border border-red-100">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            <button
              onClick={handleGenerate}
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 group"
            >
              <BrainCircuit className="w-5 h-5 group-hover:animate-pulse" />
              Generate Quiz
            </button>
          </div>
        );

      case AppMode.TUTOR:
        return (
          <div className="w-full max-w-7xl mx-auto h-full min-h-0 flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TutorChat
              onDeductCredit={deductCredit}
              currentCredits={userProfile.credits}
              onSharePublicLink={async (type, title, content) => {
                const classSlug = sanitizeSlug(formData.gradeClass || "general");
                const subjectSlug = sanitizeSlug(formData.subject || "general");
                const chapterSlug = sanitizeSlug(formData.chapterName || type.toLowerCase());                                
                const prefixMap: Record<string, string> = {
                  "Summary": "summary",
                  "Homework Solution": "homework",
                  "Notes": "notes",
                  "Interactive Quiz": "quiz",
                  "Tutor Chat": "tutor"
                };
                const mappedType = prefixMap[type] || type.toLowerCase();
                const customId = `${mappedType}_${classSlug}_${subjectSlug}_${chapterSlug}`;
                const customUrl = `${window.location.origin}/${mappedType}/${classSlug}/${subjectSlug}/${chapterSlug}`;
                const customMessage = `🎓 SJ Tutor AI - ${title} 🎓\nClass: ${formData.gradeClass || "General"}\nSubject: ${formData.subject || "General"}\n\nReview this study content here:`;
                await handleSharePublicLink(type, title, content, customId, customUrl, customMessage);
              }}
              onSaveSession={(msgs, sessionTitle, sessionId) => {
                if (msgs.length > 1) {
                  const tutorItemContent = {
                    messages: msgs,
                  };
                  const targetSessionId = sessionId || currentHistoryId || `session_${Date.now()}`;
                  // Check if already in history to update or add
                  const existing = history.find(
                    (h) =>
                      (h.id === targetSessionId || (currentHistoryId && h.id === currentHistoryId)) &&
                      h.type === AppMode.TUTOR,
                  );

                  const derivedTitle = sessionTitle || existing?.title || (formData.chapterName && formData.chapterName !== "Untitled Chapter" ? formData.chapterName : `${formData.subject || "General"} Tutor Session`);

                  if (existing) {
                    const updatedItem: HistoryItem = {
                      ...existing,
                      title: derivedTitle,
                      content: tutorItemContent,
                      timestamp: Date.now(),
                    };
                    setHistory((prev) =>
                      prev.map((h) =>
                        h.id === existing.id
                          ? updatedItem
                          : h,
                      ),
                    );
                    if (currentHistoryId !== existing.id) {
                      setCurrentHistoryId(existing.id);
                    }
                    if (user) {
                      saveHistoryItemToFirestore(user.uid, updatedItem);
                    }
                  } else {
                    const newItem: HistoryItem = {
                      id: targetSessionId,
                      type: AppMode.TUTOR,
                      title: derivedTitle,
                      subtitle: `${formData.gradeClass || userProfile.grade || "General"} • ${formData.subject || "AI Tutor"}`,
                      timestamp: Date.now(),
                      content: tutorItemContent,
                      formData: { ...formData },
                    };
                    setHistory((prev) => [newItem, ...prev.filter((h) => h.id !== targetSessionId)]);
                    setCurrentHistoryId(targetSessionId);
                    if (user) {
                      saveHistoryItemToFirestore(user.uid, newItem);
                    }
                  }
                }
              }}
              initialMessages={
                history.find(
                  (h) => (h.id === currentHistoryId || (!currentHistoryId && h.type === AppMode.TUTOR)) && h.type === AppMode.TUTOR,
                )?.content?.messages
              }
              recentSessions={history.filter((h) => h.type === AppMode.TUTOR)}
              fullHistory={history}
              activeSessionId={currentHistoryId}
              onSelectSession={(id) => setCurrentHistoryId(id)}
              onCreateQuiz={() => setMode(AppMode.QUIZ)}
            />
          </div>
        );

      case AppMode.NOTES:
        return (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <NotesView
              userId={user ? user.uid : null}
              onDeductCredit={deductCredit}
              userProfile={userProfile}
              onOpenUpgrade={() => setShowPremiumModal(true)}
            />
          </div>
        );

      case AppMode.PROFILE:
        return (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ProfileView
              profile={userProfile}
              email={user?.email || "Guest"}
              onSave={(p, r) => handleProfileSave(p, r)}
              isOnboarding={!userProfile.hasCompletedOnboarding}
              onOpenUpgrade={() => setShowPremiumModal(true)}
            />
          </div>
        );

      case AppMode.SETTINGS:
        return (
          <div className="w-full max-w-7xl mx-auto h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsView
              userProfile={userProfile}
              onLogout={handleLogout}
              onNavigateToProfile={() => setMode(AppMode.PROFILE)}
              onOpenPremium={() => setShowPremiumModal(true)}
              onNavigateToLegal={(legalMode) => setMode(legalMode as any)}
              onUpdateProfile={handleProfileSave}
              onOpenShortcuts={() => setShowShortcutsModal(true)}
              onOpenDevices={() => setShowDevicesModal(true)}
              devicesCount={loggedInDevices.length}
              initialTab={settingsInitialTab}
              openPinSetupTab={settingsOpenPinTab}
            />
          </div>
        );

      case AppMode.ABOUT:
        return (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AboutView
              onNavigateToLegal={(legalMode) => setMode(legalMode as any)}
            />
          </div>
        );

      case AppMode.PRIVACY:
        return (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PrivacyPolicyView onBack={() => {
              setMode(user ? AppMode.SETTINGS : AppMode.DASHBOARD);
              window.history.pushState({}, '', '/');
            }} />
          </div>
        );

      case AppMode.TERMS:
        return (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TermsOfServiceView onBack={() => {
              setMode(user ? AppMode.SETTINGS : AppMode.DASHBOARD);
              window.history.pushState({}, '', '/');
            }} />
          </div>
        );

      case AppMode.NOTIFICATIONS:
        return (
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <NotificationsView onNavigateToGroupInvite={handleNavigateToGroupInvite} />
          </div>
        );

      case AppMode.GROUPS:
        return (
          <div className="w-full h-full min-h-0 flex-1 flex flex-col max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <GroupsView
              userProfile={userProfile}
              userUid={user ? user.uid : null}
              onNavigateToNotes={() => setMode(AppMode.NOTES)}
              onOpenAuthModal={() => setShowAuthModal(true)}
              onStartDirectCall={(call) => {
                setActiveDirectCall(call);
              }}
              onStartOrJoinGroupCall={(group, type) => {
                const myUid = user ? user.uid : 'guest';
                const myName = userProfile.displayName || 'Scholar User';
                setActiveGroupCall({
                  id: group.id,
                  groupId: group.id,
                  groupName: group.name,
                  hostUid: myUid,
                  hostName: myName,
                  type,
                  startedAt: Date.now(),
                  status: 'active',
                  participants: {
                    [myUid]: {
                      uid: myUid,
                      displayName: myName,
                      photoURL: userProfile.photoURL || '',
                      joinedAt: Date.now(),
                      isMuted: false,
                      isVideoOff: type === 'audio',
                      isScreenSharing: false,
                      isHandRaised: false,
                      role: 'host',
                    }
                  }
                });
              }}
              activeGroupCall={activeGroupCall}
            />
          </div>
        );

      case AppMode.GROUP_INVITE:
        return (
          <div className="w-full h-full min-h-0 flex-1 flex flex-col max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {pendingGroupInvite && user ? (
              <GroupInviteView
                groupId={pendingGroupInvite.groupId}
                inviterName={pendingGroupInvite.inviterName}
                groupName={pendingGroupInvite.groupName}
                currentUserId={user.uid}
                currentUserDisplayName={userProfile.displayName || 'User'}
                onAccept={() => {
                  setPendingGroupInvite(null);
                  setMode(AppMode.GROUPS);
                }}
                onDecline={() => {
                  setPendingGroupInvite(null);
                  setMode(AppMode.DASHBOARD);
                }}
                onBack={() => setMode(AppMode.DASHBOARD)}
              />
            ) : (
              <div className="p-12 text-center text-slate-500">Invalid invitation link.</div>
            )}
          </div>
        );

      case AppMode.SHARED_CONTENT:
        return (
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SharedContentView
              userId={user ? user.uid : null}
              onSelectSharedItem={(shareId) => setPublicShareId(shareId)}
            />
          </div>
        );

      default:
        return renderDashboard();
    }
  };

  if (publicShareId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-white selection:bg-primary-100 transition-colors duration-300">
        <PublicShareViewer
          shareId={publicShareId}
          onGoToApp={() => {
            window.history.pushState({}, document.title, "/");
            setPublicShareId(null);
            setMode(AppMode.DASHBOARD);
          }}
        />
        {showAuthModal && (
          <Auth
            onClose={() => setShowAuthModal(false)}
            onSignUpSuccess={handleSignUpSuccess}
            onCountryDetected={setDetectedCountry}
            initialMode={authModalMode}
          />
        )}
      </div>
    );
  }

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-primary-50 dark:bg-slate-900 flex items-center justify-center flex-col gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-500 animate-bounce">
            <Logo className="w-full h-full" iconOnly noBorder />
          </div>
          <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary-500 rounded-full animate-ping"></div>
        </div>
        <p className="text-slate-800 dark:text-white font-bold animate-pulse">
          Loading...
        </p>
      </div>
    );
  }

  if (!user) {
    // If we have shared content loaded or viewing public pages, show it in a public layout
    const hasSharedContent = summaryContent || homeworkContent || quizData;
    const isPublicPage =
      mode === AppMode.ABOUT ||
      mode === AppMode.PRIVACY ||
      mode === AppMode.TERMS;

    if (hasSharedContent || isPublicPage) {
      return (
        <div className="min-h-screen app-custom-bg font-sans text-slate-900 dark:text-slate-100">
          <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-14 flex items-center justify-between px-5 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-primary-500 shadow-sm flex-shrink-0 bg-white dark:bg-slate-800">
                <Logo className="w-full h-full" iconOnly noBorder />
              </div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                SJ Tutor AI
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuthModal('signin')}
                className="px-3 py-1.5 text-slate-600 dark:text-slate-300 text-xs font-bold hover:text-slate-950 dark:hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuthModal('signup')}
                className="px-4 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors"
              >
                Sign Up
              </button>
            </div>
          </header>
          <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
            {isViewingShared && sharedContent ? (
              <SharedLockScreen
                type={sharedContent.type === AppMode.SUMMARY ? 'Summary' : sharedContent.type === AppMode.QUIZ ? 'Interactive Quiz' : 'Homework Solution'}
                title={sharedContent.title}
                subtitle={sharedContent.subtitle || 'AI Generated Study Guide'}
                teaser={
                  typeof sharedContent.content === 'string'
                    ? sharedContent.content.substring(0, 160) + '...'
                    : Array.isArray(sharedContent.content)
                    ? `This interactive practice quiz contains ${sharedContent.content.length} tailored challenges on ${sharedContent.title}.`
                    : 'Personalized interactive study prep.'
                }
                onAuthenticate={() => openAuthModal('signup')}
              />
            ) : (
              renderContent()
            )}
          </main>
          {showAuthModal && (
            <Auth
              onClose={() => setShowAuthModal(false)}
              onSignUpSuccess={handleSignUpSuccess}
              onCountryDetected={setDetectedCountry}
              initialMode={authModalMode}
            />
          )}
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans selection:bg-primary-100 selection:text-primary-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <LandingPage
          onGetStarted={(mode) => openAuthModal(mode)}
          countryCode={detectedCountry}
          onNavigateToLegal={(legalMode) => {
            setMode(legalMode as any);
            window.history.pushState({}, '', legalMode === 'PRIVACY' ? '/privacy' : '/terms');
          }}
        />
        {showAuthModal && (
          <Auth
            onClose={() => setShowAuthModal(false)}
            onSignUpSuccess={handleSignUpSuccess}
            onCountryDetected={setDetectedCountry}
            initialCountry={detectedCountry}
            initialMode={authModalMode}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen app-custom-bg font-sans selection:bg-primary-100 selection:text-primary-900 flex text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out ${isExpanded ? "w-64 translate-x-0" : "w-0 -translate-x-full lg:translate-x-0 lg:w-[72px] lg:border-r overflow-hidden"} shadow-2xl lg:shadow-none`}
      >
        <div className="h-full flex flex-col w-full overflow-hidden">
          <div
            className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isExpanded ? "p-5" : "flex justify-center"}`}
            onClick={() => {
              if (!isExpanded) {
                setIsSidebarOpen(true);
              } else {
                setMode(AppMode.DASHBOARD);
                setDashboardView("OVERVIEW");
                setSummaryContent("");
                setHomeworkContent("");
                setHomeworkFiles([]);
                setQuizData(null);
                setExistingQuizScore(undefined);
                setCurrentHistoryId(null);
                setError(null);
                const settings = SettingsService.getSettings();
                setFormData({
                  ...INITIAL_FORM_DATA,
                  language:
                    settings.learning.language || INITIAL_FORM_DATA.language,
                  gradeClass: userProfile.grade || INITIAL_FORM_DATA.gradeClass,
                });
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
              }
            }}
            title={!isExpanded ? "Expand Sidebar" : "Go to Dashboard"}
          >
            {isExpanded ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-500 shadow-md flex-shrink-0 bg-white dark:bg-slate-800">
                    <Logo className="w-full h-full" iconOnly noBorder />
                  </div>
                  <div className="truncate">
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                      SJ Tutor AI
                    </h1>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider truncate">
                      AI Study Buddy
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSidebarOpen(false);
                    setIsSidebarHovered(false);
                  }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 transition-all flex-shrink-0"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-500 shadow-md flex-shrink-0 bg-white dark:bg-slate-800 flex items-center justify-center animate-pulse">
                <Logo className="w-full h-full" iconOnly noBorder />
              </div>
            )}
          </div>

          <div className={`flex-1 overflow-y-auto py-5 ${isExpanded ? "px-3" : "px-2"} space-y-1 custom-scrollbar`}>
            {navItems.map((item) => {
              const isActive = mode === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (
                      item.id !== AppMode.DASHBOARD &&
                      !user
                    ) {
                      setShowAuthModal(true);
                      setIsSidebarOpen(false);
                    } else {
                      navigateToMode(item.id);
                      if (window.innerWidth < 1024) {
                        setIsSidebarOpen(false);
                      }
                    }
                  }}
                  title={!isExpanded ? item.label : undefined}
                  className={`w-full flex items-center ${isExpanded ? "gap-3 px-3" : "justify-center px-2"} py-2.5 rounded-lg transition-all duration-200 group text-sm ${
                    isActive
                      ? "bg-primary-50 dark:bg-slate-800 text-primary-700 dark:text-primary-400 font-semibold shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary-600 dark:text-primary-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}
                  />
                  {isExpanded && <span className="truncate">{item.label}</span>}
                  {isExpanded && !user &&
                    item.id !== AppMode.DASHBOARD && (
                      <div className="ml-auto flex-shrink-0">
                        <ArrowLeft className="w-3 h-3 text-slate-300 rotate-180" />
                      </div>
                    )}
                </button>
              );
            })}
          </div>

          <div className={`p-3 border-t border-slate-100 dark:border-slate-800 ${isExpanded ? "space-y-2" : "space-y-3 flex flex-col items-center"}`}>
            {user ? (
              <>
                <button
                  onClick={() => setMode(AppMode.PROFILE)}
                  title={!isExpanded ? (userProfile.displayName || "Profile") : undefined}
                  className={`w-full flex items-center ${isExpanded ? "gap-2 px-3 py-2" : "justify-center p-2"} rounded-lg transition-all ${mode === AppMode.PROFILE ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                >
                  <div className="relative w-8 h-8 flex-shrink-0">
                    <svg className="absolute inset-x-[-2px] inset-y-[-2px] w-[calc(100%+4px)] h-[calc(100%+4px)] -rotate-90">
                      <circle
                        cx="18"
                        cy="18"
                        r="17"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-slate-100 dark:text-slate-800"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="17"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray={106.8}
                        strokeDashoffset={
                          106.8 -
                          (106.8 * calculateProfileCompletion(userProfile)) /
                            100
                        }
                        className="text-primary-600 dark:text-primary-400 transition-all duration-1000"
                      />
                    </svg>
                    <div className="relative w-full h-full rounded-full bg-primary-100 dark:bg-slate-700 border border-primary-200 dark:border-slate-600 flex items-center justify-center overflow-hidden">
                      {userProfile.photoURL ? (
                        <img
                          src={userProfile.photoURL}
                          alt="User"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-primary-700 dark:text-primary-400 text-[10px]">
                          {(userProfile.displayName || user.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="flex-1 text-left overflow-hidden">
                      <p className="text-xs font-medium truncate text-slate-800 dark:text-white">
                        {userProfile.displayName || "Scholar"}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  title={!isExpanded ? "Sign Out" : undefined}
                  className={`w-full flex items-center justify-center ${isExpanded ? "gap-2 px-3 py-2 text-xs" : "p-2"} font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors`}
                >
                  <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                  {isExpanded && <span>Sign Out</span>}
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                title={!isExpanded ? "Sign In" : undefined}
                className={`w-full flex items-center justify-center ${isExpanded ? "py-2.5 text-sm" : "p-2.5"} bg-slate-900 dark:bg-slate-700 text-white rounded-lg font-medium shadow-lg shadow-slate-900/20 hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors`}
              >
                {isExpanded ? "Sign In" : <UserIcon className="w-4 h-4 flex-shrink-0" />}
              </button>
            )}

            {user && (
              <button
                onClick={() => setShowPremiumModal(true)}
                title={!isExpanded ? (userProfile.planType && userProfile.planType !== 'Free' ? "Membership Plans" : "Upgrade Plan") : undefined}
                className={`w-full flex items-center justify-center ${isExpanded ? "py-2 gap-1.5 text-xs font-bold" : "p-2"} bg-gradient-to-r from-amber-200 to-yellow-400 hover:from-amber-300 hover:to-yellow-500 text-amber-900 rounded-lg shadow-sm transition-all`}
              >
                <Crown className="w-3.5 h-3.5 flex-shrink-0" />
                {isExpanded && <span>{userProfile.planType && userProfile.planType !== 'Free' ? "Membership Plan" : "Upgrade Plan"}</span>}
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-14 flex items-center justify-between px-5 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className={`${isSidebarOpen ? "lg:hidden" : "block"} p-1.5 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all`}
              title="Open Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">
              {mode === AppMode.DASHBOARD
                ? "SJ Tutor AI"
                : navItems.find((n) => n.id === mode)?.label || "SJ Tutor AI"}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleThemeToggle}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors hidden sm:block"
              title="Toggle Theme"
            >
              <Moon className="w-5 h-5 hidden dark:block" />
              <Sun className="w-5 h-5 block dark:hidden" />
            </button>

            {/* Devices Logged In Button */}
            {user && (
              <DevicesHeaderButton 
                devices={loggedInDevices} 
                onClick={() => setShowDevicesModal(true)} 
              />
            )}

            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifDropdown(!showNotifDropdown);
                }}
                className={`p-2 rounded-full transition-all relative border ${
                  mode === AppMode.NOTIFICATIONS
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                }`}
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 px-1.5 py-0.5 text-[8px] font-black bg-rose-500 text-white border border-white dark:border-slate-900 rounded-full min-w-[16px] text-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <NotificationDropdown
                  onClose={() => setShowNotifDropdown(false)}
                  onNavigateToAll={() => {
                    setMode(AppMode.NOTIFICATIONS);
                    setDashboardView("OVERVIEW");
                  }}
                />
              )}
            </div>

            <button
              onClick={() => setShowQRScanner(true)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
              title="Scan Student ID"
            >
              <QrCode className="w-5 h-5" />
            </button>

            <TrialHeaderBadge 
              userProfile={userProfile} 
              uid={user?.uid} 
              onOpenUpgrade={() => setShowPremiumModal(true)} 
            />
          </div>
        </header>

        <div className={`flex-1 min-h-0 ${mode === AppMode.GROUPS || mode === AppMode.GROUP_INVITE || mode === AppMode.TUTOR ? 'p-2 sm:p-4 lg:p-5 overflow-hidden flex flex-col' : 'overflow-y-auto p-4 sm:p-5 lg:p-6 custom-scrollbar'}`}>
          <div className="w-full h-full min-h-0 flex-1 flex flex-col">
            <div style={{ display: mode === AppMode.TIMER ? "block" : "none" }}>
              <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <StudyTimerView 
                  userProfile={userProfile} 
                  userId={user ? user.uid : null} 
                  userEmail={user ? user.email : null} 
                />
              </div>
            </div>
            {renderContent()}
          </div>
        </div>
      </main>

      {showAuthModal && (
        <Auth
          onClose={() => setShowAuthModal(false)}
          onSignUpSuccess={handleSignUpSuccess}
          onCountryDetected={setDetectedCountry}
          initialMode={authModalMode}
        />
      )}

      {showPremiumModal && (
        <PremiumModal
          onClose={() => setShowPremiumModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
          userProfile={userProfile}
          uid={user?.uid}
        />
      )}

      <FloatingStreakWidget
        userProfile={userProfile}
        onProfileUpdate={handleProfileSave}
      />

      <AnimatePresence>
        {showTutorial && !userProfile.isRegisteredInFirestore && <Tutorial onClose={handleTutorialClose} />}
      </AnimatePresence>

      <AnimatePresence>
        {showQRScanner && <QRScanner onClose={() => setShowQRScanner(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showCompletionReminder && mode !== AppMode.PROFILE && !userProfile.isRegisteredInFirestore && !userProfile.hasCompletedOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div
              key="profile-reminder-content"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-w-md w-full border border-slate-200 dark:border-slate-800"
            >
              <div className="relative h-32 bg-primary-600 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12 blur-xl"></div>
                </div>
                <div className="relative w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center shadow-xl">
                  <UserIcon className="w-10 h-10 text-white" />
                  <svg className="absolute inset-x-[-4px] inset-y-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] -rotate-90">
                    <circle
                      cx="44"
                      cy="44"
                      r="42"
                      fill="transparent"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="4"
                    />
                    <circle
                      cx="44"
                      cy="44"
                      r="42"
                      fill="transparent"
                      stroke="white"
                      strokeWidth="4"
                      strokeDasharray={263.89}
                      strokeDashoffset={
                        263.89 -
                        (263.89 * calculateProfileCompletion(userProfile)) / 100
                      }
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                </div>
              </div>

              <div className="p-8 text-center">
                <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Complete Your Profile
                </h4>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  You&apos;re only{" "}
                  <span className="font-bold text-primary-600 dark:text-primary-400">
                    {100 - calculateProfileCompletion(userProfile)}%
                  </span>{" "}
                  away from a fully personalized AI experience.
                </p>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Completion Status
                    </span>
                    <span className="text-xs font-black text-primary-600 italic">
                      {calculateProfileCompletion(userProfile)}%
                    </span>
                  </div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary-600"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${calculateProfileCompletion(userProfile)}%`,
                      }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      if (user) {
                        localStorage.setItem(`profile_reminder_dismissed_${user.uid}`, "true");
                      }
                      setMode(AppMode.PROFILE);
                      setShowCompletionReminder(false);
                    }}
                    className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    Complete Profile Now
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (user) {
                        localStorage.setItem(`profile_reminder_dismissed_${user.uid}`, "true");
                      }
                      setShowCompletionReminder(false);
                    }}
                    className="w-full py-3 text-slate-400 dark:text-slate-500 font-medium hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {shareSuccessModal?.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <span className="text-4xl" role="img" aria-label="success">🎉</span>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-white mt-3 mb-1">
                Public Link Created Successfully
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">
                SJ Tutor AI Sharing
              </p>
              
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex flex-col gap-1 text-left mb-6">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Title</span>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-350 truncate">{shareSuccessModal.title}</p>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mt-1.5">Resource Type</span>
                <p className="text-[10px] font-mono font-extrabold text-primary-500 uppercase">{shareSuccessModal.type}</p>
              </div>

              <p className="text-xs text-slate-400 dark:text-slate-400 text-left mb-2 font-semibold">Share with anyone:</p>
              <div className="flex items-center gap-1.5 p-2.5 bg-slate-100 dark:bg-slate-950 rounded-xl mb-6 border border-slate-200/50 dark:border-slate-800">
                <input
                  type="text"
                  readOnly
                  value={shareSuccessModal.customUrl || `${window.location.origin}/share/${shareSuccessModal.shareId}`}
                  className="bg-transparent text-[11px] text-slate-650 dark:text-slate-400 w-full focus:outline-none select-all font-mono"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={async () => {
                    const link = shareSuccessModal.customUrl || `${window.location.origin}/share/${shareSuccessModal.shareId}`;
                    console.log("[SHARE AUDIT] Copying link from modal click:", link);
                    try {
                      await navigator.clipboard.writeText(link);
                      triggerToast("Link copied!", "The share link was copied to your clipboard.", "Important Alerts");
                    } catch (err) {
                      console.error("[SHARE AUDIT] Fallback copy inside Modal failed:", err);
                      triggerToast("Copy Failed", `Please manually select and copy the text box: ${link}`, "Important Alerts");
                    }
                  }}
                  className="py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </button>
                
                <button
                  onClick={() => {
                    const relativeLink = shareSuccessModal.customUrl || `/share/${shareSuccessModal.shareId}`;
                    console.log("[SHARE AUDIT] Opening share link in new tab:", relativeLink);
                    window.open(relativeLink, "_blank");
                  }}
                  className="py-3 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200/60 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Open Link</span>
                </button>

                <button
                  onClick={() => setShareSuccessModal(null)}
                  className="py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold mt-2"
                >
                  Dismiss & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        onNavigateToLegal={(legalMode) => setMode(legalMode as any)}
      />

      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      <DevicesModal
        isOpen={showDevicesModal}
        onClose={() => setShowDevicesModal(false)}
        devices={loggedInDevices}
        userId={user ? user.uid : null}
        onLogoutCurrentDevice={handleLogout}
        onLogoutAllDevices={handleLogoutAllDevices}
        onTriggerToast={triggerToast}
      />

      {/* Global 1-on-1 & Group Audio/Video Calling Engine */}
      {(activeDirectCall || incomingDirectCall || activeGroupCall) && (
        <CallModal
          currentUser={{
            uid: user ? user.uid : 'guest_user',
            displayName: userProfile.displayName || 'Scholar User',
            photoURL: userProfile.photoURL || '',
          }}
          activeDirectCall={activeDirectCall}
          incomingDirectCall={incomingDirectCall}
          onCloseDirectCall={() => {
            setActiveDirectCall(null);
            setIncomingDirectCall(null);
          }}
          activeGroupCall={activeGroupCall}
          onCloseGroupCall={() => {
            setActiveGroupCall(null);
          }}
          onDirectCallAccepted={(call) => {
            setIncomingDirectCall(null);
            setActiveDirectCall(call);
          }}
          triggerToast={triggerToast}
        />
      )}

      {/* 1. Two-Step Verification on Login Modal */}
      {user && !isTwoStepVerified && (
        <TwoStepLoginModal
          userProfile={userProfile}
          uid={user.uid}
          onVerifySuccess={() => {
            SecurityPinService.setTwoStepVerified(user.uid);
            setIsTwoStepVerified(true);
          }}
          onLogout={handleLogout}
          onUpdateProfile={async (updated) => {
            setUserProfile((prev) => ({ ...prev, ...updated }));
            if (user) {
              await saveProfileToFirestore(user.uid, updated);
            }
          }}
        />
      )}

      {/* 2. Security PIN Lock Screen on Refresh / Website Visit */}
      {user && isTwoStepVerified && !isPinSessionUnlocked && (!!userProfile.pinLockEnabled || !!userProfile.securityPin || !!SettingsService.getSettings().privacy.pinLock || !!SettingsService.getSettings().privacy.pin) && (
        <SecurityPinLockScreen
          userProfile={userProfile}
          uid={user.uid}
          onUnlock={() => {
            SecurityPinService.setSessionUnlocked(user.uid);
            setIsPinSessionUnlocked(true);
          }}
          onLogout={handleLogout}
          onUpdateProfile={async (updated) => {
            setUserProfile((prev) => ({ ...prev, ...updated }));
            if (user) {
              await saveProfileToFirestore(user.uid, updated);
            }
          }}
        />
      )}
    </div>
  );
};

export default App;
