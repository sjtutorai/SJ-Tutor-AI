import React, { useState, useEffect } from "react";
import { 
  getDocs, 
  collection, 
  query, 
  where 
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { 
  Award, 
  BookOpen, 
  Calendar, 
  GraduationCap, 
  Share2, 
  ShieldAlert, 
  Sparkles, 
  Trophy, 
  User, 
  Flame, 
  QrCode, 
  ExternalLink,
  ChevronRight,
  Bookmark,
  Heart
} from "lucide-react";
import IdCardView from "./IdCardView";
import { getUserSharedContent } from "../utils/firebaseUtils";

interface StudentPublicProfileProps {
  username: string;
  onGoToApp?: () => void;
}

export const StudentPublicProfile: React.FC<StudentPublicProfileProps> = ({
  username,
  onGoToApp
}) => {
  const [student, setStudent] = useState<any>(null);
  const [sharedItems, setSharedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [streakData, setStreakData] = useState<any>(null);

  useEffect(() => {
    const fetchStudentProfile = async () => {
      setLoading(true);
      try {
        // Query user with matching username (case-insensitive or exact)
        const q = query(
          collection(db, "users"), 
          where("username", "==", username.trim().toLowerCase())
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const uid = docSnap.id;
          const profileData = { uid, ...docSnap.data() };
          setStudent(profileData);

          // Fetch shared items for this user
          const items = await getUserSharedContent(uid);
          // Only show items that are explicitly set to public
          setSharedItems(items.filter(item => item.isPublic || item.visibility === 'public'));

          // Try loading user streak if exists
          try {
            const streakQ = query(collection(db, "streaks"), where("uid", "==", uid));
            const streakSnapshot = await getDocs(streakQ);
            if (!streakSnapshot.empty) {
              setStreakData(streakSnapshot.docs[0].data());
            }
          } catch (streakErr) {
            console.warn("Could not load streak data:", streakErr);
          }
        }
      } catch (err) {
        console.error("Error fetching student profile:", err);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchStudentProfile();
    }
  }, [username]);

  const handleShareProfile = async () => {
    const link = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `SJ Tutor AI Student Profile: ${student?.displayName || username}`,
          text: `Check out ${student?.displayName || username}'s student profile on SJ Tutor AI!`,
          url: link
        });
      } else {
        await navigator.clipboard.writeText(link);
        alert("Profile link copied to clipboard!");
      }
    } catch (e) {
      console.warn("Share failed", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="space-y-4 text-center max-w-sm">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading Student Profile...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="text-center max-w-md p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl space-y-5 animate-scale-up">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-950 dark:text-white">Student Not Found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              The username <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-300">@{username}</span> does not exist or has set their profile to private.
            </p>
          </div>
          <div className="pt-3 flex gap-3">
            {onGoToApp && (
              <button 
                onClick={onGoToApp}
                className="w-full py-3 rounded-2xl text-sm font-bold bg-amber-500 text-slate-950 hover:bg-amber-600 shadow-md shadow-amber-500/10 transition-colors"
              >
                Go to SJ Tutor AI
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white">
            <GraduationCap className="w-6 h-6 text-amber-500" />
            <span className="font-bold tracking-tight text-lg">SJ Tutor AI</span>
            <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">Student Platform</span>
          </div>
          {onGoToApp && (
            <button 
              onClick={onGoToApp}
              className="text-xs font-bold text-amber-500 hover:text-amber-600 hover:underline flex items-center gap-1"
            >
              Open Workspace <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Main Grid: Left Side ID Card & Stats, Right Side Bio & Shared Resources */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (SPAN 5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Identity Card Container */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Digital Student ID Card
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleShareProfile}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all"
                    title="Share Profile Link"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setShowQr(!showQr)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all"
                    title="Toggle Profile QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Render QR code or Student ID Card */}
              {showQr ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/40 p-4 animate-scale-up">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.href)}`} 
                    alt="Student Profile QR Code" 
                    className="w-44 h-44 border p-2.5 rounded-xl bg-white shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-slate-700 dark:text-white">@{student.username || username}</p>
                    <p className="text-[10px] text-slate-400">Scan to view professional educational portfolio</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl transform hover:scale-[1.02] transition-transform duration-300">
                  <IdCardView 
                    profile={student} 
                    registrationNumber={student.registrationNumber || "SJT-AIPRO"} 
                  />
                </div>
              )}

              {/* Learning Streak & Core Information */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-5">
                <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <Flame className="w-7 h-7 text-amber-500 mb-1 animate-pulse" />
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    {streakData?.currentStreak || 0} Days
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider mt-0.5">Active Streak</span>
                </div>
                
                <div className="bg-violet-500/5 dark:bg-violet-500/10 border border-violet-500/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <Trophy className="w-7 h-7 text-violet-500 mb-1" />
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    {sharedItems.length} Links
                  </span>
                  <span className="text-[10px] text-violet-600 dark:text-violet-400 font-bold uppercase tracking-wider mt-0.5">Shared Resources</span>
                </div>
              </div>

              {/* Achievements & Badges */}
              {student.emblems && student.emblems.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" /> Earned Accolades & Badges
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {student.emblems.map((emblem: string, i: number) => (
                      <span 
                        key={i}
                        className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-full px-3 py-1 font-semibold flex items-center gap-1.5 text-slate-600 dark:text-slate-300"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        {emblem}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (SPAN 7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Bio & Academic Statement */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{student.displayName}</h2>
                <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5">
                  <span>@{student.username || username}</span>
                  {student.institution && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" /> {student.institution}
                      </span>
                    </>
                  )}
                </p>
              </div>

              {student.bio && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bio & Objective</h4>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-850/20 italic">
                    &ldquo;{student.bio}&rdquo;
                  </p>
                </div>
              )}

              {/* Learning Goals Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {student.learningGoal && (
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primary Goal</h5>
                    <div className="text-xs font-semibold p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300">
                      {student.learningGoal}
                    </div>
                  </div>
                )}
                {student.learningStyle && (
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Learning Style</h5>
                    <div className="text-xs font-semibold p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300">
                      {student.learningStyle} Method
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Publicly Shared Content list */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-500" /> Public Educational Library
                </h3>
                <span className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-500 px-2.5 py-1 rounded-full font-bold">
                  {sharedItems.length} Resource{sharedItems.length !== 1 ? 's' : ''}
                </span>
              </div>

              {sharedItems.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-slate-400">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-700 dark:text-white">No Public Resources Shared Yet</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">This student hasn&apos;t published any homework summaries, interactive quizzes, or notes yet.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sharedItems.map((item, index) => {
                    // Derive dynamic path
                    const url = `/share/${item.type?.toLowerCase() || 'summary'}/${item.shareId}`;
                    return (
                      <div 
                        key={index}
                        onClick={() => window.location.href = url}
                        className="group flex flex-col justify-between p-4 rounded-2xl border border-slate-150 dark:border-slate-850 hover:border-amber-500 bg-white dark:bg-slate-950 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                      >
                        {/* Accent band */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/20 to-amber-500 group-hover:from-amber-500 group-hover:to-amber-500/80 transition-colors" />
                        
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                              {item.type || 'Summary'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(item.createdAt || Date.now()).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                            </span>
                          </div>
                          
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-amber-500 transition-colors">
                            {item.title}
                          </h4>
                          {item.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Stats Panel */}
                        <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-800/40 pt-3 mt-4 text-[10px] text-slate-400 font-semibold">
                          <span className="flex items-center gap-1" title="Views">
                            <ExternalLink className="w-3 h-3" /> {item.views || 0}
                          </span>
                          <span className="flex items-center gap-1" title="Likes">
                            <Heart className="w-3 h-3 text-red-500/80" /> {item.likes || 0}
                          </span>
                          <span className="flex items-center gap-1" title="Bookmarks">
                            <Bookmark className="w-3 h-3 text-violet-500/80" /> {item.bookmarks || 0}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
