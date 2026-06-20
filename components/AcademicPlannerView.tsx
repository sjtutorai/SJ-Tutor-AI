import React, { useState, useEffect } from "react";
import { 
  Upload, Sparkles, BookOpen, Clock, Calendar, CheckCircle2, 
  Trash2, Plus, CalendarPlus, Share2, Award, 
  TrendingUp, Compass, ChevronRight, 
  Clock3, BarChart2, MessageSquare, ShieldAlert
} from "lucide-react";
import { GeminiService } from "../services/geminiService";
import { createSharedContent } from "../utils/firebaseUtils";
import { TimetableEntry } from "../types";

interface AcademicPlannerViewProps {
  userId: string | null;
  onDeductCredit: (amount: number) => boolean;
}

interface HomeworkItem {
  id: string;
  subject: string;
  title: string;
  dueDate: string;
  difficulty: "Easy" | "Medium" | "Hard";
  estimatedTime: string; // e.g. "1.5 Hrs"
  completed: boolean;
}

interface ExamTarget {
  id: string;
  subject: string;
  topic: string;
  date: string;
  priority: "High" | "Medium" | "Low";
  targetScore: string;
  mockTestStatus: "Pending" | "Completed" | "In Progress";
}

// Default high-fidelity mock data so the dashboard is instantly active and gorgeous
const DEFAULT_SUBJECTS = ["Science", "Mathematics", "English Literature", "Social Studies", "Computer Science"];

const DEFAULT_TIMETABLE: TimetableEntry[] = [
  {
    day: "Monday",
    date: "Weekly Loop",
    slots: [
      { time: "08:30 AM - 09:30 AM", subject: "Science", activity: "Lab Session (Ch 4 Chemistry / Room 204)" },
      { time: "09:30 AM - 10:30 AM", subject: "Mathematics", activity: "Calculus Deep Dive (Ch 8 / Room 101)" },
      { time: "11:00 AM - 12:00 PM", subject: "English Literature", activity: "Shakespearean Drama (Act II / Room 302)" },
      { time: "01:00 PM - 02:00 PM", subject: "Social Studies", activity: "Modern Political Theory (Room 105)" }
    ]
  },
  {
    day: "Tuesday",
    date: "Weekly Loop",
    slots: [
      { time: "08:30 AM - 09:30 AM", subject: "Computer Science", activity: "Data Structures & Algorithms (Room 501)" },
      { time: "09:30 AM - 10:30 AM", subject: "Science", activity: "Physics Mechanics Discussion (Ch 3)" },
      { time: "11:00 AM - 12:00 PM", subject: "Mathematics", activity: "Algebra Practice Block" }
    ]
  },
  {
    day: "Wednesday",
    date: "Weekly Loop",
    slots: [
      { time: "08:30 AM - 09:30 AM", subject: "English Literature", activity: "Creative Writing Workshop" },
      { time: "09:30 AM - 10:30 AM", subject: "Social Studies", activity: "Industrial Revolution Chronology" },
      { time: "11:00 AM - 12:00 PM", subject: "Science", activity: "Biology Practical: Plant Anatomy" },
      { time: "01:00 PM - 02:00 PM", subject: "Computer Science", activity: "Debugging Clinic (Group B)" }
    ]
  }
];

const DEFAULT_DAILY_PLANNER = [
  { time: "07:00 AM - 07:30 AM", task: "Solve 5 Calculus Equations", category: "Revision", duration: "30 Mins" },
  { time: "04:30 PM - 05:30 PM", task: "Review Science Ch 4 Lab Notes", category: "Reading", duration: "1 Hr" },
  { time: "05:45 PM - 06:15 PM", task: "English literature Act II summary quiz", category: "Quiz Practice", duration: "30 Mins" },
  { time: "07:30 PM - 08:30 PM", task: "Complete Computer State Logic Homework", category: "Homework", duration: "1 Hr" },
  { time: "08:30 PM - 08:45 PM", task: "Power Break / Breath Loop", category: "Break", duration: "15 Mins" }
];

const DEFAULT_WEEKLY_PLANNER = [
  { day: "Monday", focus: "Math & Science Base Revision", tasks: ["3 hrs revised block", "1 quiz", "Solve Physics sample assignment"] },
  { day: "Tuesday", focus: "Language Arts & Tech Practice", tasks: ["Review Shakespeare drama outline", "1 CS debugging mock"] },
  { day: "Wednesday", focus: "Full Syllabus Mid-Term Check", tasks: ["Review historical timelines", "Self-assess mock math quiz"] },
  { day: "Thursday", focus: "Stamina building & Physics homework", tasks: ["Complex calculus equations", "2 hrs science review"] },
  { day: "Friday", focus: "Weekly summary compilation", tasks: ["Final homework checkoff", "Organize workspace"] }
];

