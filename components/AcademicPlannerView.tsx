import React, { useState, useEffect } from "react";
import { 
  Upload, Sparkles, BookOpen, Clock, Calendar, CheckCircle2, 
  Trash2, Plus, CalendarPlus, Share2, Award, 
  TrendingUp, Compass, ChevronRight, 
  Clock3, BarChart2, MessageSquare, ShieldAlert,
  CheckSquare, Square, RotateCcw, FileText, CheckCircle, Activity
} from "lucide-react";
import { GeminiService } from "../services/geminiService";
import { 
  createSharedContent, 
  saveSyllabusPlanToFirestore, 
  getSyllabusPlanFromFirestore 
} from "../utils/firebaseUtils";
import { TimetableEntry } from "../types";
import { useStreak } from "./StreakContext";

export interface SyllabusChapter {
  id: string;
  subject: string;
  chapterName: string;
  difficulty: "Easy" | "Medium" | "Hard";
  importance: "High" | "Medium" | "Low";
  estimatedCompletionTime: string;
  revisionRequirements: string;
  completed: boolean;
}

export interface SyllabusPlan {
  subjects: string[];
  chapters: SyllabusChapter[];
  dailyPlan: { time: string; task: string; category: string; duration: string }[];
  weeklyPlan: { day: string; focus: string; tasks: string[] }[];
  monthlyPlan: { month: string; milestone: string; strategy: string }[];
  revisionSchedule: { chapterName: string; subject: string; scheduledDate: string; focus: string; completed?: boolean }[];
  mockTestSchedule: { chapterName: string; subject: string; scheduledDate: string; targetScore: string; completed?: boolean }[];
  totalChapters: number;
  completedChapters: number;
  remainingChapters: number;
  estimatedCompletionDate: string;
  studyHoursRequired: number;
}

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

