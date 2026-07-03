import React, { useState, useEffect } from "react";
import { Trophy, Medal, Search, RefreshCw, Award, Zap, ShieldAlert, Crown } from "lucide-react";
import { motion } from "motion/react";
import { getQuizLeaderboard } from "../utils/firebaseUtils";
import { LeaderboardEntry } from "../types";

interface QuizLeaderboardViewProps {
  currentUserId: string | null;
}

export default function QuizLeaderboardView({ currentUserId }: QuizLeaderboardViewProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "top3" | "me">("all");

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await getQuizLeaderboard();
      setLeaderboard(data);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const handleRefresh = () => {
    fetchLeaderboard();
  };

  // Filter and search
  const filteredLeaderboard = leaderboard.filter((entry) => {
    const matchesSearch = entry.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === "top3") {
      return matchesSearch && leaderboard.indexOf(entry) < 3;
    }
    if (filterType === "me") {
      const isMe = entry.uid === (currentUserId || "guest");
      return matchesSearch && isMe;
    }
    return matchesSearch;
  });

  const getRankBadge = (rankIndex: number) => {
    if (rankIndex === 0) {
      return (
        <div className="flex items-center justify-center bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 p-1.5 rounded-full border border-amber-200 dark:border-amber-800/40 w-8 h-8 shadow-xs">
          <Crown className="w-4 h-4 fill-amber-500 animate-bounce" />
        </div>
      );
    }
    if (rankIndex === 1) {
      return (
        <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 p-1.5 rounded-full border border-slate-200 dark:border-slate-700 w-8 h-8">
          <Medal className="w-4 h-4 fill-slate-400" />
        </div>
      );
    }
    if (rankIndex === 2) {
      return (
        <div className="flex items-center justify-center bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 p-1.5 rounded-full border border-orange-200 dark:border-orange-900/30 w-8 h-8">
          <Medal className="w-4 h-4 fill-orange-500" />
        </div>
      );
    }
    return (
      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 w-7 h-7 flex items-center justify-center rounded-full">
        {rankIndex + 1}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 md:p-6 shadow-xs mt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-xl">
              <Trophy className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Quiz Champions Leaderboard</h3>
              <p className="text-xs text-slate-500">Compare score points with other students & compete for rank #1</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 my-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search student by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filterType === "all" ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
          >
            All Students
          </button>
          <button
            onClick={() => setFilterType("top3")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${filterType === "top3" ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            Top 3
          </button>
          <button
            onClick={() => setFilterType("me")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filterType === "me" ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
          >
            My Rank
          </button>
        </div>
      </div>

      {/* Table Data Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-slate-850">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-50/75 dark:bg-slate-950/70 border-b border-slate-150 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
              <th className="p-3 pl-4 w-16 text-center">Rank</th>
              <th className="p-3">Student</th>
              <th className="p-3 text-center">Quizzes Taken</th>
              <th className="p-3 text-center">Highest Score</th>
              <th className="p-3 text-right pr-4 text-amber-600 dark:text-amber-400">Total Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary-500" />
                    <span>Loading rankings...</span>
                  </div>
                </td>
              </tr>
            ) : filteredLeaderboard.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center py-4">
                    <ShieldAlert className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm font-medium">No rankings found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Complete a quiz to submit your score and show up here!</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLeaderboard.map((entry, index) => {
                const actualRank = leaderboard.indexOf(entry);
                const isMe = entry.uid === (currentUserId || "guest");
                return (
                  <motion.tr
                    key={entry.uid}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.4) }}
                    className={`transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/10 ${isMe ? 'bg-primary-50/25 dark:bg-primary-950/5 border-l-4 border-l-primary-500' : ''}`}
                  >
                    <td className="p-3 pl-4 text-center">
                      <div className="flex justify-center">{getRankBadge(actualRank)}</div>
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">
                      <div className="flex items-center gap-2.5">
                        {entry.photoURL ? (
                          <img
                            src={entry.photoURL}
                            alt={entry.displayName}
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-800 object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 text-[10px] uppercase font-bold border border-slate-200 dark:border-slate-700">
                            {entry.displayName.charAt(0)}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5">
                            {entry.displayName}
                            {isMe && (
                              <span className="px-1.5 py-0.5 text-[9px] bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 font-bold rounded-md">
                                You
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] font-normal text-slate-400">
                            Active {new Date(entry.lastActive).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center text-slate-600 dark:text-slate-300 font-medium">
                      {entry.quizzesCompleted}
                    </td>
                    <td className="p-3 text-center text-slate-600 dark:text-slate-300 font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        <span>{entry.highestScore} pts</span>
                      </div>
                    </td>
                    <td className="p-3 text-right pr-4 font-extrabold text-amber-600 dark:text-amber-400">
                      <div className="flex items-center justify-end gap-1 font-mono">
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>{entry.totalScore}</span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
