import { AppMode } from "../types";

export interface RouteState {
  mode: AppMode;
  path: string;
  title: string;
  isAuthModalOpen: boolean;
  authModalMode: "signin" | "signup";
  isPremiumModalOpen: boolean;
  publicShareId: string | null;
  groupInviteCode: string | null;
}

export const ROUTE_PATH_MAP: Record<AppMode, string> = {
  [AppMode.DASHBOARD]: "/dashboard",
  [AppMode.SUMMARY]: "/summary",
  [AppMode.QUIZ]: "/quiz",
  [AppMode.HOMEWORK]: "/homework",
  [AppMode.ESSAY]: "/essay",
  [AppMode.TUTOR]: "/tutor",
  [AppMode.NOTES]: "/notes",
  [AppMode.GROUPS]: "/groups",
  [AppMode.ID_CARD]: "/id-card",
  [AppMode.TIMER]: "/timer",
  [AppMode.PROFILE]: "/profile",
  [AppMode.SETTINGS]: "/settings",
  [AppMode.NOTIFICATIONS]: "/notifications",
  [AppMode.ABOUT]: "/about",
  [AppMode.PRIVACY]: "/privacy",
  [AppMode.TERMS]: "/terms",
  [AppMode.SHARED_CONTENT]: "/share",
  [AppMode.GROUP_INVITE]: "/invite",
};

export const ROUTE_TITLES: Record<AppMode, string> = {
  [AppMode.DASHBOARD]: "Dashboard - SJ Tutor AI",
  [AppMode.SUMMARY]: "Instant Chapter Summary - SJ Tutor AI",
  [AppMode.QUIZ]: "Interactive Quiz Creator & Solver - SJ Tutor AI",
  [AppMode.HOMEWORK]: "AI Homework Solver & Step-by-Step Helper - SJ Tutor AI",
  [AppMode.ESSAY]: "AI Essay & Composition Writer - SJ Tutor AI",
  [AppMode.TUTOR]: "24/7 AI Personal Tutor Sessions - SJ Tutor AI",
  [AppMode.NOTES]: "Smart Notes & Study Schedule - SJ Tutor AI",
  [AppMode.GROUPS]: "Collaborative Study Groups - SJ Tutor AI",
  [AppMode.ID_CARD]: "Official Student Identity Card - SJ Tutor AI",
  [AppMode.TIMER]: "Focused Study Timer & Stopwatch - SJ Tutor AI",
  [AppMode.PROFILE]: "Scholar Profile & Academic Details - SJ Tutor AI",
  [AppMode.SETTINGS]: "Preferences & Security Settings - SJ Tutor AI",
  [AppMode.NOTIFICATIONS]: "Study Notifications & Activity - SJ Tutor AI",
  [AppMode.ABOUT]: "About SJ Tutor AI - Smart Learning Platform",
  [AppMode.PRIVACY]: "Privacy Policy - SJ Tutor AI",
  [AppMode.TERMS]: "Terms of Service - SJ Tutor AI",
  [AppMode.SHARED_CONTENT]: "Shared Study Guide - SJ Tutor AI",
  [AppMode.GROUP_INVITE]: "Join Study Group - SJ Tutor AI",
};

/**
 * Parses the current window pathname and returns the active mode, modal states, and parameters.
 */
