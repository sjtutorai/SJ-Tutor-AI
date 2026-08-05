import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AppMode, SJTUTOR_AVATAR } from "../types";
import { 
  BookOpen, BrainCircuit, Sparkles, FileText, Upload, 
  CheckCircle, FileUp, Cpu, Hourglass, Star
} from "lucide-react";

interface LoadingStateProps {
  mode: AppMode;
}

const LoadingState: React.FC<LoadingStateProps> = ({ mode }) => {
  // Common states
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [typingMessage, setTypingMessage] = useState("");

  // ==========================================
  // CONFIGURATIONS FOR DIFFERENT MODES
  // ==========================================

  // 1. QUIZ GENERATION WORKFLOW
  const quizSteps = [
    { label: "Reading Chapter", desc: "Parsing syllabus context...", icon: BookOpen },
    { label: "Understanding Concepts", desc: "Mapping scholastic themes...", icon: Cpu },
    { label: "Selecting Important Topics", desc: "Prioritizing exam weightage...", icon: Star },
    { label: "Generating Questions", desc: "Formulating challenge options...", icon: BrainCircuit },
    { label: "Balancing Difficulty", desc: "Calibrating student-level pace...", icon: Hourglass },
    { label: "Reviewing Quiz", desc: "Validating logical accuracy...", icon: CheckCircle },
    { label: "Quiz Ready", desc: "Finalizing challenge setup...", icon: Sparkles }
  ];

  // 2. PDF ANALYSIS / HOMEWORK SOLVING WORKFLOW
  const pdfSteps = [
    { label: "Uploading PDF...", desc: "Ingesting files to cloud space...", icon: FileUp },
    { label: "Reading Pages...", desc: "Scanning document contents...", icon: BookOpen },
    { label: "Extracting Text...", desc: "Running advanced optical reading...", icon: Cpu },
    { label: "Understanding Concepts...", desc: "Analyzing core queries and formulas...", icon: BrainCircuit },
    { label: "Generating Summary...", desc: "Crafting final step-by-step guidance...", icon: FileText },
    { label: "Ready!", desc: "Preparing premium interface view...", icon: Sparkles }
  ];

  // 3. AI TUTOR THINKING STATUSES
  const tutorStatuses = [
    "Understanding your question...",
    "Searching knowledge...",
    "Analyzing concepts...",
    "Generating explanation...",
    "Creating examples...",
    "Checking accuracy...",
    "Preparing response...",
    "Almost Ready..."
  ];

  // 4. NOTES / SUMMARY WRITING EFFECTS
  const notesPhrases = [
    "Opening study module...",
    "SJ Tutor AI is structuring summaries...",
    "Highlighting critical academic keywords...",
    "Adding exam-aligned callouts...",
    "Injecting beautiful formatting...",
    "Compiling interactive PDF view..."
  ];

  // Setup state timers based on the loaded mode
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (mode === AppMode.QUIZ) {
      // Transition steps smoothly over 10 seconds
      setActiveStep(0);
      setProgress(5);

      interval = setInterval(() => {
        setActiveStep((prev) => {
          const next = prev + 1;
          if (next >= quizSteps.length) {
            clearInterval(interval);
            return prev;
          }
          setProgress((next / (quizSteps.length - 1)) * 100);
          return next;
        });
      }, 1500);

    } else if (mode === AppMode.HOMEWORK || mode === AppMode.ESSAY) {
      // Transition PDF analysis steps
      setActiveStep(0);
      setProgress(10);

      interval = setInterval(() => {
        setActiveStep((prev) => {
          const next = prev + 1;
          if (next >= pdfSteps.length) {
            clearInterval(interval);
            return prev;
          }
          setProgress((next / (pdfSteps.length - 1)) * 100);
          return next;
        });
      }, 1800);

    } else if (mode === AppMode.TUTOR) {
      // Rotate statuses
      setActiveStep(0);
      interval = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % tutorStatuses.length);
      }, 2000);

    } else if (mode === AppMode.SUMMARY || mode === AppMode.NOTES) {
      // Notebook simulated writing phase
      setActiveStep(0);
      setProgress(15);
      interval = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % notesPhrases.length);
        setProgress((prev) => Math.min(prev + 15, 95));
      }, 2000);
    }

    return () => clearInterval(interval);
  }, [mode]);

  // Simulated handwriting/typing for notes loading state
  useEffect(() => {
    if (mode === AppMode.SUMMARY || mode === AppMode.NOTES) {
      const texts = [
        "SJ Tutor AI is writing your study guide...",
        "Important equations: E = mc², F = ma, A = πr²...",
        "💡 Key terms are being highlighted automatically...",
        "🎓 Generating syllabus cheat sheets...",
        "📋 Drafting summary bullet points..."
      ];
      let currentTextIdx = 0;
      let charIdx = 0;
      let textBuffer = "";
      let isDeleting = false;

      const typeTimer = setInterval(() => {
        const fullText = texts[currentTextIdx];
        if (!isDeleting) {
          textBuffer = fullText.substring(0, charIdx + 1);
          charIdx++;
          if (charIdx === fullText.length) {
            isDeleting = true;
            // Pause at completion
            clearInterval(typeTimer);
            setTimeout(() => {
              // Restart interval
              startTyping();
            }, 1500);
          }
        } else {
          textBuffer = fullText.substring(0, charIdx - 1);
          charIdx--;
          if (charIdx === 0) {
            isDeleting = false;
            currentTextIdx = (currentTextIdx + 1) % texts.length;
          }
        }
        setTypingMessage(textBuffer);
      }, 60);

      const startTyping = () => {
        // Re-triggers typewriter
      };

      return () => clearInterval(typeTimer);
    }
  }, [mode]);

  // ==========================================
  // RENDER HELPERS FOR EACH SPECIFIC ANIMATION
  // ==========================================

  // 1. AI TUTOR THINKING ANIMATION
  const renderTutorThinking = () => {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl max-w-lg w-full mx-auto">
        {/* Animated AI Orb Container */}
        <div className="relative mb-8 flex items-center justify-center">
          {/* Outer Rotating Glow Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute w-28 h-28 rounded-full border border-dashed border-primary-500/40"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            className="absolute w-32 h-32 rounded-full border border-dashed border-purple-500/20"
          />

          {/* Glowing Orb */}
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              boxShadow: [
                "0 0 20px rgba(37, 99, 235, 0.2)",
                "0 0 35px rgba(124, 58, 237, 0.4)",
                "0 0 20px rgba(37, 99, 235, 0.2)"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-primary-500 via-indigo-500 to-purple-500 flex items-center justify-center p-1 overflow-hidden"
          >
            <img 
              src={SJTUTOR_AVATAR} 
              alt="Orb avatar" 
              className="w-full h-full object-cover rounded-full" 
            />
          </motion.div>

          {/* Floating Stars */}
          <motion.div
            animate={{ y: [0, -10, 0], x: [0, 5, 0], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="absolute -top-3 -right-3 text-amber-400"
          >
            <Sparkles className="w-6 h-6 fill-amber-400" />
          </motion.div>
        </div>

        {/* Pulsing Status Label */}
        <div className="h-8 flex items-center mb-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={activeStep}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3 }}
              className="text-base font-bold bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 px-5 py-1.5 rounded-full border border-primary-100 dark:border-primary-900/40 shadow-sm"
            >
              {tutorStatuses[activeStep]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Jumping 3 Dots */}
        <div className="flex gap-2.5 items-center justify-center">
          <motion.span
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            className="w-3 h-3 bg-primary-500 rounded-full"
          />
          <motion.span
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
            className="w-3 h-3 bg-indigo-500 rounded-full"
          />
          <motion.span
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
            className="w-3 h-3 bg-purple-500 rounded-full"
          />
        </div>
      </div>
    );
  };

  // 2. QUIZ GENERATION WORKFLOW ANIMATION
  const renderQuizGeneration = () => {
    return (
      <div className="p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl max-w-xl w-full mx-auto relative overflow-hidden">
        {/* Subtle Ambient Light */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
          {/* Progress Ring (Circular Progress) */}
          <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                className="stroke-slate-100 dark:stroke-slate-800 fill-none"
                strokeWidth="6"
              />
              <motion.circle
                cx="48"
                cy="48"
                r="40"
                className="stroke-primary-500 fill-none"
                strokeWidth="6"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * progress) / 100}
                transition={{ ease: "easeInOut" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-black text-slate-800 dark:text-white">{Math.round(progress)}%</span>
            </div>
          </div>

          <div className="text-center sm:text-left">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
              <BrainCircuit className="w-5 h-5 text-primary-500" />
              Crafting Your Custom Quiz
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Building exam-aligned challenge questions with answers and feedback sheets...
            </p>
          </div>
        </div>

        {/* Checklist Steps with Green Checkmark Animations */}
        <div className="space-y-4">
          {quizSteps.map((step, idx) => {
            const isCompleted = idx < activeStep;
            const isActive = idx === activeStep;
            const Icon = step.icon;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ 
                  opacity: isCompleted || isActive ? 1 : 0.4, 
                  x: 0,
                  scale: isActive ? 1.02 : 1
                }}
                className={`flex items-start gap-4 p-3.5 rounded-xl border transition-all duration-300 ${
                  isActive 
                    ? "bg-primary-50/50 dark:bg-primary-950/20 border-primary-200 dark:border-primary-900/50 shadow-xs" 
                    : "border-transparent"
                }`}
              >
                {/* Step Indicator (Checkbox vs Bullet) */}
                <div className="flex-shrink-0 mt-0.5">
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  ) : isActive ? (
                    <div className="w-5 h-5 rounded-full border-2 border-primary-500 flex items-center justify-center">
                      <span className="w-2.5 h-2.5 bg-primary-500 rounded-full animate-ping" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-400">{idx + 1}</span>
                    </div>
                  )}
                </div>

                {/* Text Content */}
                <div className="flex-1 text-left">
                  <h4 className={`text-sm font-bold ${isActive ? "text-primary-600 dark:text-primary-400" : "text-slate-800 dark:text-slate-200"}`}>
                    {step.label}
                  </h4>
                  {isActive && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono mt-0.5 animate-pulse">
                      {step.desc}
                    </p>
                  )}
                </div>

                {/* Animated Right Icon */}
                <div className={`text-slate-300 ${isActive ? "text-primary-400 animate-pulse" : isCompleted ? "text-emerald-400" : ""}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  // 3. PDF ANALYSIS / SOLUTIONS GENERATION ANIMATION
  const renderPdfAnalysis = () => {
    return (
      <div className="p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl max-w-xl w-full mx-auto relative overflow-hidden text-center">
        {/* Floating document graphic with progress ring */}
        <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
          {/* Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="54"
              className="stroke-slate-150 dark:stroke-slate-800 fill-none"
              strokeWidth="5"
            />
            <motion.circle
              cx="64"
              cy="64"
              r="54"
              className="stroke-primary-500 fill-none"
              strokeWidth="5"
              strokeDasharray="339.12"
              strokeDashoffset={339.12 - (339.12 * progress) / 100}
              transition={{ ease: "easeInOut" }}
            />
          </svg>

          {/* Animated floating document icon */}
          <motion.div
            animate={{ 
              y: [0, -8, 0],
              rotate: [0, 2, -2, 0]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-18 h-18 rounded-2xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center shadow-md relative z-10"
          >
            <Upload className="w-8 h-8 animate-pulse" />
          </motion.div>
        </div>

        <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
          <FileUp className="w-5 h-5 text-primary-500" />
          SJ Tutor AI Homework Solver
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Scanning images, parsing complex queries, and drafting deep step-by-step solutions...
        </p>

        {/* Step List with dynamic animations */}
        <div className="mt-8 grid grid-cols-1 gap-3 max-w-sm mx-auto">
          {pdfSteps.map((step, idx) => {
            const isCompleted = idx < activeStep;
            const isActive = idx === activeStep;
            const Icon = step.icon;

            return (
              <div 
                key={idx}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isActive 
                    ? "bg-primary-50/50 dark:bg-primary-950/20 border-primary-200 dark:border-primary-900/50" 
                    : isCompleted 
                      ? "border-transparent opacity-60" 
                      : "border-transparent opacity-30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${isActive ? "bg-primary-100 text-primary-600" : isCompleted ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-xs font-bold ${isActive ? "text-primary-700 dark:text-primary-300" : isCompleted ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600"}`}>
                    {step.label}
                  </span>
                </div>

                <div>
                  {isCompleted ? (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-emerald-500"
                    >
                      <CheckCircle className="w-4 h-4 fill-current text-white bg-emerald-500 rounded-full" />
                    </motion.span>
                  ) : isActive ? (
                    <span className="text-primary-500 text-[10px] font-bold uppercase tracking-wider font-mono animate-pulse">Running</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 4. NOTES / SUMMARY WRITING ANIMATION
  const renderNotesWriting = () => {
    return (
      <div className="p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl max-w-xl w-full mx-auto relative overflow-hidden">
        {/* Notebook opens simulation */}
        <div className="relative mb-8 w-full max-w-[280px] mx-auto h-[160px] flex items-center justify-center">
          <motion.div
            initial={{ rotateY: -30, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="w-full h-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl relative shadow-lg flex p-4"
            style={{ perspective: 1000 }}
          >
            {/* Binder ring effect */}
            <div className="absolute left-1/2 top-4 bottom-4 w-1 bg-slate-300 dark:bg-slate-600 flex flex-col justify-between py-2 rounded-full -translate-x-1/2">
              <span className="w-4 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full -translate-x-1.5" />
              <span className="w-4 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full -translate-x-1.5" />
              <span className="w-4 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full -translate-x-1.5" />
              <span className="w-4 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full -translate-x-1.5" />
            </div>

            {/* Left Page (Typing/Structure Lines) */}
            <div className="w-1/2 pr-3 space-y-2 text-left border-r border-dashed border-slate-200 dark:border-slate-700">
              <div className="h-3 w-16 bg-primary-400/30 rounded animate-pulse" />
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-750 rounded" />
              <div className="h-2 w-5/6 bg-slate-200 dark:bg-slate-750 rounded" />
              {/* Highlight bar glow */}
              <motion.div 
                animate={{ width: ["0%", "100%", "0%"] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="h-2 bg-yellow-300 dark:bg-yellow-600/40 rounded shadow-sm"
              />
              <div className="h-2 w-11/12 bg-slate-200 dark:bg-slate-750 rounded" />
            </div>

            {/* Right Page (Typing & Highlight Lines) */}
            <div className="w-1/2 pl-3 space-y-2 text-left flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-3 w-12 bg-purple-400/30 rounded animate-pulse" />
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-750 rounded" />
                {/* Glowing academic keywords */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1], filter: ["brightness(1)", "brightness(1.2)", "brightness(1)"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="h-2 w-2/3 bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-[6px] text-blue-600 px-1 font-bold rounded flex items-center"
                >
                  IMPORTANT KEYWORD
                </motion.div>
                <div className="h-2 w-5/6 bg-slate-200 dark:bg-slate-750 rounded" />
              </div>

              {/* Float Document icon */}
              <div className="flex justify-end pr-1">
                <FileText className="w-6 h-6 text-primary-400 animate-bounce" />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="text-center">
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-500 animate-spin" style={{ animationDuration: "3s" }} />
            {mode === AppMode.SUMMARY ? "Generating Comprehensive Summary" : "Creating Comprehensive Study Notes"}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1 mb-6 uppercase tracking-wider">
            {notesPhrases[activeStep]}
          </p>

          {/* Handwriting / Typewriting Simulation */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-left min-h-[56px] flex items-center">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono border-r-2 border-primary-500 pr-1 animate-caret">
              {typingMessage}
            </span>
          </div>

          {/* Simple progress bar */}
          <div className="mt-6 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>
      </div>
    );
  };

  // Switch display depending on AppMode
  switch (mode) {
    case AppMode.TUTOR:
      return renderTutorThinking();

    case AppMode.QUIZ:
      return renderQuizGeneration();

    case AppMode.HOMEWORK:
    case AppMode.ESSAY:
      return renderPdfAnalysis();

    case AppMode.SUMMARY:
    case AppMode.NOTES:
    default:
      return renderNotesWriting();
  }
};

export default LoadingState;
