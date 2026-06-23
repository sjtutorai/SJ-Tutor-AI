import React, { useState, useEffect, useRef } from "react";
import {
  AppMode,
  StudyRequestData,
  INITIAL_FORM_DATA,
  QuizQuestion,
  HistoryItem,
  UserProfile,
  SJTUTOR_AVATAR,
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
import NotesView from "./components/NotesView";
import SettingsView from "./components/SettingsView";
import AboutView from "./components/AboutView";
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
import { SharedContentView } from "./components/SharedContentView";
import { PublicShareViewer } from "./components/PublicShareViewer";
import {
  saveProfileToFirestore,
  getProfileFromFirestore,
  saveHistoryItemToFirestore,
  syncHistoryWithFirestore,
  createSharedContent,
  getSharedContent,
} from "./utils/firebaseUtils";
import Logo from "./components/Logo";
import { GeminiService } from "./services/geminiService";
import { SettingsService } from "./services/settingsService";
import { auth } from "./firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import {
  FileText,
  BrainCircuit,
  MessageCircle,
  Sparkles,
  AlertCircle,
  Menu,
  ChevronRight,
  LayoutDashboard,
  ArrowLeft,
  Calendar,
  LogOut,
  Zap,
  Crown,
  Plus,
  Clock,
  Settings,
  Share2,
  CreditCard,
  QrCode,
  Eye,
  BookOpen,
  User as UserIcon,
  Bell,
  Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GenerateContentResponse } from "@google/genai";

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
  const { unreadCount, requestPermission, sendNotification } = useNotifications();
  const { recordActivity } = useStreak();

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
  const [isNewUser, setIsNewUser] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showCompletionReminder, setShowCompletionReminder] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(() => {
    return localStorage.getItem("hasSeenTutorial") === "true";
  });

  // App State
  const [publicShareId, setPublicShareId] = useState<string | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith("/share/")) {
      const rawId = path.substring(7);
      return rawId.endsWith("/") ? rawId.slice(0, -1) : rawId;
    }
    const params = new URLSearchParams(window.location.search);
    const paramVal = params.get("share");
    return paramVal ? (paramVal.endsWith("/") ? paramVal.slice(0, -1) : paramVal) : null;
  });

  const [shareSuccessModal, setShareSuccessModal] = useState<{
    isOpen: boolean;
    shareId: string;
    title: string;
    type: string;
  } | null>(null);

  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);

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

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  const [summaryContent, setSummaryContent] = useState("");
  const [homeworkContent, setHomeworkContent] = useState("");
  const [homeworkImages, setHomeworkImages] = useState<string[]>([]);
  const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
  const [existingQuizScore, setExistingQuizScore] = useState<
    number | undefined
  >(undefined);

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

  // Helper for navigation with form pre-fill
  const navigateToMode = (newMode: AppMode) => {
    setMode(newMode);
    setDashboardView("OVERVIEW");
    setSummaryContent("");
    setHomeworkContent("");
    setHomeworkImages([]);
    setQuizData(null);
    setExistingQuizScore(undefined);
    setCurrentHistoryId(null);
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

  // Check for shared content on load
  useEffect(() => {
    const shareId = publicShareId;

    if (shareId) {
      const fetchShared = async () => {
        setAuthLoading(true);
        setIsAddedSharedContent(false);
        try {
          // 1. Try loading directly from Firestore first (primary ground truth)
          let item = await getSharedContent(shareId);
          
          // 2. Fallback to server API if not found in Firestore
          if (!item) {
            try {
              const response = await fetch(`/api/auth/share/${shareId}`);
              const data = await response.json();
              if (response.ok && data.success) {
                item = data.data;
              }
            } catch (apiErr) {
              console.warn("Shared API route fallback failed:", apiErr);
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
          }
        } catch (err) {
          console.error("Failed to fetch shared content", err);
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
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
        clearTimeout(timeoutId);

        if (!currentUser) {
          setIsNewUser(false);
          setUserProfile(initialProfileState);
          setMode(AppMode.DASHBOARD);
        }
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
        setShowTutorial(true);
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

      const initialProfile = {
        ...initialProfileState,
        credits: 100,
        ...cached,
        displayName: (cached && cached.displayName) || user.displayName || "",
        photoURL: (cached && cached.photoURL) || user.photoURL || "",
      };

      // Set user profile instantly to avoid blocking or lagging perceived speed!
      setUserProfile(initialProfile);

      // Check profile completion to trigger alerts/notifications (once per hour to avoid spamming)
      const cachedCompletion = calculateProfileCompletion(initialProfile);
      const isDismissedPrompt = localStorage.getItem(`profile_reminder_dismissed_${user.uid}`) === "true";
      if (cachedCompletion < 100 && !isDismissedPrompt) {
        setTimeout(() => {
          setShowCompletionReminder(true);
        }, 2000);

        const profileNotifKey = `profile_notif_sent_${user.uid}`;
        const lastSentProfileNotif = localStorage.getItem(profileNotifKey);
        const oneHourMs = 60 * 60 * 1000;
        if (!lastSentProfileNotif || now - parseInt(lastSentProfileNotif) > oneHourMs) {
          sendNotification(
            "Profile Incomplete 📋",
            "Complete your learning profile details to unlock personalized recommendations, custom study tools, and claim 10 bonus credits!",
            "Important Alerts",
            user.uid
          ).catch((e) => console.warn("Failed to send profile incomplete notification:", e));
          localStorage.setItem(profileNotifKey, now.toString());
        }
      }

      // Revalidate / Sync from Firestore in the background
      const loadProfileFromDb = async () => {
        try {
          const firestoreProfile = await getProfileFromFirestore(user.uid);
          if (firestoreProfile) {
            const merged = {
              ...initialProfileState,
              credits: 100,
              ...cached,
              ...firestoreProfile,
              displayName: firestoreProfile.displayName || (cached && cached.displayName) || user.displayName || "",
              photoURL: firestoreProfile.photoURL || (cached && cached.photoURL) || user.photoURL || "",
            };
            setUserProfile(merged);
            localStorage.setItem(`profile_${user.uid}`, JSON.stringify(merged));
          }
        } catch (err) {
          console.warn("Background profile sync failed:", err);
        }
      };

      loadProfileFromDb();
    }
  }, [user, sendNotification]);

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

      if (user) {
        try {
          // Sync with Firestore, merging both local and remote items
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
      } else {
        if (active) {
          setHistory(initialHistory);
          setHistoryLoadedUid("guest");
        }
      }
    };

    loadAndSyncHistory();

    // Setup 30-seconds sync timer to seamlessly match history across devices
    let syncInterval: NodeJS.Timeout | null = null;
    if (user) {
      syncInterval = setInterval(() => {
        loadAndSyncHistory();
      }, 30000);
    }

    return () => {
      active = false;
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [user]);

  useEffect(() => {
    const currentUid = user ? user.uid : "guest";
    if (historyLoadedUid !== currentUid) return;
    localStorage.setItem(`history_${currentUid}`, JSON.stringify(history));
  }, [history, user, historyLoadedUid]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleProfileSave = async (
    newProfile: UserProfile,
    redirectDashboard = false,
  ) => {
    setUserProfile(newProfile);
    if (user) {
      localStorage.setItem(`profile_${user.uid}`, JSON.stringify(newProfile));
      await saveProfileToFirestore(user.uid, newProfile);
    }
    if (isNewUser) {
      setIsNewUser(false);
      setShowAuthModal(false);
      if (redirectDashboard) {
        setMode(AppMode.DASHBOARD);
      }
    }
  };

  const handleSignUpSuccess = async (initialData?: Partial<UserProfile>) => {
    setIsNewUser(true);
    const newProfile = { ...initialProfileState, ...initialData };
    setUserProfile(newProfile);

    if (auth.currentUser) {
      localStorage.setItem(
        `profile_${auth.currentUser.uid}`,
        JSON.stringify(newProfile),
      );
      await saveProfileToFirestore(auth.currentUser.uid, newProfile);
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

  const handleSharePublicLink = async (type: string, title: string, content: any) => {
    try {
      const uid = user ? user.uid : "guest";
      const shareId = await createSharedContent(type, title, content, uid);
      const shareLink = `${window.location.origin}/share/${shareId}`;
      try {
        await navigator.clipboard.writeText(shareLink);
      } catch {
        console.warn("Clipboard copy blocked or unsupported, user can copy from modal");
      }
      setShareSuccessModal({
        isOpen: true,
        shareId,
        title,
        type,
      });
    } catch (error) {
      console.error("Failed to share publicly:", error);
      alert("Sharing failed. Please try again.");
    }
  };

  const handleQuizComplete = (score: number) => {
    if (currentHistoryId) {
      const historyItem = history.find((item) => item.id === currentHistoryId);
      if (!historyItem) return;

      const updatedItem = { ...historyItem, score };
      setHistory((prev) =>
        prev.map((item) =>
          item.id === currentHistoryId ? updatedItem : item,
        ),
      );

      if (user) {
        saveHistoryItemToFirestore(user.uid, updatedItem);
      }

      // Record active quiz completion sequence
      recordActivity().then((res) => {
        if (res.success && res.incremented) {
          if (res.milestoneReached) {
            setTimeout(() => {
              alert(`🎉 STREAK MILESTONE REACHED! 🎉\n\nYou have completed ${res.milestoneReached} consecutive learning days on SJ Tutor AI!\n\nOpen the Streak Widget on your screen to claim your Reward in learning credits!`);
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
            alert(
              `🏆 ACADEMIC EXCELLENCE! 🏆\n\nYou scored ${percentage}% on your quiz!\n\nAs a reward, we've refunded ${refundAmount} credits (50% of your spent credits) back to your account. Keep it up!`,
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
          alert(
            `🎉 CHALLENGE MASTERED! 🎉\n\nYou scored ${score}/${qCount} (${percentage}%) and earned ${bonus} credits!`,
          );
        }, 1000);
      } else if (
        historyItem.formData.questionCount === 10 &&
        historyItem.formData.difficulty === "Hard" &&
        percentage < 75
      ) {
        setTimeout(() => {
          alert(
            `Challenge Attempted: You scored ${percentage}%. Score 75% or higher to earn the 50 credit bonus! Keep practicing!`,
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
    if (userProfile.credits < cost) {
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
          homeworkImages,
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
      let shareUrl = window.location.origin;
      try {
        const uid = user ? user.uid : "guest";
        const shareId = await createSharedContent(
          item.type,
          item.title,
          item.content,
          uid
        );
        shareUrl = `${window.location.origin}/share/${shareId}`;
      } catch (e) {
        console.warn(
          "Firestore sharing failed, failing over to base URL",
          e,
        );
      }

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
          // Fallback to clipboard if share fails or is cancelled
        }
      } else {
        try {
          await navigator.clipboard.writeText(text);
          alert("Share link copied to clipboard!");
        } catch {
          alert("Failed to copy content.");
        }
      }
    } catch (err: any) {
      console.error(err);
      alert("Sharing failed: " + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMode(AppMode.DASHBOARD);
      setDashboardView("OVERVIEW");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const navItems = [
    { id: AppMode.DASHBOARD, label: "Dashboard", icon: LayoutDashboard },
    { id: AppMode.ID_CARD, label: "Student ID Card", icon: CreditCard },
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

    if (dashboardView !== "OVERVIEW") {
      const filteredHistory = history.filter((h) => 
        h.type === dashboardView || 
        (dashboardView === AppMode.HOMEWORK && h.type === AppMode.ESSAY)
      );
      const categoryLabel =
        dashboardCards.find((c) => c.id === dashboardView)?.label || "History";
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

      return (
        <div className="relative z-10 animate-in fade-in slide-in-from-right-8 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
          <button
            onClick={() => setDashboardView("OVERVIEW")}
            className="flex items-center text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 mb-6 transition-all hover:-translate-x-1 group text-sm"
          >
            <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mr-2 border border-slate-100 dark:border-slate-700 group-hover:border-primary-200 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium">Back to Dashboard</span>
          </button>

          <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary-400" />
            {categoryLabel} History
          </h3>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-20 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-xl border border-slate-200/60 dark:border-slate-700 border-dashed animate-in zoom-in duration-500">
              <div className="w-16 h-16 bg-primary-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary-100 dark:border-slate-600 p-1">
                <Logo className="w-full h-full" iconOnly />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-5 text-sm">
                No {categoryLabel.toLowerCase()} found yet.
              </p>

              <button
                onClick={() => {
                  setSummaryContent("");
                  setHomeworkContent("");
                  setHomeworkImages([]);
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
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredHistory.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-5 rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 flex justify-between items-center group cursor-pointer"
                  style={{ animationDelay: `${idx * 50}ms` }}
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleShareHistoryItem(e, item)}
                      className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-primary-50 hover:text-primary-600"
                      title="Share"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <Eye className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full h-full">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              Welcome back, {userProfile.displayName || "Scholar"}! 👋
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Ready to learn something new today?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {dashboardCards.map((card) => (
            <button
              key={card.id}
              onClick={() => {
                if (card.id === AppMode.ID_CARD && !user) {
                  setShowAuthModal(true);
                  return;
                }

                if (card.id === AppMode.NOTES) {
                  setMode(AppMode.NOTES);
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
                  <span className="text-2xl font-bold text-slate-800 dark:text-white">
                    {card.count}
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1 relative z-10">
                {card.label}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors flex items-center gap-1 relative z-10">
                View Details <ChevronRight className="w-3 h-3" />
              </p>
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-in slide-in-from-bottom-6 duration-700">
          <h3 className="font-bold text-slate-800 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => navigateToMode(AppMode.SUMMARY)}
              className="p-4 bg-white dark:bg-slate-700/50 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-400 rounded-xl text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 flex flex-col items-center gap-2 border border-slate-100 dark:border-slate-600 hover:border-amber-100 dark:hover:border-amber-900"
            >
              <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              New Summary
            </button>
            <button
              onClick={() => navigateToMode(AppMode.HOMEWORK)}
              className="p-4 bg-white dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-xl text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 flex flex-col items-center gap-2 border border-slate-100 dark:border-slate-600 hover:border-emerald-100 dark:hover:border-emerald-900"
            >
              <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Homework Solver
            </button>
            <button
              onClick={() => navigateToMode(AppMode.QUIZ)}
              className="p-4 bg-white dark:bg-slate-700/50 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-400 rounded-xl text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 flex flex-col items-center gap-2 border border-slate-100 dark:border-slate-600 hover:border-amber-100 dark:hover:border-amber-900"
            >
              <BrainCircuit className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              New Quiz
            </button>
            <button
              onClick={() => navigateToMode(AppMode.TUTOR)}
              className="p-4 bg-white dark:bg-slate-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-400 rounded-xl text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 flex flex-col items-center gap-2 border border-slate-100 dark:border-slate-600 hover:border-purple-100 dark:hover:border-purple-900"
            >
              <MessageCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              Ask Tutor
            </button>
          </div>
        </div>
      </div>
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
      alert("Successfully added to your Study History & Dashboard List!");
    } else {
      alert("Failed to save. Please make sure you are signed in and online.");
    }
  };

  const renderContent = () => {
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
        return (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <StudyTimerView userProfile={userProfile} />
          </div>
        );

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
              onSharePublicLink={handleSharePublicLink}
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
              lockGradeClass={!!(userProfile.dob && userProfile.grade)}
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
                setHomeworkImages([]);
                setCurrentHistoryId(null);
                setIsViewingShared(false);
                setSharedContent(null);
              }}
              isViewingShared={isViewingShared}
              onAddToMyList={handleAddSharedToMyList}
              isAddedToList={isAddedSharedContent}
              onSharePublicLink={handleSharePublicLink}
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
              lockGradeClass={!!(userProfile.dob && userProfile.grade)}
              onImagesUpload={setHomeworkImages}
              homeworkImages={homeworkImages}
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
                homeworkImages.length === 0 &&
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
              onSharePublicLink={handleSharePublicLink}
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
              lockGradeClass={!!(userProfile.dob && userProfile.grade)}
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
          <div className="max-w-5xl mx-auto h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TutorChat
              onDeductCredit={deductCredit}
              currentCredits={userProfile.credits}
              onSaveSession={(msgs) => {
                if (msgs.length > 1) {
                  const tutorItemContent = {
                    messages: msgs,
                  };
                  // Check if already in history to update or add
                  const existing = history.find(
                    (h) =>
                      h.id === currentHistoryId && h.type === AppMode.TUTOR,
                  );
                  if (existing) {
                    const updatedItem = { ...existing, content: tutorItemContent };
                    setHistory((prev) =>
                      prev.map((h) =>
                        h.id === existing.id
                          ? updatedItem
                          : h,
                      ),
                    );
                    if (user) {
                      saveHistoryItemToFirestore(user.uid, updatedItem);
                    }
                  } else {
                    addToHistory(AppMode.TUTOR, tutorItemContent);
                  }
                }
              }}
              initialMessages={
                history.find(
                  (h) => h.id === currentHistoryId && h.type === AppMode.TUTOR,
                )?.content?.messages
              }
            />
          </div>
        );

      case AppMode.NOTES:
        return (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <NotesView
              userId={user ? user.uid : null}
              onDeductCredit={deductCredit}
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
            />
          </div>
        );

      case AppMode.SETTINGS:
        return (
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsView
              userProfile={userProfile}
              onLogout={handleLogout}
              onNavigateToProfile={() => setMode(AppMode.PROFILE)}
              onOpenPremium={() => setShowPremiumModal(true)}
              onNavigateToLegal={(legalMode) => setMode(legalMode as any)}
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
            <PrivacyPolicyView />
          </div>
        );

      case AppMode.TERMS:
        return (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TermsOfServiceView />
          </div>
        );

      case AppMode.NOTIFICATIONS:
        return (
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <NotificationsView />
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
          />
        )}
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-primary-50 dark:bg-slate-900 flex items-center justify-center flex-col gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-500 animate-bounce">
            <Logo className="w-full h-full" iconOnly />
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100">
          <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-14 flex items-center justify-between px-5 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-primary-500 shadow-sm flex-shrink-0 bg-white dark:bg-slate-800">
                <Logo className="w-full h-full" iconOnly />
              </div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                SJ Tutor AI
              </h1>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-4 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors"
            >
              Get Started
            </button>
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
                onAuthenticate={() => setShowAuthModal(true)}
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
            />
          )}
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans selection:bg-primary-100 selection:text-primary-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <LandingPage
          onGetStarted={() => setShowAuthModal(true)}
          countryCode={detectedCountry}
        />
        {showAuthModal && (
          <Auth
            onClose={() => setShowAuthModal(false)}
            onSignUpSuccess={handleSignUpSuccess}
            onCountryDetected={setDetectedCountry}
            initialCountry={detectedCountry}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans selection:bg-primary-100 selection:text-primary-900 flex text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} shadow-2xl lg:shadow-none`}
      >
        <div className="h-full flex flex-col">
          <div
            className="p-5 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            onClick={() => {
              setMode(AppMode.DASHBOARD);
              setDashboardView("OVERVIEW");
              setSummaryContent("");
              setHomeworkContent("");
              setHomeworkImages([]);
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
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-500 shadow-md flex-shrink-0 bg-white dark:bg-slate-800">
                <Logo className="w-full h-full" iconOnly />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                  SJ Tutor AI
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                  AI Study Buddy
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1 custom-scrollbar">
            {navItems.map((item) => {
              const isActive = mode === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (
                      item.id !== AppMode.DASHBOARD &&
                      item.id !== AppMode.ABOUT &&
                      !user
                    ) {
                      setShowAuthModal(true);
                      setIsSidebarOpen(false);
                    } else {
                      navigateToMode(item.id);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm ${
                    isActive
                      ? "bg-primary-50 dark:bg-slate-800 text-primary-700 dark:text-primary-400 font-semibold shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${isActive ? "text-primary-600 dark:text-primary-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}
                  />
                  {item.label}
                  {!user &&
                    item.id !== AppMode.DASHBOARD &&
                    item.id !== AppMode.ABOUT && (
                      <div className="ml-auto">
                        <ArrowLeft className="w-3 h-3 text-slate-300 rotate-180" />
                      </div>
                    )}
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={async () => {
                const shareUrl = window.location.origin;
                const text = `Join me on SJ Tutor AI - The ultimate AI study companion! 🚀`;
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: "SJ Tutor AI",
                      text: text,
                      url: shareUrl,
                    });
                  } catch (e) {
                    console.error("Share failed", e);
                  }
                } else {
                  try {
                    await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
                    alert("App link copied to clipboard!");
                  } catch (err) {
                    console.error("Clipboard failed", err);
                  }
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-primary-50 dark:hover:bg-slate-800 hover:text-primary-700 dark:hover:text-primary-400 transition-all font-medium text-sm group"
            >
              <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Share SJ Tutor AI
            </button>
          </div>

          <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {user ? (
              <>
                <button
                  onClick={() => setMode(AppMode.PROFILE)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${mode === AppMode.PROFILE ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
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
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-xs font-medium truncate text-slate-800 dark:text-white">
                      {userProfile.displayName || "Scholar"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-lg font-medium shadow-lg shadow-slate-900/20 hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors text-sm"
              >
                Sign In
              </button>
            )}

            {user && (
              <button
                onClick={() => setShowPremiumModal(true)}
                className="w-full py-2 bg-gradient-to-r from-amber-200 to-yellow-400 hover:from-amber-300 hover:to-yellow-500 text-amber-900 rounded-lg font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5" />
                Upgrade Plan
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden relative">
        <div 
          className="absolute inset-0 pointer-events-none opacity-15 dark:opacity-35 transition-opacity"
          style={{
            backgroundImage: 'url("/sj_tutor_bg.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            mixBlendMode: 'normal'
          }}
        />
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-14 flex items-center justify-between px-5 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
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
              onClick={async () => {
                const shareUrl = window.location.origin;
                const text = `Join me on SJ Tutor AI - The ultimate AI study companion! 🚀`;
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: "SJ Tutor AI",
                      text: text,
                      url: shareUrl,
                    });
                  } catch (e) {
                    console.error("Share failed", e);
                  }
                } else {
                  try {
                    await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
                    alert("App link copied to clipboard!");
                  } catch (err) {
                    console.error("Clipboard failed", err);
                  }
                }
              }}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title="Share App"
            >
              <Share2 className="w-5 h-5" />
            </button>
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

            {user && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm border border-emerald-400 rounded-full">
                <Zap className="w-3.5 h-3.5 fill-current text-white animate-pulse" />
                <span className="text-xs font-extrabold select-none">
                  10-Day Free Unlimited Pass
                </span>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 custom-scrollbar">
          <div className="w-full h-full">{renderContent()}</div>
        </div>
      </main>

      {showAuthModal && (
        <Auth
          onClose={() => setShowAuthModal(false)}
          onSignUpSuccess={handleSignUpSuccess}
          onCountryDetected={setDetectedCountry}
        />
      )}

      {showPremiumModal && (
        <PremiumModal
          onClose={() => setShowPremiumModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      <FloatingStreakWidget
        userProfile={userProfile}
        onProfileUpdate={handleProfileSave}
      />

      <AnimatePresence>
        {showTutorial && <Tutorial onClose={handleTutorialClose} />}
      </AnimatePresence>

      <AnimatePresence>
        {showQRScanner && <QRScanner onClose={() => setShowQRScanner(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showCompletionReminder && mode !== AppMode.PROFILE && (
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
                  value={`${window.location.origin}/share/${shareSuccessModal.shareId}`}
                  className="bg-transparent text-[11px] text-slate-650 dark:text-slate-400 w-full focus:outline-none select-all font-mono"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={async () => {
                    const link = `${window.location.origin}/share/${shareSuccessModal.shareId}`;
                    try {
                      await navigator.clipboard.writeText(link);
                      alert("Copied shareable link to clipboard!");
                    } catch {
                      alert("Fallback link copy: " + link);
                    }
                  }}
                  className="py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </button>
                
                <button
                  onClick={() => {
                    window.open(`/share/${shareSuccessModal.shareId}`, "_blank");
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
    </div>
  );
};

export default App;