export const parseCurrentRoute = (pathname = window.location.pathname): RouteState => {
  const cleanPath = pathname.toLowerCase().replace(/\/$/, "") || "/";

  let mode = AppMode.DASHBOARD;
  let isAuthModalOpen = false;
  let authModalMode: "signin" | "signup" = "signin";
  let isPremiumModalOpen = false;
  let publicShareId: string | null = null;
  let groupInviteCode: string | null = null;

  // Check URL query parameters for fallback (e.g. ?share=xyz or ?invite=abc)
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const queryShare = searchParams.get("share");
    if (queryShare) publicShareId = queryShare;
    const queryInvite = searchParams.get("invite");
    if (queryInvite) groupInviteCode = queryInvite;
  } catch (err) {
    console.debug("Query params parse notice:", err);
  }

  // 1. Modal routes
  if (cleanPath === "/login" || cleanPath === "/signin") {
    isAuthModalOpen = true;
    authModalMode = "signin";
    mode = AppMode.DASHBOARD;
  } else if (cleanPath === "/signup" || cleanPath === "/register" || cleanPath === "/join") {
    isAuthModalOpen = true;
    authModalMode = "signup";
    mode = AppMode.DASHBOARD;
  } else if (cleanPath === "/premium" || cleanPath === "/pricing" || cleanPath === "/plans" || cleanPath === "/upgrade") {
    isPremiumModalOpen = true;
    mode = AppMode.DASHBOARD;
  }
  // 2. Share & Invite dynamic routes
  else if (cleanPath.startsWith("/share/")) {
    publicShareId = cleanPath.substring(7);
    mode = AppMode.SHARED_CONTENT;
  } else if (cleanPath.startsWith("/shared/")) {
    publicShareId = cleanPath.substring(8);
    mode = AppMode.SHARED_CONTENT;
  } else if (cleanPath.startsWith("/invite/")) {
    groupInviteCode = cleanPath.substring(8);
    mode = AppMode.GROUP_INVITE;
  } else if (cleanPath.startsWith("/group-invite/")) {
    groupInviteCode = cleanPath.substring(14);
    mode = AppMode.GROUP_INVITE;
  }
  // 3. Feature-specific routes
  else if (cleanPath === "/summary" || cleanPath === "/summarizer" || cleanPath === "/summaries") {
    mode = AppMode.SUMMARY;
  } else if (cleanPath === "/quiz" || cleanPath === "/quizzes") {
    mode = AppMode.QUIZ;
  } else if (cleanPath === "/homework" || cleanPath === "/homework-solver" || cleanPath === "/homework-helper") {
    mode = AppMode.HOMEWORK;
  } else if (cleanPath === "/essay" || cleanPath === "/essay-writer") {
    mode = AppMode.ESSAY;
  } else if (cleanPath === "/tutor" || cleanPath === "/ai-tutor" || cleanPath === "/chat" || cleanPath === "/tutor-chat") {
    mode = AppMode.TUTOR;
  } else if (cleanPath === "/notes" || cleanPath === "/smart-notes" || cleanPath === "/schedule") {
    mode = AppMode.NOTES;
  } else if (cleanPath === "/groups" || cleanPath === "/study-groups") {
    mode = AppMode.GROUPS;
  } else if (cleanPath === "/id-card" || cleanPath === "/student-id" || cleanPath === "/id") {
    mode = AppMode.ID_CARD;
  } else if (cleanPath === "/timer" || cleanPath === "/study-timer" || cleanPath === "/pomodoro") {
    mode = AppMode.TIMER;
  } else if (cleanPath === "/profile" || cleanPath === "/account" || cleanPath === "/my-profile") {
    mode = AppMode.PROFILE;
  } else if (cleanPath === "/settings" || cleanPath === "/preferences") {
    mode = AppMode.SETTINGS;
  } else if (cleanPath === "/notifications" || cleanPath === "/alerts") {
    mode = AppMode.NOTIFICATIONS;
  } else if (cleanPath === "/about" || cleanPath === "/about-us") {
    mode = AppMode.ABOUT;
  } else if (cleanPath === "/privacy" || cleanPath === "/privacy-policy") {
    mode = AppMode.PRIVACY;
  } else if (cleanPath === "/terms" || cleanPath === "/terms-of-service" || cleanPath === "/terms-and-conditions") {
    mode = AppMode.TERMS;
  } else if (cleanPath === "/" || cleanPath === "/dashboard") {
    mode = AppMode.DASHBOARD;
  } else {
    // Check type-specific custom share routes e.g. /quiz/abc or /summary/def
    const prefixes = ["/quiz/", "/summary/", "/notes/", "/homework/", "/tutor/"];
    for (const prefix of prefixes) {
      if (cleanPath.startsWith(prefix)) {
        const segments = cleanPath.substring(prefix.length).split("/").filter(Boolean);
        if (segments.length === 1) {
          publicShareId = segments[0];
          mode = AppMode.SHARED_CONTENT;
          break;
        } else if (segments.length > 1) {
          const prefixName = prefix.substring(1, prefix.length - 1);
          publicShareId = `${prefixName}_${segments.join("_")}`;
          mode = AppMode.SHARED_CONTENT;
          break;
        }
      }
    }
  }

  // Derive document title
  let title = ROUTE_TITLES[mode] || "SJ Tutor AI - Your AI Study Buddy";
  if (isAuthModalOpen) {
    title = authModalMode === "signup" ? "Create Account - SJ Tutor AI" : "Sign In - SJ Tutor AI";
  } else if (isPremiumModalOpen) {
    title = "Premium Plans & Pricing - SJ Tutor AI";
  }

  return {
    mode,
    path: cleanPath,
    title,
    isAuthModalOpen,
    authModalMode,
    isPremiumModalOpen,
    publicShareId,
    groupInviteCode,
  };
};

/**
 * Updates the browser's URL address bar and document title smoothly via History API.
 */
export const syncBrowserUrl = (
  mode: AppMode,
  options: {
    replace?: boolean;
    modal?: "signin" | "signup" | "premium" | null;
    shareId?: string | null;
    inviteCode?: string | null;
    customTitle?: string;
  } = {}
) => {
  try {
    let targetPath = ROUTE_PATH_MAP[mode] || "/dashboard";
    let targetTitle = ROUTE_TITLES[mode] || "SJ Tutor AI";

    if (options.modal === "signin") {
      targetPath = "/login";
      targetTitle = "Sign In - SJ Tutor AI";
    } else if (options.modal === "signup") {
      targetPath = "/signup";
      targetTitle = "Create Account - SJ Tutor AI";
    } else if (options.modal === "premium") {
      targetPath = "/premium";
      targetTitle = "Premium Plans - SJ Tutor AI";
    } else if (mode === AppMode.SHARED_CONTENT && options.shareId) {
      targetPath = `/share/${options.shareId}`;
      targetTitle = "Shared Study Material - SJ Tutor AI";
    } else if (mode === AppMode.GROUP_INVITE && options.inviteCode) {
      targetPath = `/invite/${options.inviteCode}`;
      targetTitle = "Join Study Group - SJ Tutor AI";
    }

    if (options.customTitle) {
      targetTitle = options.customTitle;
    }

    // Only modify history if path is actually different to avoid duplicate history states
    if (window.location.pathname !== targetPath) {
      if (options.replace) {
        window.history.replaceState({ mode, modal: options.modal }, targetTitle, targetPath);
      } else {
        window.history.pushState({ mode, modal: options.modal }, targetTitle, targetPath);
      }
    }

    document.title = targetTitle;
  } catch (err) {
    console.debug("Failed syncing browser URL:", err);
  }
};