export const DEFAULT_SYLLABUS_PLAN: SyllabusPlan = {
  subjects: ["Mathematics", "Physics", "Chemistry", "Biology"],
  totalChapters: 8,
  completedChapters: 4,
  remainingChapters: 4,
  estimatedCompletionDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  studyHoursRequired: 41,
  chapters: [
    {
      id: "ch1",
      subject: "Mathematics",
      chapterName: "Quadratic Equations",
      difficulty: "Medium",
      importance: "High",
      estimatedCompletionTime: "5 Hours",
      revisionRequirements: "Practice standard factorisation formulas and verbal word problems",
      completed: true
    },
    {
      id: "ch2",
      subject: "Mathematics",
      chapterName: "Arithmetic Progressions",
      difficulty: "Easy",
      importance: "Medium",
      estimatedCompletionTime: "3 Hours",
      revisionRequirements: "Memorise n-th term and sum of first n terms equation patterns",
      completed: true
    },
    {
      id: "ch3",
      subject: "Physics",
      chapterName: "Light: Reflection & Refraction",
      difficulty: "Hard",
      importance: "High",
      estimatedCompletionTime: "6 Hours",
      revisionRequirements: "Sketch concave mirror ray diagrams & solve power of lens numerical problems",
      completed: false
    },
    {
      id: "ch4",
      subject: "Physics",
      chapterName: "Human Eye & Colorful World",
      difficulty: "Medium",
      importance: "Medium",
      estimatedCompletionTime: "4 Hours",
      revisionRequirements: "Label diagram of eye defects (myopia/hypermetropia) & corrective lenses",
      completed: false
    },
    {
      id: "ch5",
      subject: "Chemistry",
      chapterName: "Chemical Reactions & Equations",
      difficulty: "Medium",
      importance: "High",
      estimatedCompletionTime: "4 Hours",
      revisionRequirements: "Practice balancing displacement & redox reaction symbol tables",
      completed: true
    },
    {
      id: "ch6",
      subject: "Chemistry",
      chapterName: "Acids, Bases & Salts",
      difficulty: "Easy",
      importance: "High",
      estimatedCompletionTime: "4 Hours",
      revisionRequirements: "Define pH range scale, prep reactions of baking soda & bleaching powder",
      completed: true
    },
    {
      id: "ch7",
      subject: "Biology",
      chapterName: "Life Processes",
      difficulty: "Hard",
      importance: "High",
      estimatedCompletionTime: "8 Hours",
      revisionRequirements: "Understand digestive pathway and trace double-circulation heart flow mechanism",
      completed: false
    },
    {
      id: "ch8",
      subject: "Biology",
      chapterName: "Control & Coordination",
      difficulty: "Medium",
      importance: "Medium",
      estimatedCompletionTime: "7 Hours",
      revisionRequirements: "Draw reflex arc path and list critical plant growth hormones",
      completed: false
    }
  ],
  dailyPlan: [
    { time: "06:30 AM - 08:30 AM", task: "Solve Physics lens power numerical problems", category: "Active Revision", duration: "2 Hours" },
    { time: "04:30 PM - 05:30 PM", task: "Read Acids, Bases pH standard tables", category: "Reading", duration: "1 Hour" },
    { time: "07:00 PM - 08:00 PM", task: "Complete chemistry active notes summaries", category: "Revision Work", duration: "1 Hour" }
  ],
  weeklyPlan: [
    { day: "Monday", focus: "Optics & Electrolytic Refining", tasks: ["Practice redox equation balancing list", "Complete 20-min simple formula recitation quiz"] },
    { day: "Wednesday", focus: "Biology Diagrams & Organisms", tasks: ["Sketch human nephron and double-circulation structure", "Summarise anaerobic vs aerobic respiration pathways"] },
    { day: "Friday", focus: "Physics Refraction & Focal calculations", tasks: ["Perform refraction glass slab calculations", "Resolve practice sheets light refraction chapters"] }
  ],
  monthlyPlan: [
    { month: "Month 1 (June)", milestone: "Optics Foundations mastery", strategy: "Complete Light chapter and redox reaction symbol balance sheets." },
    { month: "Month 2 (July)", milestone: "Diagnostic Physiology Diagrams completion", strategy: "Practice naming eye defect rectifications and digestive routes." },
    { month: "Month 3 (August)", milestone: "Revision and preparatory simulation test papers", strategy: "Execute 10 mock quizzes and resolve 5 previous board question sets." }
  ],
  revisionSchedule: [
    { chapterName: "Quadratic Equations", subject: "Mathematics", scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], focus: "Factorisation and formula proofs", completed: true },
    { chapterName: "Chemical Reactions & Equations", subject: "Chemistry", scheduledDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], focus: "Redox reaction balanced symbols workbook", completed: false }
  ],
  mockTestSchedule: [
    { chapterName: "Quadratic Equations", subject: "Mathematics", scheduledDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], targetScore: "95%", completed: true },
    { chapterName: "Chemical Reactions", subject: "Chemistry", scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], targetScore: "90%", completed: false }
  ]
};

