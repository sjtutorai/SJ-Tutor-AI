import React, { useState, useEffect } from 'react';
import { 
  X, Flame, Calendar, Trophy, History, Award, Sparkles, 
  BookOpen, CheckCircle2, ListTodo, ChevronRight, Info, Users, Crown, Zap, AlertCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { getStreakLeaderboardFromFirestore } from '../utils/firebaseUtils';
import { GeminiService } from '../services/geminiService';

interface StreakHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onActivityComplete: (type: 'quiz' | 'lesson' | 'assignment' | 'practice') => void;
}

const MILESTONES = [
  { days: 3, title: "Beginner Learner", desc: "First 3 days checkin!", icon: Flame, badgeColor: "from-orange-400 to-amber-500" },
  { days: 7, title: "Consistent Learner", desc: "A full week of non-stop learning!", icon: TargetCol, badgeColor: "from-amber-500 to-yellow-500" },
  { days: 15, title: "Dedicated Learner", desc: "Half a month of dedication!", icon: RewardCol, badgeColor: "from-yellow-500 to-orange-600" },
  { days: 30, title: "Streak Master", desc: "One whole month. Streak royalty!", icon: CrownCol, badgeColor: "from-orange-600 to-red-600" },
  { days: 100, title: "SJ Tutor AI Legend", desc: "100 consecutive days of mastery!", icon: LegendCol, badgeColor: "from-red-600 via-purple-600 to-indigo-600" }
];

// Inline visual icons to support colorized indicators
function TargetCol() { return <Trophy className="w-5 h-5 text-yellow-600" />; }
function RewardCol() { return <Award className="w-5 h-5 text-amber-600 animate-pulse" />; }
function CrownCol() { return <Crown className="w-5 h-5 text-orange-500" />; }
function LegendCol() { return <Crown className="w-5 h-5 text-purple-500 animate-bounce" />; }

