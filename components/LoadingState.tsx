import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AppMode } from "../types";
import Logo from "./Logo";
import { 
  BookOpen, BrainCircuit, Sparkles, FileText, Upload, 
  CheckCircle, FileUp, Cpu
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
    { label: "Understanding your topic...", desc: "Parsing syllabus & chapter context...", icon: BookOpen },
    { label: "Preparing questions...", desc: "Selecting high-yield exam concepts...", icon: Cpu },
    { label: "Generating answer options...", desc: "Formulating balanced challenge choices...", icon: BrainCircuit },
    { label: "Reviewing quiz accuracy...", desc: "Validating solutions & explanations...", icon: CheckCircle },
    { label: "Your quiz is ready!", desc: "Launching interactive challenge...", icon: Sparkles }
  ];

  // 2. PDF ANALYSIS / HOMEWORK SOLVING WORKFLOW
  const pdfSteps = [
    { label: "Reading your content...", desc: "Scanning uploaded files & questions...", icon: FileUp },
    { label: "Identifying key concepts...", desc: "Extracting formulas, definitions & queries...", icon: BookOpen },
    { label: "Organizing important points...", desc: "Structuring step-by-step derivations...", icon: Cpu },
    { label: "Generating step-by-step solution...", desc: "Validating accuracy & formatting...", icon: BrainCircuit },
    { label: "Your solution is ready!", desc: "Preparing interactive study view...", icon: Sparkles }
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
    "Reading your content...",
    "Identifying key concepts...",
    "Organizing important points...",
    "Creating your summary...",
    "Highlighting critical academic keywords...",
    "Compiling interactive study guide..."
  ];

  // Setup state timers based on the loaded mode
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (mode === AppMode.QUIZ) {
      setActiveStep(0);
      setProgress(12);

      interval = setInterval(() => {
        setActiveStep((prev) => {
          const next = prev + 1;
          if (next >= quizSteps.length) {
            clearInterval(interval);
            return prev;
          }
          setProgress(Math.round(((next + 0.2) / quizSteps.length) * 100));
          return next;
        });
      }, 1500);

    } else if (mode === AppMode.HOMEWORK || mode === AppMode.ESSAY) {
      setActiveStep(0);
      setProgress(15);

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
      }, 1600);

    } else if (mode === AppMode.TUTOR) {
      setActiveStep(0);
      interval = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % tutorStatuses.length);
      }, 1800);

    } else if (mode === AppMode.SUMMARY || mode === AppMode.NOTES) {
      setActiveStep(0);
      setProgress(18);
      interval = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % notesPhrases.length);
        setProgress((prev) => Math.min(prev + 18, 96));
      }, 1600);
    }

    return () => clearInterval(interval);
  }, [mode]);

  // Simulated handwriting/typing for notes loading state
  useEffect(() => {
    if (mode === AppMode.SUMMARY || mode === AppMode.NOTES) {
      const texts = [
        "Reading your content & syllabus context...",
        "Identifying key concepts, formulas & definitions...",
        "Organizing important points into clear headings...",
        "Creating your summary & active recall flashcards..."
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
            setTimeout(() => {
              isDeleting = true;
            }, 900);
          }
        } else {
          textBuffer = fullText.substring(0, Math.max(0, charIdx - 1));
          charIdx = Math.max(0, charIdx - 1);
          if (charIdx === 0) {
            isDeleting = false;
            currentTextIdx = (currentTextIdx + 1) % texts.length;
          }
        }
        setTypingMessage(textBuffer);
      }, 45);

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
            <Logo 
              className="w-full h-full" 
              iconOnly 
              noBorder 
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
    const activeLabel = quizSteps[Math.min(activeStep, quizSteps.length - 1)]?.label || "Understanding your topic...";
    return (
      <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto custom-scrollbar">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="p-6 sm:p-8 md:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl max-w-xl w-full relative overflow-hidden max-h-[85vh] custom-scrollbar my-auto"
        >
          {/* Subtle Ambient Light & Floating AI Particles */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
          {[0, 1, 2, 3, 4, 5].map((particleIdx) => (
            <motion.span
              key={particleIdx}
              animate={{
                y: [0, -24, 0],
                x: [0, particleIdx % 2 === 0 ? 10 : -10, 0],
                opacity: [0.2, 0.65, 0.2],
                scale: [0.85, 1.2, 0.85],
              }}
              transition={{
                duration: 3 + particleIdx * 0.45,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 pointer-events-none"
              style={{
                top: `${16 + particleIdx * 13}%`,
                left: `${12 + (particleIdx * 17) % 76}%`,
              }}
            />
          ))}

          <div className="flex flex-col sm:flex-row items-center gap-6 mb-6 border-b border-slate-100 dark:border-slate-800 pb-6 shrink-0 relative z-10">
            {/* Animated Glowing AI Orb + Progress Ring */}
            <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-dashed border-primary-400/40"
              />
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
                  strokeLinecap="round"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * progress) / 100}
                  transition={{ ease: "easeInOut", duration: 0.5 }}
                />
              </svg>
              <motion.div
                animate={{
                  scale: [1, 1.07, 1],
                  boxShadow: [
                    "0 0 14px rgba(37,99,235,0.22)",
                    "0 0 26px rgba(124,58,237,0.42)",
                    "0 0 14px rgba(37,99,235,0.22)",
                  ],
                }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-14 h-14 rounded-full bg-gradient-to-tr from-primary-600 via-indigo-600 to-violet-600 text-white flex flex-col items-center justify-center pointer-events-none shadow-md"
              >
                <span className="text-xs font-black font-mono tabular-nums">{Math.round(progress)}%</span>
              </motion.div>
            </div>

            <div className="text-center sm:text-left flex-1">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                <BrainCircuit className="w-5 h-5 text-primary-500 animate-pulse" />
                Crafting Your Custom Quiz
              </h3>
              {/* Rotating AI Status Message Pill */}
              <div className="mt-2 h-7 flex items-center justify-center sm:justify-start">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={activeLabel}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/40 border border-primary-200/70 dark:border-primary-800 text-xs font-bold text-primary-700 dark:text-primary-300"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary-500 animate-spin" style={{ animationDuration: "3s" }} />
                    {activeLabel}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Checklist Steps with Green Checkmark Animations */}
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar relative z-10">
            {quizSteps.map((step, idx) => {
              const isCompleted = idx < activeStep;
              const isActive = idx === activeStep;
              const Icon = step.icon;

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ 
                    opacity: isCompleted || isActive ? 1 : 0.45, 
                    x: 0,
                    scale: isActive ? 1.015 : 1
                  }}
                  className={`flex items-start gap-3.5 p-3 rounded-xl border transition-all duration-300 ${
                    isActive 
                      ? "bg-primary-50/60 dark:bg-primary-950/25 border-primary-200 dark:border-primary-900/50 shadow-xs" 
                      : "border-transparent"
                  }`}
                >
                  {/* Step Indicator */}
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
                    <h4 className={`text-xs sm:text-sm font-bold ${isActive ? "text-primary-600 dark:text-primary-400" : "text-slate-800 dark:text-slate-200"}`}>
                      {step.label}
                    </h4>
                    {isActive && (
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium font-mono mt-0.5">
                        {step.desc}
                      </p>
                    )}
                  </div>

                  {/* Animated Right Icon */}
                  <div className={`text-slate-300 ${isActive ? "text-primary-500 animate-pulse" : isCompleted ? "text-emerald-500" : ""}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
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

          {/* Animated floating document icon with percentage */}
          <motion.div
            animate={{ 
              y: [0, -8, 0],
              rotate: [0, 2, -2, 0]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-18 h-18 rounded-2xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex flex-col items-center justify-center shadow-md relative z-10 scan-line-overlay"
          >
            <Upload className="w-5 h-5 animate-pulse mb-1" />
            <span className="text-xs font-black">{Math.round(progress)}%</span>
          </motion.div>
        </div>

        <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
          <FileUp className="w-5 h-5 text-primary-500" />
          SJ Tutor AI Homework Solver
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Scanning documents, parsing complex queries, and drafting deep step-by-step solutions...
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
    const summaryStageItems = [
      "Reading your content...",
      "Identifying key concepts...",
      "Organizing important points...",
      "Creating your summary..."
    ];
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl max-w-xl w-full mx-auto relative overflow-hidden"
      >
        {/* Notebook opens simulation */}
        <div className="relative mb-6 w-full max-w-[280px] mx-auto h-[150px] flex items-center justify-center">
          <motion.div
            initial={{ rotateY: -30, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="w-full h-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl relative shadow-lg flex p-4 scan-line-overlay"
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
                <motion.div
                  animate={{ scale: [1, 1.05, 1], filter: ["brightness(1)", "brightness(1.2)", "brightness(1)"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="h-2 w-2/3 bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-[6px] text-blue-600 px-1 font-bold rounded flex items-center"
                >
                  KEY CONCEPT
                </motion.div>
                <div className="h-2 w-5/6 bg-slate-200 dark:bg-slate-750 rounded" />
              </div>

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

          {/* Rotating Processing Stage Pill */}
          <div className="h-7 flex items-center justify-center mt-2 mb-4">
            <AnimatePresence mode="wait">
              <motion.p
                key={activeStep}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.25 }}
                className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 border border-primary-200/70 dark:border-primary-800 px-3.5 py-1 rounded-full uppercase tracking-wider font-mono"
              >
                {notesPhrases[activeStep]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* 4-Stage Summary Processing Checklist */}
          <div className="grid grid-cols-2 gap-2 mb-5 text-left">
            {summaryStageItems.map((stageText, sIdx) => {
              const isStageDone = activeStep > sIdx;
              const isStageCurrent = activeStep % summaryStageItems.length === sIdx;
              return (
                <div
                  key={stageText}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all ${
                    isStageCurrent
                      ? 'bg-primary-50/70 dark:bg-primary-950/30 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300'
                      : isStageDone
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  {isStageDone ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : isStageCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-primary-500 animate-ping shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                  )}
                  <span className="truncate">{stageText}</span>
                </div>
              );
            })}
          </div>

          {/* Handwriting / Typewriting Simulation */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 text-left min-h-[48px] flex items-center">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono border-r-2 border-primary-500 pr-1">
              {typingMessage}
            </span>
          </div>

          {/* Smooth progress bar */}
          <div className="mt-5 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" 
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
          </div>
        </div>
      </motion.div>
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