export const AcademicPlannerView: React.FC<AcademicPlannerViewProps> = ({ userId, onDeductCredit }) => {
  // Config state
  const [activeTab, setActiveTab] = useState<"LAUNCH" | "PLANNER" | "HOMEWORK" | "EXAMS" | "ANALYTICS" | "COACH" | "SYLLABUS">("LAUNCH");
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

  // Syllabus AI state variables
  const { recordActivity } = useStreak();
  const [syllabusPlan, setSyllabusPlan] = useState<SyllabusPlan | null>(null);
  const [isSyllabusLoading, setIsSyllabusLoading] = useState(false);
  const [syllabusText, setSyllabusText] = useState("");
  const [syllabusFeedback, setSyllabusFeedback] = useState("");
  const [missedDaysPrompt, setMissedDaysPrompt] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);

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

  // Auto load user saved custom state from localstorage and firestore
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

    // Load Syllabus plan
    const savedSyllabus = localStorage.getItem(`sjtutor_syllabus_${key}`);
    if (savedSyllabus) {
      try {
        setSyllabusPlan(JSON.parse(savedSyllabus));
      } catch (e) {
        console.warn("Error parsing local stored syllabus plan", e);
      }
    } else {
      setSyllabusPlan(DEFAULT_SYLLABUS_PLAN);
    }

    if (userId && userId !== "guest") {
      getSyllabusPlanFromFirestore(userId).then((cloudPlan) => {
        if (cloudPlan) {
          setSyllabusPlan(cloudPlan);
          localStorage.setItem(`sjtutor_syllabus_${userId}`, JSON.stringify(cloudPlan));
        }
      });
    }
  }, [userId]);

  // Persist Syllabus state function
  const saveSyllabusPlan = async (newPlan: SyllabusPlan | null) => {
    setSyllabusPlan(newPlan);
    const key = userId || "guest_planner";
    if (newPlan) {
      localStorage.setItem(`sjtutor_syllabus_${key}`, JSON.stringify(newPlan));
      if (userId && userId !== "guest") {
        await saveSyllabusPlanToFirestore(userId, newPlan);
      }
    } else {
      localStorage.removeItem(`sjtutor_syllabus_${key}`);
    }
  };

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

  // Syllabus AI Handlers
  const handleToggleChapterState = async (chapterId: string) => {
    if (!syllabusPlan) return;
    
    const updatedChapters = syllabusPlan.chapters.map(c => {
      if (c.id === chapterId) {
        const nextCompleted = !c.completed;
        
        // Trigger Study Streaks call!
        if (nextCompleted) {
          recordActivity().then(res => {
            if (res && res.incremented) {
              setSyllabusFeedback("Completing chapter advanced your daily study streak! Keep up the brilliant momentum! 🔥🌱");
              setTimeout(() => setSyllabusFeedback(""), 6000);
            }
          });
        }
        
        return { ...c, completed: nextCompleted };
      }
      return c;
    });

    const completedCount = updatedChapters.filter(c => c.completed).length;
    const remainingCount = updatedChapters.length - completedCount;

    const updatedPlan: SyllabusPlan = {
      ...syllabusPlan,
      chapters: updatedChapters,
      completedChapters: completedCount,
      remainingChapters: remainingCount
    };

    await saveSyllabusPlan(updatedPlan);
  };

  const handleGenerateSyllabusPlanAction = async (type: "text" | "file", fileData?: { base64: string, name: string }) => {
    const cost = 12;
    if (!onDeductCredit(cost)) {
      setErrorMessage(`Insufficient credits! Generating a premium study syllabus roadmap costs ${cost} credits.`);
      return;
    }

    setIsSyllabusLoading(true);
    setErrorMessage("");

    try {
      let result;
      if (type === "text") {
        if (!syllabusText.trim()) {
          setErrorMessage("Please paste or type your syllabus text first.");
          setIsSyllabusLoading(false);
          return;
        }
        result = await GeminiService.generateSyllabusPlan("text", syllabusText);
      } else {
        if (!fileData) {
          setErrorMessage("No file selected.");
          setIsSyllabusLoading(false);
          return;
        }
        result = await GeminiService.generateSyllabusPlan("file", fileData.base64, fileData.name);
      }

      if (result) {
        const total = result.chapters?.length || 0;
        const newPlan: SyllabusPlan = {
          subjects: result.subjects || ["Syllabus Draft"],
          chapters: (result.chapters || []).map((ch: any, i: number) => ({
            ...ch,
            id: ch.id || `ch_${Date.now()}_${i}`,
            completed: false
          })),
          dailyPlan: result.dailyPlan || [],
          weeklyPlan: result.weeklyPlan || [],
          monthlyPlan: result.monthlyPlan || [],
          revisionSchedule: (result.revisionSchedule || []).map((rev: any) => ({ ...rev, completed: false })),
          mockTestSchedule: (result.mockTestSchedule || []).map((mock: any) => ({ ...mock, completed: false })),
          totalChapters: total,
          completedChapters: 0,
          remainingChapters: total,
          estimatedCompletionDate: result.analytics?.estimatedCompletionDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          studyHoursRequired: result.analytics?.studyHoursRequired || 30
        };

        await saveSyllabusPlan(newPlan);
        setSyllabusFeedback("Personalized study roadmap successfully generated! Your academic coach dashboard is ready. 🎓✨");
        setSyllabusText("");
        setTimeout(() => setSyllabusFeedback(""), 6000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`AI Coach service encountered an error while analyzing your syllabus: ${err.message || err}`);
    } finally {
      setIsSyllabusLoading(false);
    }
  };

  const handleRegenerateSyllabus = async () => {
    if (!syllabusPlan) return;
    if (!missedDaysPrompt.trim()) {
      alert("Please specify why you need to reschedule (e.g. 'missed 2 days', 'want faster pace').");
      return;
    }

    const cost = 8;
    if (!onDeductCredit(cost)) {
      alert(`Recalculating roadmap requires ${cost} credits.`);
      return;
    }

    setIsRegenerating(true);
    setSyllabusFeedback("");

    try {
      const completedList = syllabusPlan.chapters.filter(c => c.completed).map(c => c.chapterName);
      const remainingList = syllabusPlan.chapters.filter(c => !c.completed).map(c => c.chapterName);
      
      const contextInstruction = `
        REGISTRATION SHIFT REQUEST:
        The student requests rescheduling because: "${missedDaysPrompt}".
        
        CRITICAL CONDITIONS:
        - Already Completed Chapters (PRESERVE THESE AS COMPLETED): ${JSON.stringify(completedList)}
        - Chapters that remain (RESCHEDULE AND ADAPT STUDY PLAN FOR THESE ONLY): ${JSON.stringify(remainingList)}
        
        Please adjust the daily, weekly, monthly, revision and mock exam schedules dynamically based on these parameters. Keep completed chapters untouched but align remaining ones to fit new dates.
      `;

      const syllabusOutline = `Subjects: ${JSON.stringify(syllabusPlan.subjects)}. Chapters: ${JSON.stringify(syllabusPlan.chapters)}`;
      const result = await GeminiService.generateSyllabusPlan("text", syllabusOutline, undefined, contextInstruction);

      if (result) {
        const updatedChapters = syllabusPlan.chapters.map(orig => {
          const match = result.chapters?.find((r: any) => r.chapterName.toLowerCase() === orig.chapterName.toLowerCase());
          if (match) {
            return {
              ...orig,
              difficulty: match.difficulty || orig.difficulty,
              importance: match.importance || orig.importance,
              estimatedCompletionTime: match.estimatedCompletionTime || orig.estimatedCompletionTime,
              revisionRequirements: match.revisionRequirements || orig.revisionRequirements
            };
          }
          return orig;
        });

        const updatedPlan: SyllabusPlan = {
          subjects: result.subjects || syllabusPlan.subjects,
          chapters: updatedChapters,
          dailyPlan: result.dailyPlan || syllabusPlan.dailyPlan,
          weeklyPlan: result.weeklyPlan || syllabusPlan.weeklyPlan,
          monthlyPlan: result.monthlyPlan || syllabusPlan.monthlyPlan,
          revisionSchedule: result.revisionSchedule || syllabusPlan.revisionSchedule,
          mockTestSchedule: result.mockTestSchedule || syllabusPlan.mockTestSchedule,
          totalChapters: syllabusPlan.totalChapters,
          completedChapters: syllabusPlan.completedChapters,
          remainingChapters: syllabusPlan.remainingChapters,
          estimatedCompletionDate: result.analytics?.estimatedCompletionDate || syllabusPlan.estimatedCompletionDate,
          studyHoursRequired: result.analytics?.studyHoursRequired || syllabusPlan.studyHoursRequired
        };

        await saveSyllabusPlan(updatedPlan);
        setSyllabusFeedback("Roadmap recalculated! Your study schedule has been updated beautifully. 🚀");
        setMissedDaysPrompt("");
        setTimeout(() => setSyllabusFeedback(""), 6000);
      }
    } catch (err: any) {
      console.error(err);
      alert("Unable to recalculate schedule. " + err.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const syncChapterToHomework = (chapter: SyllabusChapter) => {
    try {
      const isAlreadyHw = homeworkList.some(h => h.title.includes(chapter.chapterName));
      if (isAlreadyHw) {
        setSyllabusFeedback(`A homework task for "${chapter.chapterName}" is already registered!`);
        setTimeout(() => setSyllabusFeedback(""), 5000);
        return;
      }
      
      const newHw: HomeworkItem = {
        id: Date.now().toString() + "_" + Math.floor(Math.random() * 1000).toString(),
        subject: chapter.subject,
        title: `Comprehensive Study & Revision - ${chapter.chapterName}`,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        difficulty: chapter.difficulty,
        estimatedTime: chapter.estimatedCompletionTime,
        completed: false
      };
      
      const updated = [newHw, ...homeworkList];
      setHomeworkList(updated);
      saveStateToStorage(timetable, updated, exams);
      setSyllabusFeedback(`Syllabus homework for "${chapter.chapterName}" synced with "Homework Prep Desk"! 📚`);
      setTimeout(() => setSyllabusFeedback(""), 5000);
    } catch (err) {
      console.warn(err);
    }
  };

  const syncMockToExams = (mock: any) => {
    try {
      const isAlreadyExam = exams.some(e => e.topic.includes(mock.chapterName));
      if (isAlreadyExam) {
        setSyllabusFeedback(`A preparatory mock exam for "${mock.chapterName}" already exists!`);
        setTimeout(() => setSyllabusFeedback(""), 5000);
        return;
      }
      
      const newExam: ExamTarget = {
        id: Date.now().toString() + "_" + Math.floor(Math.random() * 1000).toString(),
        subject: mock.subject,
        topic: `Syllabus Mock: ${mock.chapterName}`,
        date: mock.scheduledDate,
        priority: "High",
        targetScore: mock.targetScore || "90%",
        mockTestStatus: "Pending"
      };
      
      const updated = [newExam, ...exams];
      setExams(updated);
      saveStateToStorage(timetable, homeworkList, updated);
      setSyllabusFeedback(`Preparatory Mock scheduled for "${mock.chapterName}" synced with "Exam Preparation"! 🎯`);
      setTimeout(() => setSyllabusFeedback(""), 5000);
    } catch (err) {
      console.warn(err);
    }
  };

  const syncToNotes = (chapter: SyllabusChapter) => {
    try {
      const key = userId || "guest";
      const existingNotesRaw = localStorage.getItem(`notes_${key}`);
      const existingNotesList = existingNotesRaw ? JSON.parse(existingNotesRaw) : [];
      
      const newNote = {
        id: Date.now().toString() + "_" + Math.floor(Math.random() * 1000).toString(),
        title: `Theory Guide: ${chapter.chapterName}`,
        content: `# Study Guide: ${chapter.chapterName}\n\n### Subject: ${chapter.subject}\n### Difficulty: ${chapter.difficulty} | Importance: ${chapter.importance}\n\n---\n\n## 📝 Core Concepts\n- Summarize the core theorems or structural foundations for this chapter here.\n- Focus on formulas, key diagrams, and critical study references.\n\n## 💡 Revision Directives\n${chapter.revisionRequirements}\n\n---\n*Drafted automatically by your SJ Tutor AI Academic Coach*`,
        subject: chapter.subject,
        chapter: chapter.chapterName,
        template: "Revision",
        status: "New",
        isFavorite: true,
        date: Date.now(),
        tags: ["Syllabus", "Coach", chapter.difficulty]
      };
      
      localStorage.setItem(`notes_${key}`, JSON.stringify([newNote, ...existingNotesList]));
      setSyllabusFeedback(`Study Guide for "${chapter.chapterName}" drafted successfully in your Notes Screen! 📁`);
      setTimeout(() => setSyllabusFeedback(""), 5000);
    } catch (err) {
      console.error(err);
      alert("Unable to generate notes draft.");
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
          onClick={() => setActiveTab("SYLLABUS")}
          className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === "SYLLABUS"
              ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20"
              : "text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500 dark:text-white" />
          Syllabus Study Coach
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

      {/* Syllabus AI Timetable Creator Tab */}
      {activeTab === "SYLLABUS" && (
        <div className="space-y-6" id="syllabus-planner-root">
          {/* Header Description */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                Personal AI Academic Coach
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">Syllabus-Based AI Timetable</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Convert manual syllabus text outlines or uploaded documents into a fully tailored chapter-by-chapter roadmap.</p>
            </div>
            
            {syllabusPlan && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to discard this syllabus roadmap and start fresh?")) {
                    saveSyllabusPlan(null);
                  }
                }}
                className="px-4 py-2 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start md:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset & Upload New Syllabus
              </button>
            )}
          </div>

          {/* User notifications / action feedback */}
          {syllabusFeedback && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-inner">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              {syllabusFeedback}
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-250 dark:border-red-800 text-red-700 dark:text-red-400 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              {errorMessage}
            </div>
          )}

          {/* STATE A: No syllabus has been setup yet */}
          {!syllabusPlan && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Uploader Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4">
                <h4 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  Option A: Upload Syllabus Document
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload an image syllabus screenshot, high-level course PDF, spreadsheet excel file, or Word assignment outline.
                </p>

                <div 
                  onDragEnter={handleDrag} 
                  onDragOver={handleDrag} 
                  onDragLeave={handleDrag} 
                  onDrop={async (e) => {
                    handleDrag(e);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        const base64 = event.target?.result as string;
                        await handleGenerateSyllabusPlanAction("file", { base64, name: file.name });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                    dragActive 
                      ? "border-primary-500 bg-primary-50/20 dark:bg-primary-900/10 animate-pulse" 
                      : "border-slate-300 dark:border-slate-800 hover:border-slate-400"
                  }`}
                >
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Drag and drop file here
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Supports PDF, docx, png, jpg, excel</span>
                  
                  <input 
                    type="file" 
                    id="syllabus-file-picker" 
                    className="hidden" 
                    accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const base64 = event.target?.result as string;
                          await handleGenerateSyllabusPlanAction("file", { base64, name: file.name });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => document.getElementById("syllabus-file-picker")?.click()}
                    className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Select Syllabus File
                  </button>
                </div>
              </div>

              {/* Text Input Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4">
                <h4 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                  Option B: Paste Syllabus Draft Text
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Got an email message or manual chapter list? Paste it here directly. Our AI coach will parse, tag, and schedule everything for you.
                </p>

                <textarea
                  value={syllabusText}
                  onChange={(e) => setSyllabusText(e.target.value)}
                  placeholder={`Example:
Mathematics Class X:
Chapter 1: Real Numbers (Difficulty: Easy, Importance: Medium)
Chapter 2: Polynomials
Chapter 3: Pair of Linear Equations (Must master basic formula worksheets)
Chapter 4: Quadratic Equations`}
                  className="w-full h-40 p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none text-slate-800 dark:text-white"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">✨ Deducts 12 premium credits</span>
                  <button
                    onClick={() => handleGenerateSyllabusPlanAction("text")}
                    disabled={isSyllabusLoading}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/10 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSyllabusLoading ? (
                      <>
                        <Clock3 className="w-3.5 h-3.5 animate-spin" />
                        AI Architect Thinking...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Build Study Roadmap
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading Animation overlay State */}
          {isSyllabusLoading && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
                <Sparkles className="w-8 h-8 animate-spin" />
              </div>
              <h4 className="text-lg font-extrabold text-slate-800 dark:text-white">AI Coach Structuring Your Timetable...</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Our Gemini neural network is extracting subjects, grading chapter complexities, estimating required hours, and drafting optimal revision cycles. This may take up to 20 seconds.
              </p>
            </div>
          )}

          {/* STATE B: Syllabus is loaded and active */}
          {syllabusPlan && !isSyllabusLoading && (
            <div className="space-y-6">
              {/* Analytics Summary Dashboard */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Chapters</span>
                  <span className="text-2xl font-extrabold text-slate-800 dark:text-white block mt-1">{syllabusPlan.totalChapters}</span>
                  <div className="mt-1.5 text-[9px] text-slate-400 font-medium">Extracted from syllabus</div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-center col-span-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Chapters Completed</span>
                  <div className="flex items-center justify-center gap-3 mt-1">
                    <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                      {syllabusPlan.completedChapters} <span className="text-xs text-slate-400">/ {syllabusPlan.totalChapters}</span>
                    </span>
                    <div className="w-16 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full transition-all duration-500" 
                        style={{ width: `${(syllabusPlan.completedChapters / syllabusPlan.totalChapters) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-indigo-500 font-bold font-mono">
                      {Math.round((syllabusPlan.completedChapters / (syllabusPlan.totalChapters || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="mt-1 text-[9px] text-emerald-500 font-semibold flex items-center justify-center gap-1">
                    <Activity className="w-3 h-3" />
                    Completing chapters advances daily streaks!
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Estimated Date</span>
                  <span className="text-xs font-extrabold text-amber-600 block mt-2.5 truncate font-mono">{syllabusPlan.estimatedCompletionDate}</span>
                  <div className="mt-1 text-[9px] text-slate-400">Plan completion goal</div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Required Hours</span>
                  <span className="text-2xl font-extrabold text-cyan-600 block mt-1 font-mono">{syllabusPlan.studyHoursRequired} Hrs</span>
                  <div className="mt-1.5 text-[9px] text-slate-400">Total estimated focus</div>
                </div>
              </div>

              {/* Subject Badges Panel */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Tracked Subjects:</span>
                {syllabusPlan.subjects.map((sub, i) => (
                  <span key={i} className="px-2.5 py-1 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold">
                    {sub}
                  </span>
                ))}
              </div>

              {/* Core Chapter Cards Layout Grid */}
              <div className="space-y-4">
                <h4 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  Your Chapter Study Roadmap
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {syllabusPlan.chapters.map((chapter) => (
                    <div 
                      key={chapter.id} 
                      className={`p-5 rounded-3xl border transition-all relative flex flex-col justify-between ${
                        chapter.completed 
                          ? "bg-slate-50/50 dark:bg-slate-950/20 border-emerald-500/25 dark:border-emerald-500/15 opacity-80" 
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 shadow-sm"
                      }`}
                    >
                      <div>
                        {/* Upper Header and Difficulty Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-[9px] font-extrabold rounded-md block uppercase tracking-wider">
                            {chapter.subject}
                          </span>
                          
                          <div className="flex gap-1.5">
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md block ${
                              chapter.difficulty === "Easy" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-400" :
                              chapter.difficulty === "Medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/35 dark:text-amber-400" :
                              "bg-red-100 text-red-700 dark:bg-red-950/35 dark:text-red-400"
                            }`}>
                              {chapter.difficulty}
                            </span>
                            
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-bold rounded-md block">
                              Imp: {chapter.importance}
                            </span>
                          </div>
                        </div>

                        {/* Title and Completion Button */}
                        <div className="flex items-start gap-3 mt-3">
                          <button 
                            type="button"
                            onClick={() => handleToggleChapterState(chapter.id)}
                            className="mt-1 transition-all flex-shrink-0"
                          >
                            {chapter.completed ? (
                              <CheckSquare className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-transparent" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300 dark:text-slate-700 hover:text-slate-400" />
                            )}
                          </button>
                          
                          <div>
                            <h5 className={`text-sm font-bold text-slate-800 dark:text-white ${chapter.completed ? "line-through text-slate-400 dark:text-slate-500 font-medium" : ""}`}>
                              {chapter.chapterName}
                            </h5>
                            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3" />
                              Estimated prep time: {chapter.estimatedCompletionTime}
                            </span>
                          </div>
                        </div>

                        {/* AI Coach Directives */}
                        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 italic font-medium">
                          <span className="font-bold text-[10px] text-indigo-500 not-italic block mb-0.5">AI Guidelines:</span>
                          &ldquo;{chapter.revisionRequirements}&rdquo;
                        </div>
                      </div>

                      {/* Sync triggers */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => syncChapterToHomework(chapter)}
                          className="px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center gap-1 transition-all"
                        >
                          <CalendarPlus className="w-3 h-3" />
                          Sync Homework
                        </button>

                        <button
                          onClick={() => syncToNotes(chapter)}
                          className="px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center gap-1 transition-all"
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          Draft Study Notes
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab("COACH");
                            setCoachMsg(`Hello AI coach! Can you generate a complete mock quiz for the chapter "${chapter.chapterName}" of ${chapter.subject}? I want to check my mastery level.`);
                          }}
                          className="px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center gap-1 transition-all ml-auto"
                        >
                          <Award className="w-3 h-3 text-indigo-500" />
                          Generate Quiz
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Study Schedules tabs (Daily Plans, Weekly Plans, Revision calendars) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">Generated Study Calendars</h4>
                    <p className="text-[10px] text-slate-400">AI structured slots designed around your extracted modules</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Daily list */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-50 dark:border-slate-800">
                      <Clock className="w-3.5 h-3.5" />
                      Daily Prep Slots
                    </h5>
                    {syllabusPlan.dailyPlan.map((d, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400 font-bold block font-mono">{d.time}</span>
                          <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[8px] font-extrabold rounded">
                            {d.category}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">{d.task}</p>
                        <span className="text-[9px] text-slate-400 font-medium block">Planned Duration: {d.duration}</span>
                      </div>
                    ))}
                  </div>

                  {/* Weekly routine */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-50 dark:border-slate-800">
                      <Calendar className="w-3.5 h-3.5" />
                      Weekly Core Routine
                    </h5>
                    {syllabusPlan.weeklyPlan.map((w, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-1">
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider block font-mono">{w.day}</span>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">Focus: {w.focus}</p>
                        <ul className="list-disc list-inside text-[10px] text-slate-500 space-y-0.5 mt-1">
                          {w.tasks.map((t, tid) => (
                            <li key={tid} className="truncate">{t}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Monthly targets, revision and mock tests */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-50 dark:border-slate-800">
                      <Award className="w-3.5 h-3.5" />
                      Preparatory Mock Exams
                    </h5>
                    
                    {syllabusPlan.mockTestSchedule.map((mock, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-mono">Date: {mock.scheduledDate}</span>
                          <p className="text-xs font-extrabold text-slate-800 dark:text-white">{mock.chapterName}</p>
                          <span className="text-[8px] bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold px-1 py-0.5 rounded font-mono">
                            Target: {mock.targetScore}
                          </span>
                        </div>

                        <button
                          onClick={() => syncMockToExams(mock)}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-805 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-[9px] font-bold flex items-center gap-1 transition-all"
                        >
                          <CalendarPlus className="w-3 h-3" />
                          Register Exam
                        </button>
                      </div>
                    ))}

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <h6 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">High Level Strategy Track</h6>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                        {syllabusPlan.monthlyPlan.slice(0, 2).map((m, idx) => (
                          <div key={idx}>
                            <span className="font-bold text-slate-700 dark:text-slate-300 block">{m.month}: {m.milestone}</span>
                            <p className="text-[11px] text-slate-400 italic font-medium">&ldquo;{m.strategy}&rdquo;</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Missed days recalculation panel (Regeneration) */}
              <div className="bg-gradient-to-r from-red-500/5 to-amber-500/5 dark:from-red-950/10 dark:to-amber-950/10 border border-red-500/10 dark:border-red-505 rounded-3xl p-6 shadow-inner space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-full flex items-center justify-center shadow-inner">
                    <RotateCcw className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Missed days? Recalculate Study pace</h4>
                    <p className="text-[11px] text-slate-500">If you fell sick or missed critical days, type the shift details and our academic coach will rebuild your roadmap.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="text"
                    value={missedDaysPrompt}
                    onChange={(e) => setMissedDaysPrompt(e.target.value)}
                    placeholder="e.g. 'I was sick for 3 days and want to shift chapters to weekend focus.'"
                    className="flex-1 w-full p-2.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-white"
                  />
                  <button
                    onClick={handleRegenerateSyllabus}
                    disabled={isRegenerating}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-750 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isRegenerating ? (
                      <>
                        <Clock3 className="w-3.5 h-3.5 animate-spin" />
                        Adjusting Speeds...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        Recalculate Speed
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
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