export const StreakHubModal: React.FC<StreakHubModalProps> = ({ 
  isOpen, 
  onClose, 
  userProfile, 
  onActivityComplete 
}) => {
  const [activeTab, setActiveTab] = useState<'quest' | 'leaderboard' | 'history' | 'milestones'>('quest');
  const [leaderboard, setLeaderboard] = useState<Array<{ displayName: string; streak: number; lastActivityDate?: string }>>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  
  // Interactive mini activity states
  const [lessonTopic, setLessonTopic] = useState('Photosynthesis');
  const [lessonText, setLessonText] = useState('');
  const [generatingLesson, setGeneratingLesson] = useState(false);
  const [lessonFinished, setLessonFinished] = useState(false);

  const [assignmentDraft, setAssignmentDraft] = useState('');
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState('');
  const [assignmentFinished, setAssignmentFinished] = useState(false);

  const [practiceQuestion, setPracticeQuestion] = useState<{
    q: string;
    options: string[];
    correct: number;
    explanation: string;
  } | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [practiceAnswered, setPracticeAnswered] = useState(false);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceFinished, setPracticeFinished] = useState(false);

  useEffect(() => {
    if (activeTab === 'leaderboard' && isOpen) {
      loadLeaderboard();
    }
  }, [activeTab, isOpen]);

  const loadLeaderboard = async () => {
    setLoadingLeaderboard(true);
    const data = await getStreakLeaderboardFromFirestore();
    setLeaderboard(data);
    setLoadingLeaderboard(false);
  };

  if (!isOpen) return null;

  // Streak status computations
  const currentStreak = userProfile.streak || 0;
  const highestStreak = userProfile.highestStreak || 0;
  const lastActiveDate = userProfile.lastActivityDate || 'Never';

  // Has completed any activity today?
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const isCompletedToday = userProfile.lastActivityDate === todayStr;

  // AI Micro-Lesson Generator
  const generateLesson = async () => {
    if (!lessonTopic.trim()) return;
    setGeneratingLesson(true);
    try {
      const result = await GeminiService.processNoteAI(
        `Explain the topic: "${lessonTopic}" in 3 extremely interesting and informative sentences suitable for a student.`,
        'summarize'
      );
      setLessonText(result || "Failed to load lesson. Please try another topic.");
      setLessonFinished(false);
    } catch (e) {
      setLessonText("Unable to generate micro-lesson. Please check your network and try again.");
    } finally {
      setGeneratingLesson(false);
    }
  };

  // AI Assignment Evaluation
  const submitAssignment = async () => {
    if (!assignmentDraft.trim()) return;
    setSubmittingAssignment(true);
    try {
      const evaluation = await GeminiService.processNoteAI(
        `Review this student assignment draft briefly in 2 sentences. Highlight one strength and one improvement area. Draft: "${assignmentDraft}"`,
        'summarize'
      );
      setAssignmentResult(evaluation || "Excellent draft!");
      setAssignmentFinished(true);
      // Claim streak point
      onActivityComplete('assignment');
    } catch (e) {
      setAssignmentResult("Assignment submitted successfully!");
      setAssignmentFinished(true);
      onActivityComplete('assignment');
    } finally {
      setSubmittingAssignment(false);
    }
  };

  // AI Practice Question Generator
  const generatePracticeQuestion = async () => {
    setPracticeLoading(true);
    setSelectedOption(null);
    setPracticeAnswered(false);
    try {
      const prompt = `Generate 1 unique multiple-choice question on random school subject (Math, Science, History, or Literature) with 4 options.
Provide output STRICTLY JSON format:
{
  "q": "The question string",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct": 0,
  "explanation": "Brief explanation why option is correct"
}`;
      const response = await GeminiService.processNoteAI(prompt, 'simplify');
      
      // Attempt clean JSON extract
      const jsonStart = response.indexOf('{');
      const jsonEnd = response.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = response.slice(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);
        setPracticeQuestion({
          q: parsed.q,
          options: parsed.options,
          correct: parseInt(parsed.correct) || 0,
          explanation: parsed.explanation || ""
        });
      } else {
        throw new Error("No JSON found");
      }
    } catch (e) {
      // Fallback question
      setPracticeQuestion({
        q: "Which element has the chemical symbol 'O'?",
        options: ["Gold", "Oxygen", "Osmium", "Oganesson"],
        correct: 1,
        explanation: "O is the chemical symbol for Oxygen with atomic number 8."
      });
    } finally {
      setPracticeLoading(false);
    }
  };

  const handlePracticeSubmit = () => {
    if (selectedOption === null) return;
    setPracticeAnswered(true);
    if (selectedOption === practiceQuestion?.correct) {
      setPracticeFinished(true);
      onActivityComplete('practice');
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full h-[90vh] sm:h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Hero Area */}
        <div className="relative p-6 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative p-3 bg-white/20 rounded-2xl backdrop-blur-md animate-pulse">
              <Calendar className="w-8 h-8 text-white" />
              <Flame className="absolute -top-1 -right-1 w-6 h-6 text-yellow-300 fill-yellow-300 animate-bounce" />
            </div>
            <div>
              <h2 className="text-xl font-black flex items-center gap-1">
                Daily Study Streak <span className="text-yellow-300">🔥 {currentStreak}</span>
              </h2>
              <p className="text-xs text-white/80 font-semibold">
                {isCompletedToday 
                  ? "🎯 Streak safe today! Awesome studying." 
                  : "⚡ Complete 1 quest below to keep your streak alive!"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 px-2.5 rounded-full bg-white/20 text-white hover:bg-white/30 text-sm font-bold"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 bg-slate-50 dark:bg-slate-900 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('quest')}
            className={`py-3.5 px-4 font-black text-xs uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'quest' 
                ? 'text-orange-600 dark:text-orange-400 border-orange-500' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 border-transparent'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            Daily Quests
          </button>
          <button 
            onClick={() => setActiveTab('leaderboard')}
            className={`py-3.5 px-4 font-black text-xs uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'leaderboard' 
                ? 'text-orange-600 dark:text-orange-400 border-orange-500' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 border-transparent'
            }`}
          >
            <Users className="w-4 h-4" />
            Leaderboard
          </button>
          <button 
            onClick={() => setActiveTab('milestones')}
            className={`py-3.5 px-4 font-black text-xs uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'milestones' 
                ? 'text-orange-600 dark:text-orange-400 border-orange-500' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 border-transparent'
            }`}
          >
            <Award className="w-4 h-4" />
            Milestones
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`py-3.5 px-4 font-black text-xs uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'history' 
                ? 'text-orange-600 dark:text-orange-400 border-orange-500' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 border-transparent'
            }`}
          >
            <History className="w-4 h-4" />
            Streak History
          </button>
        </div>

        {/* Tab Content Box */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/55 dark:bg-slate-900/40">
          
          {/* 1. Daily Quests Tab */}
          {activeTab === 'quest' && (
            <div className="space-y-6">
              
              {/* Info Tips Tooltip */}
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 text-orange-850 dark:text-orange-350 rounded-xl flex items-center gap-2.5 border border-orange-200/50 text-xs">
                <Info className="w-4 h-4 text-orange-500 flex-shrink-0 animate-bounce" />
                <span className="font-bold">Keep learning daily to maintain your streak! Any activity completes today&apos;s goal.</span>
              </div>

              {/* 4 Activities List */}
              <div className="space-y-4">
                
                {/* 1. Complete Quiz */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-750 shadow-sm flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/35 text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white">Complete an Academic Quiz</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Generate a quiz via Quiz Creator in Dashboard and solve it!</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-black">
                     Dashboard Quiz
                  </span>
                </div>

                {/* 2. AI Mini Lesson */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-750 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 col-span-3">
                      <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/35 text-orange-600 dark:text-orange-400">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">Watch / Read a Micro-Lesson</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enter a topic, load your personalized AI summary & mark read!</p>
                      </div>
                    </div>
                    {lessonFinished ? (
                      <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 rounded-full text-[10px] font-black">
                        Streak Quest
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={lessonTopic}
                      onChange={(e) => setLessonTopic(e.target.value)}
                      placeholder="e.g. Quantum Physics, WW2, Fraction Rules..."
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 text-xs rounded-xl focus:border-orange-500 focus:ring-0"
                    />
                    <button 
                      onClick={generateLesson}
                      disabled={generatingLesson}
                      className="px-4 py-2 bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                      {generatingLesson ? "Generating..." : "Generate Lesson"}
                    </button>
                  </div>

                  {lessonText && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mt-2 space-y-3">
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic">
                        &quot;{lessonText}&quot;
                      </p>
                      {!lessonFinished && (
                        <button 
                          onClick={() => {
                            setLessonFinished(true);
                            onActivityComplete('lesson');
                          }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Mark Lesson as Completed
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. AI Practice Question */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-750 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/35 text-purple-600 dark:text-purple-400">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">Solve Daily Practice Question</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Solve a high-fidelity diagnostic question on random subjects.</p>
                      </div>
                    </div>
                    {practiceFinished ? (
                      <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Solved
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-105 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 rounded-full text-[10px] font-black">
                        Active Challenge
                      </span>
                    )}
                  </div>

                  {!practiceQuestion && (
                    <button 
                      onClick={generatePracticeQuestion}
                      disabled={practiceLoading}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <Sparkles className="w-4 h-4 animate-spin" />
                      {practiceLoading ? "AI is generating question..." : "Generate AI Practice Question"}
                    </button>
                  )}

                  {practiceQuestion && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mt-2 space-y-3">
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                        {practiceQuestion.q}
                      </p>
                      <div className="space-y-1.5">
                        {practiceQuestion.options.map((opt, i) => (
                          <button 
                            key={i}
                            disabled={practiceAnswered}
                            onClick={() => setSelectedOption(i)}
                            className={`w-full text-left p-2.5 text-xs rounded-lg border font-medium transition-all ${
                              selectedOption === i 
                                ? 'bg-purple-100 border-purple-400 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300' 
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>

                      {!practiceAnswered ? (
                        <button 
                          onClick={handlePracticeSubmit}
                          disabled={selectedOption === null}
                          className="w-full py-2 bg-purple-650 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black transition-all shadow-md disabled:opacity-50"
                        >
                          Submit Answer
                        </button>
                      ) : (
                        <div className="space-y-2">
                          {selectedOption === practiceQuestion.correct ? (
                            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-black border border-emerald-300">
                              🎉 Correct Answer! Great work!
                            </div>
                          ) : (
                            <div className="p-2.5 bg-red-100 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded-lg text-xs font-medium border border-red-350">
                              ❌ Incorrect. Correct was: {practiceQuestion.options[practiceQuestion.correct]}
                            </div>
                          )}
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            <span className="font-bold">Explanation:</span> {practiceQuestion.explanation}
                          </p>
                          <button 
                            onClick={generatePracticeQuestion}
                            className="w-full py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-white rounded-xl text-xs font-bold transition-all"
                          >
                            Try Another Practice Question
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Complete Assignment */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-750 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/35 text-blue-600 dark:text-blue-400">
                        <ListTodo className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">Finish study assignment draft</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Submit your notes draft or revision outline here to finish assignment.</p>
                      </div>
                    </div>
                    {assignmentFinished ? (
                      <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 rounded-full text-[10px] font-black">
                        Verification
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <textarea 
                      value={assignmentDraft}
                      onChange={(e) => setAssignmentDraft(e.target.value)}
                      placeholder="Type your notes / essay assignment study outline here... (At least 15 characters)"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 text-xs rounded-xl focus:border-blue-550 focus:ring-0 min-h-[60px]"
                    />
                    <button 
                      onClick={submitAssignment}
                      disabled={submittingAssignment || assignmentDraft.trim().length < 15}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 hover:shadow-md text-white rounded-xl text-xs font-black disabled:opacity-50 transition-all active:scale-95"
                    >
                      {submittingAssignment ? "Submitting Outline..." : "Submit Assignment Draft"}
                    </button>
                  </div>

                  {assignmentResult && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mt-2">
                      <h5 className="text-[10px] uppercase font-black tracking-wider text-slate-400 mb-1">AI Evaluation Response</h5>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic">
                        &quot;{assignmentResult}&quot;
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* 2. Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-yellow-500/10 text-yellow-800 dark:text-yellow-400 rounded-xl flex items-center gap-2 border border-yellow-500/20 text-xs">
                <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0 animate-bounce" />
                <span className="font-bold">Honoring the Top 10 Scholars! Maintain your daily learning streak to climb higher.</span>
              </div>

              {loadingLeaderboard ? (
                <div className="text-center py-10">
                  <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-bold">Querying school leaderboard...</p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Flame className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-xs font-bold">Streak Leaderboard is empty. Be the first to build a streak!</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-750 shadow-sm animate-in fade-in duration-200">
                  {leaderboard.map((user, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black ${
                          idx === 0 ? 'bg-yellow-500 text-white animate-bounce' :
                          idx === 1 ? 'bg-slate-300 text-slate-800' :
                          idx === 2 ? 'bg-amber-600 text-white' :
                          'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                            {user.displayName}
                            {idx === 0 && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">Last active: {user.lastActivityDate || 'Never'}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-orange-500 bg-orange-50 dark:bg-orange-950/40 border border-orange-200/50 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                        🔥 {user.streak}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Milestones Tab */}
          {activeTab === 'milestones' && (
            <div className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MILESTONES.map((mile) => {
                  const unlocked = currentStreak >= mile.days;
                  const Icon = mile.icon;
                  return (
                    <div 
                      key={mile.days}
                      className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                        unlocked 
                          ? `bg-gradient-to-br ${mile.badgeColor} text-white shadow-lg border-transparent relative overflow-hidden` 
                          : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 opacity-60'
                      }`}
                    >
                      {unlocked && (
                        <div className="absolute top-0 right-0 p-1 opacity-20 transform translate-x-2 -translate-y-2">
                          <Award className="w-20 h-20 text-white" />
                        </div>
                      )}
                      
                      <div className={`p-3 rounded-xl ${unlocked ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                        <Icon />
                      </div>
                      <div>
                        <h4 className="font-black text-sm">{mile.title}</h4>
                        <p className={`text-[10px] font-bold ${unlocked ? 'text-white/80' : 'text-slate-450 text-slate-500'}`}>{mile.desc}</p>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black mt-1.5 inline-block ${
                          unlocked ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}>
                          {unlocked ? "🔥 Unlocked!" : `🔥 Reach ${mile.days} Days`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Streak History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Stats Panel */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-250 dark:border-slate-700 text-center shadow-xs">
                  <Flame className="w-5 h-5 text-orange-500 fill-orange-500 mx-auto mb-1" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Streak</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white mt-1">🔥 {currentStreak}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-250 dark:border-slate-700 text-center shadow-xs">
                  <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Highest Streak</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white mt-1">⭐ {highestStreak}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-250 dark:border-slate-700 text-center shadow-xs">
                  <Calendar className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last Study</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white mt-2 truncate">{lastActiveDate}</p>
                </div>
              </div>

              {/* Complete History Cal Heatmap */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-1">
                  <History className="w-4 h-4 text-orange-500" />
                  Streak Logs Calendar Index
                </h4>
                
                {(!userProfile.streakHistory || userProfile.streakHistory.length === 0) ? (
                  <p className="text-xs text-slate-400 font-bold italic text-center py-6">
                    No streak logs yet. Start checking off quick study activities today!
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-350">Checked completed dates:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {userProfile.streakHistory.map((date) => (
                        <span 
                          key={date} 
                          className="px-2.5 py-1 text-xs border border-orange-200 dark:border-orange-850/50 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 rounded-lg font-bold flex items-center gap-1 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />
                          {date}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
        
        {/* Footer Area */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between text-xs">
          <span className="text-slate-450 text-slate-500 font-bold">Encourage daily learning & win SJ Rewards!</span>
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-black shadow-lg"
          >
            Close Panel
          </button>
        </div>

      </div>
    </div>
  );
};
