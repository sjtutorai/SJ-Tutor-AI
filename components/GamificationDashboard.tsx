
import React from 'react';
import { UserProfile, Badge } from '../types';
import { BADGES } from '../services/gamificationService';
import { Trophy, Flame, Star, Award, ChevronRight, Target } from 'lucide-react';
import { motion } from 'motion/react';

interface GamificationDashboardProps {
  profile: UserProfile;
  onViewLeaderboard: () => void;
  onViewBadges: () => void;
}

const GamificationDashboard: React.FC<GamificationDashboardProps> = ({ profile, onViewLeaderboard, onViewBadges }) => {
  const earnedBadges = BADGES.filter(b => profile.badges?.includes(b.id));
  const nextBadge = BADGES.find(b => !profile.badges?.includes(b.id));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Points Card */}
      <motion.div 
        whileHover={{ y: -5 }}
        className="bg-gradient-to-br from-primary-500 to-primary-600 p-6 rounded-2xl shadow-lg shadow-primary-500/20 text-white relative overflow-hidden"
      >
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Star className="w-6 h-6 fill-white" />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-1 rounded">Scholar Points</div>
          </div>
          <div className="text-3xl font-black mb-1">{profile.points?.toLocaleString() || 0}</div>
          <p className="text-xs text-primary-100">Keep learning to earn more!</p>
        </div>
        <Star className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10 rotate-12" />
      </motion.div>

      {/* Streak Card */}
      <motion.div 
        whileHover={{ y: -5 }}
        className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-2xl shadow-lg shadow-orange-500/20 text-white relative overflow-hidden"
      >
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Flame className="w-6 h-6 fill-white" />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-1 rounded">Daily Streak</div>
          </div>
          <div className="text-3xl font-black mb-1">{profile.streak || 0} Days</div>
          <p className="text-xs text-orange-100">Daily engagement pays off!</p>
        </div>
        <Flame className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10 -rotate-12" />
      </motion.div>

      {/* Badges Preview */}
      <motion.div 
        whileHover={{ y: -5 }}
        onClick={onViewBadges}
        className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer group"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
            <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500 transition-colors" />
        </div>
        <div className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{earnedBadges.length} Badges</div>
        <div className="flex -space-x-2 mt-2">
          {earnedBadges.slice(0, 4).map((badge, i) => (
            <div key={badge.id} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-sm shadow-sm" title={badge.name}>
              {badge.icon}
            </div>
          ))}
          {earnedBadges.length > 4 && (
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
              +{earnedBadges.length - 4}
            </div>
          )}
        </div>
      </motion.div>

      {/* Next Milestone */}
      <motion.div 
        whileHover={{ y: -5 }}
        onClick={onViewLeaderboard}
        className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer group"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <Trophy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500 transition-colors" />
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Next Milestone</div>
        {nextBadge ? (
          <div className="flex items-center gap-3">
            <div className="text-2xl">{nextBadge.icon}</div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">{nextBadge.name}</h4>
              <p className="text-[10px] text-slate-500 truncate">{nextBadge.description}</p>
            </div>
          </div>
        ) : (
          <div className="text-sm font-bold text-emerald-600">All badges earned! 🏆</div>
        )}
      </motion.div>
    </div>
  );
};

export default GamificationDashboard;
