
import React from 'react';
import { LeaderboardEntry } from '../types';
import { Trophy, Medal, Crown, User, Flame } from 'lucide-react';
import { motion } from 'motion/react';

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

const LeaderboardView: React.FC<LeaderboardViewProps> = ({ entries, currentUserId }) => {
  const sortedEntries = [...entries].sort((a, b) => b.points - a.points);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 1: return <Medal className="w-6 h-6 text-slate-400" />;
      case 2: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className="text-lg font-bold text-slate-400">{index + 1}</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-primary-50 to-white dark:from-slate-800 dark:to-slate-800">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary-500" />
          Scholar Leaderboard
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Top performers this week</p>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {sortedEntries.map((entry, index) => (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            key={entry.userId}
            className={`p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
              entry.userId === currentUserId ? 'bg-primary-50/50 dark:bg-primary-900/20' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-8 flex justify-center">
                {getRankIcon(index)}
              </div>
              
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden border-2 border-white dark:border-slate-600 shadow-sm">
                  {entry.photoURL ? (
                    <img src={entry.photoURL} alt={entry.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                </div>
                {entry.streak >= 3 && (
                  <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full p-0.5 shadow-sm">
                    <Flame className="w-3 h-3 fill-current" />
                  </div>
                )}
              </div>

              <div>
                <h4 className={`font-semibold text-sm ${entry.userId === currentUserId ? 'text-primary-700 dark:text-primary-400' : 'text-slate-800 dark:text-white'}`}>
                  {entry.displayName}
                  {entry.userId === currentUserId && <span className="ml-2 text-[10px] bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded-full uppercase">You</span>}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-0.5">
                    <Flame className="w-3 h-3 text-orange-500" />
                    {entry.streak} day streak
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-bold text-slate-800 dark:text-white">{entry.points.toLocaleString()}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Points</div>
            </div>
          </motion.div>
        ))}

        {sortedEntries.length === 0 && (
          <div className="p-12 text-center">
            <User className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">No entries yet. Be the first!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardView;
