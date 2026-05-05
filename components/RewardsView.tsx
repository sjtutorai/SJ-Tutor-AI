
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Gift, 
  Users, 
  ChevronRight, 
  CheckCircle,
  Clock,
  Zap,
  Star,
  Coins,
  Trophy,
  BrainCircuit,
  FileText
} from 'lucide-react';
import { UserProfile } from '../types';

interface RewardsViewProps {
  profile: UserProfile;
  onUpdateProfile: (newProfile: UserProfile) => void;
}

const RewardsView: React.FC<RewardsViewProps> = ({ profile, onUpdateProfile }) => {
  const [claimedDaily, setClaimedDaily] = useState(false);
  const [activeTab, setActiveTab] = useState<'offers' | 'badges' | 'referral'>('offers');

  // Check if daily reward can be claimed
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (profile.lastLoginDate === today) {
      // Actually, we'll use a separate flag or logic for 'claimed' vs 'just logged in'
      // For simplicity, let's assume if they visited the page today, they can claim once.
      const lastClaim = localStorage.getItem(`daily_claim_${profile.displayName}`);
      if (lastClaim === today) setClaimedDaily(true);
    }
  }, [profile]);

  const claimDailyReward = () => {
    if (claimedDaily) return;
    
    const today = new Date().toISOString().split('T')[0];
    const reward = 50; // Points
    
    const newProfile = {
      ...profile,
      points: (profile.points || 0) + reward,
      lastLoginDate: today
    };
    
    localStorage.setItem(`daily_claim_${profile.displayName}`, today);
    onUpdateProfile(newProfile);
    setClaimedDaily(true);
    alert(`🎉 Success! You claimed ${reward} daily points!`);
  };

  const dailyTasks = [
    { title: "Watch 1 Tutorial", pts: 50, done: false, icon: Clock },
    { title: "Complete 10 Quiz Qs", pts: 150, done: true, icon: BrainCircuit },
    { title: "Share results on WhatsApp", pts: 30, done: false, icon: FileText }
  ];

  const badges = [
    { name: "Early Bird", description: "Logged in for 3 days straight", icon: "🌅", unlocked: profile.streakCount >= 3 },
    { name: "Quiz Master", description: "Scored 100% in 5 quizzes", icon: "🎯", unlocked: profile.badges?.includes("Quiz Master") },
    { name: "Social Star", description: "Referred 3 friends", icon: "🌟", unlocked: profile.badges?.includes("Social Star") },
    { name: "Night Owl", description: "Studied after 10 PM", icon: "🦉", unlocked: profile.badges?.includes("Night Owl") },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header Stat Card */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="text-amber-100 font-bold uppercase tracking-wider text-sm mb-2">Your Balance</p>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <Coins size={48} className="text-white drop-shadow-md" />
              <span className="text-6xl font-black tracking-tighter">{profile.points || 0}</span>
            </div>
            <p className="mt-2 text-amber-100">Redeem points for Premium Credits</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center min-w-[100px] border border-white/20">
              <Zap className="text-yellow-300 mb-1" />
              <span className="text-2xl font-black">{profile.streakCount || 0}</span>
              <span className="text-[10px] uppercase font-bold opacity-70">Day Streak</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center min-w-[100px] border border-white/20">
              <Trophy className="text-amber-200 mb-1" />
              <span className="text-2xl font-black">{profile.badges?.length || 0}</span>
              <span className="text-[10px] uppercase font-bold opacity-70">Badges</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-sm mx-auto">
        {(['offers', 'badges', 'referral'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-bold capitalize rounded-lg transition-all ${
              activeTab === tab 
                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activeTab === 'offers' && (
          <>
            {/* Daily Reward Card */}
            <div className="md:col-span-1 h-full">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
                  <Gift size={32} />
                </div>
                <h3 className="font-bold text-lg dark:text-white mb-1">Daily Reward</h3>
                <p className="text-sm text-slate-500 mb-6">Login every day to collect free points!</p>
                
                <button
                  disabled={claimedDaily}
                  onClick={claimDailyReward}
                  className={`w-full py-3 rounded-xl font-bold transition-all active:scale-95 ${
                    claimedDaily 
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed' 
                    : 'bg-amber-500 text-white shadow-lg shadow-amber-500/25 hover:bg-amber-600'
                  }`}
                >
                  {claimedDaily ? (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle size={18} />
                      Claimed Today
                    </span>
                  ) : (
                    "Claim +50 Points"
                  )}
                </button>
                <p className="mt-4 text-xs text-slate-400">Streak: {profile.streakCount} days</p>
              </div>
            </div>

            {/* Daily Tasks */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Star size={18} className="text-amber-500" />
                Daily Challenges
              </h3>
              <div className="space-y-3">
                {dailyTasks.map((task, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${task.done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {task.done ? <CheckCircle size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-300" />}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${task.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                          {task.title}
                        </p>
                        <p className="text-xs text-amber-600 font-bold">+{task.pts} Points</p>
                      </div>
                    </div>
                    {!task.done && <ChevronRight size={18} className="text-slate-300" />}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'badges' && (
          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {badges.map((badge, i) => (
              <div 
                key={i} 
                className={`p-6 rounded-2xl border-2 flex flex-col items-center text-center transition-all ${
                  badge.unlocked 
                  ? 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-900/50 shadow-md' 
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="text-5xl mb-4 grayscale-[0.5] hover:grayscale-0 transition-all transform hover:scale-110 cursor-default">
                  {badge.icon}
                </div>
                <h4 className="font-bold text-sm dark:text-white mb-1">{badge.name}</h4>
                <p className="text-[10px] text-slate-400 leading-tight">{badge.description}</p>
                {!badge.unlocked && (
                  <div className="mt-4 px-3 py-1 bg-slate-200 dark:bg-slate-800 rounded-full text-[10px] font-black text-slate-500 uppercase">
                    Locked
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'referral' && (
          <div className="md:col-span-3 bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center text-indigo-600 mx-auto mb-6">
              <Users size={40} />
            </div>
            <h3 className="text-2xl font-bold dark:text-white mb-2">Invite Your Friends</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
              Get **500 Points** for every friend who joins! Plus, they get 200 points to start.
            </p>
            
            <div className="max-w-md mx-auto flex gap-2">
              <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between overflow-hidden">
                <span className="font-mono text-sm font-bold text-slate-600 dark:text-slate-300">SJTUTOR_{profile.displayName?.split(' ')[0]?.toUpperCase() || 'STUDENT'}</span>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`SJTUTOR_${profile.displayName?.split(' ')[0]?.toUpperCase() || 'STUDENT'}`);
                  alert("Referral code copied!");
                }}
                className="bg-indigo-600 text-white px-6 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
              >
                Copy
              </button>
            </div>
            <button className="mt-6 flex items-center gap-2 mx-auto text-indigo-600 font-bold hover:underline">
              <Gift size={18} />
              Redeem a referral code?
            </button>
          </div>
        )}
      </div>

      {/* Point Redemption */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-bold flex items-center gap-2">
              <Coins className="text-amber-400" size={18} />
              Convert Points to Credits
            </h4>
            <p className="text-sm text-slate-400">1,000 Points = 50 Premium Credits</p>
          </div>
          <button 
            disabled={profile.points < 1000}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-bold transition-colors"
          >
            Redeem Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default RewardsView;