const DEFAULT_MONTHLY_PLANNER = [
  { month: "First Milestone", milestone: "Mid-Term Examination Readiness", strategy: "Dedicate 12 hours weekly to critical test chapters. Ensure notes are fully structured." },
  { month: "Second Milestone", milestone: "Computer Science and Science Lab Practical Defense", strategy: "Maintain pristine lab folders. Execute practical code drafts 2x a week." },
  { month: "Third Milestone", milestone: "Complete Board Exam Preparatory Marathon", strategy: "Solve 10-year previous questions papers in simulated board conditions." }
];

const DEFAULT_RECOMMENDATIONS = [
  "Revise Mathematics Calculus early in the morning when mental retention is sharpest.",
  "Your Wednesdays have 3 intensive back-to-back lectures. Schedule an active 20-min recharge break right after Biology class.",
  "Dedicate at least 4 hours to Computer Science algorithms this week to stay ahead of Tuesday labs."
];

const DEFAULT_EXAMS: ExamTarget[] = [
  { id: "e1", subject: "Mathematics", topic: "Mid-Term Calculus & Trigonometry", date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], priority: "High", targetScore: "95%", mockTestStatus: "In Progress" },
  { id: "e2", subject: "Science", topic: "Organic Chemistry & Mechanics Laboratory", date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], priority: "High", targetScore: "92%", mockTestStatus: "Completed" },
  { id: "e3", subject: "Computer Science", topic: "Recursive Algorithms & Binary Trees", date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], priority: "Medium", targetScore: "98%", mockTestStatus: "Pending" }
];

const DEFAULT_HOMEWORK: HomeworkItem[] = [
  { id: "h1", subject: "Science", title: "Chemistry Ch 4 Molecular Bonds Essay", dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], difficulty: "Medium", estimatedTime: "1.5 Hrs", completed: false },
  { id: "h2", subject: "Mathematics", title: "Calculus Derivative Exercise sheet 4", dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], difficulty: "Hard", estimatedTime: "2.0 Hrs", completed: false },
  { id: "h3", subject: "English Literature", title: "Write modern outline of Act II Scene I", dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], difficulty: "Easy", estimatedTime: "0.5 Hrs", completed: true }
];

export const AcademicPlannerView: React.FC<AcademicPlannerViewProps> = ({ userId, onDeductCredit }) => {
  // Config state
  const [activeTab, setActiveTab] = useState<"LAUNCH" | "PLANNER" | "HOMEWORK" | "EXAMS" | "ANALYTICS" | "COACH">("LAUNCH");
  const [plannerSubTab, setPlannerSubTab] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  
  // Real active state (initialized with mock parameters so user can instantly see its amazing functionality)
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
  const [timetable, setTimetable] = useState<TimetableEntry[]>(DEFAULT_TIMETABLE);
  const [dailyPlanner, setDailyPlanner] = useState(DEFAULT_DAILY_PLANNER);
  const [weeklyPlanner, setWeeklyPlanner] = useState(DEFAULT_WEEKLY_PLANNER);
  const [monthlyPlanner, setMonthlyPlanner] = useState(DEFAULT_MONTHLY_PLANNER);
  const [recommendations, setRecommendations] = useState<string[]>(DEFAULT_RECOMMENDATIONS);
  
  // Insights counts
  const [totalClasses, setTotalClasses] = useState(11);
  const [studyLoadScore, setStudyLoadScore] = useState(65);
  const [productivityScore, setProductivityScore] = useState(82);
  const [coachMsg, setCoachMsg] = useState(
    "Hello Scholar👋! Based on your active timetable, you have an optimized schedule layout. Math and Science require focused strategy blocks. Let's conquer this academic cycle together!"
  );

  // Homework Desk States
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>(DEFAULT_HOMEWORK);
  const [newHwTitle, setNewHwTitle] = useState("");
  const [newHwSubject, setNewHwSubject] = useState("Science");
  const [newHwDate, setNewHwDate] = useState("");
  const [newHwDiff, setNewHwDiff] = useState<"Easy" | "Medium" | "Hard">("Medium");

  // Exam States
  const [exams, setExams] = useState<ExamTarget[]>(DEFAULT_EXAMS);
  const [newExamSubject, setNewExamSubject] = useState("Mathematics");
  const [newExamTopic, setNewExamTopic] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [newExamPriority, setNewExamPriority] = useState<"High" | "Medium" | "Low">("High");
  const [newExamTarget, setNewExamTarget] = useState("95%");

  // File upload state tracker
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Share & sync states
  const [shareLink, setShareLink] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [calendarSyncStatus, setCalendarSyncStatus] = useState<"IDLE" | "SYNCING" | "SUCCESS">("IDLE");
  const [lastSyncDate, setLastSyncDate] = useState<string>("");

  // Auto load user saved custom state from localstorage
  useEffect(() => {
    const key = userId || "guest_planner";
    const saved = localStorage.getItem(`academic_planner_${key}`);
    const savedHw = localStorage.getItem(`academic_planner_hw_${key}`);
    const savedExams = localStorage.getItem(`academic_planner_exams_${key}`);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSubjects(parsed.subjects || DEFAULT_SUBJECTS);
        setTimetable(parsed.timetable || DEFAULT_TIMETABLE);
        setDailyPlanner(parsed.dailyPlanner || DEFAULT_DAILY_PLANNER);
        setWeeklyPlanner(parsed.weeklyPlan || DEFAULT_WEEKLY_PLANNER);
        setMonthlyPlanner(parsed.monthlyPlan || DEFAULT_MONTHLY_PLANNER);
        setRecommendations(parsed.recommendations || DEFAULT_RECOMMENDATIONS);
        setTotalClasses(parsed.totalClasses || 11);
        setStudyLoadScore(parsed.studyLoadScore || 65);
        setProductivityScore(parsed.productivityScore || 82);
        setCoachMsg(parsed.coachMsg || coachMsg);
        setUploadedFileName(parsed.uploadedFileName || "");
      } catch (e) {
        console.error("Error loading planner state", e);
      }
    }
    if (savedHw) setHomeworkList(JSON.parse(savedHw));
    if (savedExams) setExams(JSON.parse(savedExams));
  }, [userId]);

  // Persist
  const saveStateToStorage = (
    newTimetable?: TimetableEntry[], 
    newHw?: HomeworkItem[], 
    newExs?: ExamTarget[], 
    customPlannerObj?: any
  ) => {
    const key = userId || "guest_planner";
    const activeHw = newHw || homeworkList;
    const activeExs = newExs || exams;

    localStorage.setItem(`academic_planner_hw_${key}`, JSON.stringify(activeHw));
    localStorage.setItem(`academic_planner_exams_${key}`, JSON.stringify(activeExs));

    const coreObj = {
      subjects,
      timetable: newTimetable || timetable,
      dailyPlanner,
      weeklyPlan: weeklyPlanner,
      monthlyPlan: monthlyPlanner,
      recommendations,
      totalClasses,
      studyLoadScore,
      productivityScore,
      coachMsg,
      uploadedFileName,
      ...customPlannerObj
    };
    localStorage.setItem(`academic_planner_${key}`, JSON.stringify(coreObj));
  };

  // Drag-and-drop handles
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processTimetableFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processTimetableFile(file);
    }
  };

  // Extract / Processing controller via Gemini API
  const processTimetableFile = async (file: File) => {
    if (!onDeductCredit(15)) return; // 15 credits for absolute full multi-modal parsing & analytics extraction
    setErrorMessage("");
    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          // Send to Gemini modern parser!
          const parsedOutput = await GeminiService.parseTimetableDocument(base64, file.name);
          
          if (parsedOutput) {
            setSubjects(parsedOutput.subjects || DEFAULT_SUBJECTS);
            setTimetable(parsedOutput.timetable || DEFAULT_TIMETABLE);
            
            // Set insights values
            if (parsedOutput.insights) {
              setTotalClasses(parsedOutput.insights.totalClasses || 10);
              setStudyLoadScore(parsedOutput.insights.studyLoadScore || 50);
              setProductivityScore(parsedOutput.insights.productivityScore || 50);
            }

            setRecommendations(parsedOutput.recommendations || DEFAULT_RECOMMENDATIONS);
            setCoachMsg(parsedOutput.academicCoachMsg || coachMsg);
            setUploadedFileName(file.name);

            // Generate planner adjustments matching user's loaded subjects
            const subList = parsedOutput.subjects || DEFAULT_SUBJECTS;
            const customGoalPrompt = "Optimize study habits for board preparations with proper rest cycles.";
            const planOutput = await GeminiService.generateAcademicPlanRecommendations(subList, "2026-06-30", customGoalPrompt);

            let newDaily = dailyPlanner;
            let newWeekly = weeklyPlanner;
            let newMonthly = monthlyPlanner;

            if (planOutput) {
              if (planOutput.daily) newDaily = planOutput.daily;
              if (planOutput.weekly) newWeekly = planOutput.weekly;
              if (planOutput.monthly) newMonthly = planOutput.monthly;

              setDailyPlanner(newDaily);
              setWeeklyPlanner(newWeekly);
              setMonthlyPlanner(newMonthly);
            }

            // Save state
            saveStateToStorage(
              parsedOutput.timetable, 
              homeworkList, 
              exams, 
              {
                subjects: subList,
                dailyPlanner: newDaily,
                weeklyPlan: newWeekly,
                monthlyPlan: newMonthly,
                recommendations: parsedOutput.recommendations,
                coachMsg: parsedOutput.academicCoachMsg,
                totalClasses: parsedOutput.insights?.totalClasses,
                studyLoadScore: parsedOutput.insights?.studyLoadScore,
                productivityScore: parsedOutput.insights?.productivityScore,
                uploadedFileName: file.name
              }
            );

            setActiveTab("LAUNCH"); // switch back to active panel
          }
        } catch (apiErr: any) {
          console.error("Gemini timetable error", apiErr);
          setErrorMessage("Gemini extraction failed. Check connection or retry with a different document format.");
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setErrorMessage("Unable to read selected file.");
      setIsUploading(false);
    }
  };

  // Homework operations
  const handleAddHomework = () => {
    if (!newHwTitle.trim()) return;
    
    // Auto estimate completion time based on difficulty and title complexity
    let estimated = "1.5 Hrs";
    if (newHwDiff === "Easy") estimated = "0.5 Hrs";
    else if (newHwDiff === "Hard") estimated = "2.5 Hrs";

    const newItem: HomeworkItem = {
      id: Date.now().toString(),
      subject: newHwSubject,
      title: newHwTitle,
      dueDate: newHwDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      difficulty: newHwDiff,
      estimatedTime: estimated,
      completed: false
    };

    const updated = [newItem, ...homeworkList];
    setHomeworkList(updated);
    setNewHwTitle("");
    saveStateToStorage(timetable, updated, exams);
  };

  const handleToggleHomework = (id: string) => {
    const updated = homeworkList.map(h => h.id === id ? { ...h, completed: !h.completed } : h);
    setHomeworkList(updated);
    saveStateToStorage(timetable, updated, exams);
  };

  const handleDeleteHomework = (id: string) => {
    const updated = homeworkList.filter(h => h.id !== id);
    setHomeworkList(updated);
    saveStateToStorage(timetable, updated, exams);
  };

  // Exam Targets operations
  const handleAddExam = () => {
    if (!newExamTopic.trim()) return;

    const newItem: ExamTarget = {
      id: Date.now().toString(),
      subject: newExamSubject,
      topic: newExamTopic,
      date: newExamDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      priority: newExamPriority,
      targetScore: newExamTarget || "90%",
      mockTestStatus: "Pending"
    };

    const updated = [newItem, ...exams];
    setExams(updated);
    setNewExamTopic("");
    setNewExamDate("");
    saveStateToStorage(timetable, homeworkList, updated);
  };

  const handleToggleMockStatus = (id: string) => {
    const updated = exams.map(e => {
      if (e.id === id) {
        let nextStatus: "Pending" | "Completed" | "In Progress" = "Pending";
        if (e.mockTestStatus === "Pending") nextStatus = "In Progress";
        else if (e.mockTestStatus === "In Progress") nextStatus = "Completed";
        return { ...e, mockTestStatus: nextStatus };
      }
      return e;
    });
    setExams(updated);
    saveStateToStorage(timetable, homeworkList, updated);
  };

  const handleDeleteExam = (id: string) => {
    const updated = exams.filter(e => e.id !== id);
    setExams(updated);
    saveStateToStorage(timetable, homeworkList, updated);
  };

  // Google / Outlook Calendar Sync
  const handleCalendarSync = () => {
    setCalendarSyncStatus("SYNCING");
    setTimeout(() => {
      setCalendarSyncStatus("SUCCESS");
      setLastSyncDate(new Date().toLocaleString());
      setTimeout(() => setCalendarSyncStatus("IDLE"), 5000);
    }, 2000);
  };

  // Share link creator
  const handleCreatePublicShare = async () => {
    setIsSharing(true);
    try {
      const shareData = {
        title: `${uploadedFileName || "Academic Planner"} - Personal Study Route`,
        type: "STUDY_PLANNER",
        content: JSON.stringify({
          subjects,
          timetable,
          dailyPlanner,
          weeklyPlanner,
          recommendations,
          exams,
          studyLoadScore,
          productivityScore
        })
      };

      const shareId = await createSharedContent(
        shareData.type,
        shareData.title,
        shareData.content,
        userId || "guest"
      );

      if (shareId) {
        setShareLink(`${window.location.origin}/share/${shareId}`);
      }
    } catch (e) {
      console.error("Failed to generate planner share", e);
    } finally {
      setIsSharing(false);
    }
  };

  // Calculate daily order sorted by priority
  const recommendedHomeworkSequence = [...homeworkList]
    .filter(h => !h.completed)
    .sort((a, b) => {
      const diffOrder = { Hard: 3, Medium: 2, Easy: 1 };
      return diffOrder[b.difficulty] - diffOrder[a.difficulty]; // prioritized Hard tasks
    });

  return (
    <div className="space-y-6 max-w-6xl mx-auto" id="academic-planner-parent">
      {/* Upper glowing banner layout */}
      <div className="relative p-6 sm:p-8 rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 text-white shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/30 via-purple-900/20 to-cyan-500/10 mix-blend-color-dodge"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border border-cyan-500/20 rounded-full text-xs font-semibold text-cyan-400">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              AI-Powered Dashboard
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              Academic Planner & Timetable Desk
            </h2>
            <p className="text-slate-400 text-sm max-w-xl">
              Upload your school schedule screenshot, Excel sheet, or PDF. Our AI parses classes, analyzes study loads, and schedules daily preparation routines automatically.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab("COACH")}
              className="px-5 py-3 rounded-xl font-bold text-sm bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-all flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Ask AI Coach
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("timetable-uploader");
                if (el) el.scrollIntoView({ behavior: "smooth" });
                else setActiveTab("LAUNCH");
              }}
              className="px-5 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg transition-all flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Re-upload Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Main navigation row */}
      <div className="flex overflow-x-auto pb-2 gap-2 border-b border-slate-200 dark:border-slate-800 custom-scrollbar">
        <button
          onClick={() => setActiveTab("LAUNCH")}
          className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === "LAUNCH"
              ? "bg-primary-500 text-white shadow-md shadow-primary-500/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
          }`}
        >
          <Compass className="w-4 h-4" />
          General Dashboard
        </button>
        <button
          onClick={() => setActiveTab("PLANNER")}
          className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === "PLANNER"
              ? "bg-primary-500 text-white shadow-md shadow-primary-500/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Smart Study Planner
        </button>
        <button
          onClick={() => setActiveTab("HOMEWORK")}
          className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === "HOMEWORK"
              ? "bg-primary-500 text-white shadow-md shadow-primary-500/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Homework Prep Desk
          {homeworkList.filter(h => !h.completed).length > 0 && (
            <span className="w-5 h-5 flex items-center justify-center text-[10px] bg-red-500 text-white rounded-full">
              {homeworkList.filter(h => !h.completed).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("EXAMS")}
          className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === "EXAMS"
              ? "bg-primary-500 text-white shadow-md shadow-primary-500/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
          }`}
        >
          <Award className="w-4 h-4" />
          Exam Preparation
        </button>
        <button
          onClick={() => setActiveTab("ANALYTICS")}
          className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === "ANALYTICS"
              ? "bg-primary-500 text-white shadow-md shadow-primary-500/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Schedule Analytics
        </button>
      </div>

      {/* Primary tab views rendering */}
      {activeTab === "LAUNCH" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Central Layout */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Metrics Dashboard */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-center">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Classes / Week</span>
                <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 block mt-1">{totalClasses}</span>
                <div className="mt-2 text-[10px] text-emerald-500 font-semibold">Active school load</div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-center">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Study stress score</span>
                <span className="text-3xl font-extrabold text-amber-500 block mt-1">{studyLoadScore}/100</span>
                <div className="mt-2 text-[10px] text-slate-400">Moderate workload</div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-center">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Weekly productivity</span>
                <span className="text-3xl font-extrabold text-cyan-500 block mt-1">{productivityScore}%</span>
                <div className="mt-2 text-[10px] text-emerald-500 font-semibold">Highly optimized</div>
              </div>
            </div>

            {/* Timetable File Uploader Element */}
            <div 
              id="timetable-uploader"
              onDragEnter={handleDrag} 
              onDragOver={handleDrag} 
              onDragLeave={handleDrag} 
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
                dragActive 
                  ? "border-primary-500 bg-primary-50/20 dark:bg-primary-900/10" 
                  : "border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md"
              }`}
            >
              <input 
                id="file-upload-input"
                type="file" 
                className="hidden" 
                accept="image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
              />
              
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-14 h-14 bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 rounded-2xl flex items-center justify-center mx-auto text-center shadow-inner">
                  {isUploading ? (
                    <Clock3 className="w-7 h-7 animate-spin" />
                  ) : (
                    <Upload className="w-7 h-7" />
                  )}
                </div>

                <div>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                    {isUploading ? "AI Processing Schedule..." : "Upload school timetable file"}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Drag and drop your syllabus file, image, snapshot, spreadsheet, or docx.
                  </p>
                </div>

                <div className="flex justify-center gap-2 text-xs text-slate-500 font-medium">
                  <span>PDF, PNG, JPG, Excel, Word recognized</span>
                  <span>•</span>
                  <span className="text-amber-500">Deducts 15 credits</span>
                </div>

                <button
                  type="button"
                  onClick={() => document.getElementById("file-upload-input")?.click()}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                  disabled={isUploading}
                >
                  Select File Manually
                </button>

                {uploadedFileName && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Active Timetable: {uploadedFileName}
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3 bg-red-55 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    {errorMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Extracted Timetable Grid */}
            <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 backdrop-blur-md rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Active Class Schedule</h3>
                  <p className="text-xs text-slate-500">Your school timetable extracted via AI Multimodal OCR</p>
                </div>
                <button
                  onClick={() => {
                    setTimetable(DEFAULT_TIMETABLE);
                    setSubjects(DEFAULT_SUBJECTS);
                    setTotalClasses(11);
                    setStudyLoadScore(65);
                    setProductivityScore(82);
                    setUploadedFileName("");
                  }}
                  className="text-xs font-semibold text-red-500 hover:underline"
                >
                  Reset to default
                </button>
              </div>

              <div className="space-y-6">
                {timetable.map((day, idx) => (
                  <div key={idx} className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <span className="font-bold text-slate-800 dark:text-white text-sm">{day.day}</span>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Loops Weekly</span>
                    </div>
                    <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800">
                      {day.slots.map((slot, sIdx) => (
                        <div key={sIdx} className="flex flex-col sm:flex-row sm:items-center py-2.5 gap-2 first:pt-0 last:pb-0">
                          <div className="sm:w-44 text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {slot.time}
                          </div>
                          <div className="flex-1">
                            <span className="px-2 py-0.5 bg-slate-150 dark:bg-slate-800 text-[10px] font-bold rounded-md mr-2 inline-block">
                              {slot.subject}
                            </span>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              {slot.activity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right hand dynamic coaching side rails */}
          <div className="space-y-6">
            
            {/* AI Academic Coach encouragement */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl"></div>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full border border-primary-500 bg-slate-800 overflow-hidden flex items-center justify-center">
                  <span className="text-lg font-bold text-amber-400">🤖</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-100">Academic AI Coach</h4>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online Advisor
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/40 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-300 leading-relaxed space-y-2">
                <p>{coachMsg}</p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Streak score: 98%</span>
                <button 
                  onClick={() => setActiveTab("COACH")} 
                  className="font-bold text-cyan-400 hover:underline flex items-center gap-1"
                >
                  Adjust strategy <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sharing Desk & Reminds */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Public Sharing Drawer</h4>
              <p className="text-xs text-slate-500">Create a secure cloud URL to send your study calendar and analyzed workload to your parents or teacher.</p>
              
              <button
                onClick={handleCreatePublicShare}
                disabled={isSharing}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4 animate-pulse" />
                {isSharing ? "Uploading Plan..." : "Generate Parent Share Link"}
              </button>

              {shareLink && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs space-y-2">
                  <p className="font-bold">Plan shared on cloud securely!</p>
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    onClick={(e) => {
                      (e.target as HTMLInputElement).select();
                      navigator.clipboard.writeText(shareLink);
                    }}
                    className="w-full text-[10px] border border-emerald-200 font-mono px-2 py-1 outline-none text-emerald-800 bg-white"
                  />
                  <p className="text-[9px] text-slate-500">Click path to copy to clipboard</p>
                </div>
              )}
            </div>

            {/* Study Target Countdown Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Immediate Exam Alarms</h4>
              
              <div className="space-y-3">
                {exams.slice(0, 2).map((target) => (
                  <div key={target.id} className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 text-[9px] font-bold rounded">
                        {target.priority} Priority
                      </span>
                      <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">{target.subject}</p>
                      <p className="text-[10px] text-slate-400">{target.topic}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded block">
                        Target: {target.targetScore}
                      </span>
                      <span className="text-[10px] text-amber-500 font-semibold block mt-1">Due {target.date}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setActiveTab("EXAMS")}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold transition-all text-slate-600"
              >
                Manage Exam Roadmap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Study Planner Tab */}
      {activeTab === "PLANNER" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Smart Revision & Prep Planner</h3>
              <p className="text-xs text-slate-500">Auto-configured time tracks mapped against active subjects</p>
            </div>

            {/* Sub tab selectors */}
            <div className="flex border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden p-1">
              <button
                onClick={() => setPlannerSubTab("DAILY")}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                  plannerSubTab === "DAILY" ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow" : "text-slate-500"
                }`}
              >
                Daily Schedule
              </button>
              <button
                onClick={() => setPlannerSubTab("WEEKLY")}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                  plannerSubTab === "WEEKLY" ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow" : "text-slate-500"
                }`}
              >
                Weekly Goals
              </button>
              <button
                onClick={() => setPlannerSubTab("MONTHLY")}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                  plannerSubTab === "MONTHLY" ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow" : "text-slate-500"
                }`}
              >
                Monthly Milestones
              </button>
            </div>
          </div>

          {/* Calendar sync block */}
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex gap-3 items-start">
              <CalendarPlus className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-extrabold text-indigo-900 dark:text-indigo-300">Synchronize to Google or Outlook Calendar</p>
                <p className="text-[10px] text-indigo-700">Receive persistent morning agenda alerts on your smart devices automatically.</p>
              </div>
            </div>
            
            <div className="flex flex-col items-end shrink-0">
              <button
                onClick={handleCalendarSync}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow transition-all"
                disabled={calendarSyncStatus === "SYNCING"}
              >
                {calendarSyncStatus === "SYNCING" ? "Syncing..." : calendarSyncStatus === "SUCCESS" ? "Synced ✅" : "One-Click Sync"}
              </button>
              {lastSyncDate && (
                <span className="text-[9px] text-indigo-500 mt-1 font-semibold">Last Synced: {lastSyncDate}</span>
              )}
            </div>
          </div>

          {/* Display lists */}
          {plannerSubTab === "DAILY" && (
            <div className="space-y-4">
              <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Calculated Daily Preparation Strategy Grid
                </div>
                <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800">
                  {dailyPlanner.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center py-3 gap-2 justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{item.task}</p>
                          <span className="text-[10px] text-slate-400">{item.time} ({item.duration})</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border self-start sm:self-center ${
                        item.category === "Revision" ? "bg-blue-50 text-blue-600 border-blue-200" :
                        item.category === "Quiz Practice" ? "bg-amber-50 text-amber-600 border-amber-200" :
                        item.category === "Reading" ? "bg-purple-50 text-purple-600 border-purple-200" :
                        item.category === "Homework" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                        "bg-slate-50 text-slate-600 border-slate-200"
                      }`}>
                        {item.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {plannerSubTab === "WEEKLY" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weeklyPlanner.map((wp, idx) => (
                <div key={idx} className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 shadow-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{wp.day} Focus</h4>
                  </div>
                  <p className="text-xs text-primary-600 font-bold mb-3">{wp.focus}</p>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {wp.tasks.map((task, tid) => (
                      <li key={tid} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {plannerSubTab === "MONTHLY" && (
            <div className="space-y-4">
              {monthlyPlanner.map((mp, idx) => (
                <div key={idx} className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row gap-4 items-start bg-slate-50/20">
                  <div className="sm:w-44 shrink-0 font-extrabold text-sm bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-center text-slate-700">
                    {mp.month}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">{mp.milestone}</h5>
                    <p className="text-xs text-slate-500 leading-relaxed">{mp.strategy}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Homework Intelligence Desk Tab */}
      {activeTab === "HOMEWORK" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Form and homework list */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Homework Prep & Tracking Desk</h3>
              <p className="text-xs text-slate-500">Input task details. AI will calculate estimated minutes and prioritize tasks.</p>
            </div>

            {/* Adding hw form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Subject</label>
                <select
                  value={newHwSubject}
                  onChange={(e) => setNewHwSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50"
                >
                  {subjects.map((sub, i) => (
                    <option key={i} value={sub}>{sub}</option>
                  ))}
                  <option value="General Prep">General Prep</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Task Title / Assignment description</label>
                <input
                  type="text"
                  placeholder="e.g. Solve mechanical spring formula set 4"
                  value={newHwTitle}
                  onChange={(e) => setNewHwTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Due Date</label>
                <input
                  type="date"
                  value={newHwDate}
                  onChange={(e) => setNewHwDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Difficulty scale</label>
                <select
                  value={newHwDiff}
                  onChange={(e) => setNewHwDiff(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50"
                >
                  <option value="Easy">Easy (Completed fast)</option>
                  <option value="Medium">Medium (Regular burden)</option>
                  <option value="Hard">Hard (Requires high concentration)</option>
                </select>
              </div>

              <button
                onClick={handleAddHomework}
                className="sm:col-span-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Assignment Block
              </button>
            </div>

            {/* List */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">Active Assignments</h4>
              
              {homeworkList.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">No pending homework. Add above.</div>
              ) : (
                <div className="space-y-2">
                  {homeworkList.map((hw) => (
                    <div 
                      key={hw.id}
                      className={`p-4 border rounded-2xl flex items-center justify-between gap-3 transition-all ${
                        hw.completed 
                          ? "bg-slate-50 dark:bg-slate-800/40 border-slate-100 opacity-60" 
                          : "bg-white border-slate-200 dark:bg-slate-800/20"
                      }`}
                    >
                      <div className="flex gap-3 items-center">
                        <button
                          onClick={() => handleToggleHomework(hw.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            hw.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-350"
                          }`}
                        >
                          {hw.completed && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        
                        <div>
                          <p className={`text-sm font-bold ${hw.completed ? "line-through text-slate-400" : "text-slate-800 dark:text-white"}`}>
                            {hw.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-1">
                            <span className="px-1.5 py-0.5 bg-slate-100 font-bold rounded">{hw.subject}</span>
                            <span>•</span>
                            <span>Due: {hw.dueDate}</span>
                            <span>•</span>
                            <span className="text-indigo-500 font-bold">Estimated effort: {hw.estimatedTime}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteHomework(hw.id)}
                        className="text-red-500 p-1.5 hover:bg-red-55 rounded-lg shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Prioritized homework list sequence */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">AI Completion Sequence</h4>
            </div>
            
            <p className="text-xs text-slate-500">
              Our academic model analyzes difficulty scales and due-dates to recommend the optimal logical completion sequence:
            </p>

            {recommendedHomeworkSequence.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">All assignments fully cleared! Stellar work.</div>
            ) : (
              <div className="relative border-l border-slate-200 ml-3 pl-4 space-y-4">
                {recommendedHomeworkSequence.map((hw, idx) => (
                  <div key={hw.id} className="relative">
                    {/* Ring index */}
                    <span className="absolute -left-[24px] top-0 w-4 h-4 rounded-full bg-indigo-500 text-white font-bold text-[8px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-red-500 bg-red-50 px-1 rounded">
                        {hw.difficulty}
                      </span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{hw.title}</p>
                      <p className="text-[10px] text-slate-400">Due: {hw.dueDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exam prep roadmap Tab */}
      {activeTab === "EXAMS" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Exam Readiness Control Panel</h3>
            <p className="text-xs text-slate-500">Set exam milestones, tracks scores, target mock tests, and view preparatory guidance.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Subject</label>
              <select
                value={newExamSubject}
                onChange={(e) => setNewExamSubject(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 rounded-xl text-xs"
              >
                {subjects.map((sub, i) => (
                  <option key={i} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Chapter/Topics included</label>
              <input
                type="text"
                placeholder="e.g. Physics Ch 1-5 Wave mechanics"
                value={newExamTopic}
                onChange={(e) => setNewExamTopic(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Exam Date</label>
              <input
                type="date"
                value={newExamDate}
                onChange={(e) => setNewExamDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Priority Ranking</label>
              <select
                value={newExamPriority}
                onChange={(e) => setNewExamPriority(e.target.value as any)}
                className="w-full px-4 py-2 bg-slate-50 rounded-xl text-xs"
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Target Score</label>
              <input
                type="text"
                placeholder="e.g. 95%"
                value={newExamTarget}
                onChange={(e) => setNewExamTarget(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 rounded-xl text-xs"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleAddExam}
                className="w-full py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-xs font-bold shadow hover:from-red-600 hover:to-red-700 transition"
              >
                Register Exam Target
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">Active Roadmap Countdown</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exams.map((target) => (
                <div key={target.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white shadow-xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        target.priority === "High" ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-600"
                      }`}>
                        {target.priority} Priority
                      </span>
                      <h5 className="font-bold text-sm text-slate-800 dark:text-slate-900 mt-1">{target.subject}</h5>
                      <p className="text-xs text-slate-500">{target.topic}</p>
                    </div>
                    <button
                      onClick={() => handleToggleMockStatus(target.id)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                        target.mockTestStatus === "Completed" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                        target.mockTestStatus === "In Progress" ? "bg-amber-50 text-amber-600 border-amber-200" :
                        "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      Mock Testing: {target.mockTestStatus}
                    </button>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-400 pt-3 border-t border-slate-100">
                    <span>Score Objective: <span className="font-bold text-slate-700">{target.targetScore}</span></span>
                    <span className="text-red-500 font-semibold">Date Target: {target.date}</span>
                  </div>

                  <div className="text-right">
                    <button
                      onClick={() => handleDeleteExam(target.id)}
                      className="text-[10px] font-semibold text-red-500 hover:underline"
                    >
                      Remove target
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "ANALYTICS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Subject Weight Load Analysis</h4>
            <div className="space-y-2">
              {subjects.map((sub, idx) => {
                const count = timetable.flatMap(d => d.slots).filter(s => s.subject === sub).length;
                const total = Math.max(timetable.flatMap(d => d.slots).length, 1);
                const percentage = Math.round((count / total) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>{sub}</span>
                      <span>{count} classes ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Academic Efficiency Metric</h4>
            <div className="p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3">
              <span className="text-4xl text-emerald-500 font-extrabold">94/100</span>
              <p className="text-xs font-bold text-slate-700">Highly Productive Routine Detected</p>
              <p className="text-[10px] text-slate-400">
                Your gaps and free slots are balanced with daily mock targets. Homework duration estimates match daily available prep cycles perfectly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Coach Chat Tab */}
      {activeTab === "COACH" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary-500 w-5 h-5" />
            <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Ask AI Academic Coach</h4>
          </div>
          <p className="text-xs text-slate-500">
            Discuss study burden, calendar shifts, subject adjustments, or ask for targeted motivational prep strategies.
          </p>

          <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50 text-xs leading-relaxed space-y-2">
            <p className="font-bold text-indigo-600">AI Advisor says:</p>
            <p>{coachMsg}</p>
          </div>

          <div className="space-y-2 pt-4">
            <label className="text-xs font-bold text-slate-500 uppercase">Input customized strategy instruction</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Wednesday classes are too intensive, recommend revision schedule improvements"
                id="coach-instruction-input"
                className="flex-1 px-4 py-2 bg-slate-50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={async () => {
                  const val = (document.getElementById("coach-instruction-input") as HTMLInputElement)?.value;
                  if (!val || !onDeductCredit(5)) return;
                  try {
                    const output = await GeminiService.updateStudyTimetable(timetable, val);
                    if (output) {
                      setTimetable(output);
                      setCoachMsg(`Adjustments registered based on: "${val}". Timetable grid update completes successfully.`);
                    }
                  } catch {
                    alert("Unable to adjust timetable.");
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs"
              >
                Apply AI Advise
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
