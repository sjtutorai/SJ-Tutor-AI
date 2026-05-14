
import React, { useState } from 'react';
import { Tag, Zap, GraduationCap, Gift, ChevronRight, Star, Clock, Bell, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface StudentOffersProps {
  userProfile: UserProfile;
  onUpdateProfile: (newProfile: UserProfile) => void;
  onStartAchieverChallenge?: () => void;
}

const StudentOffers: React.FC<StudentOffersProps> = ({ userProfile, onUpdateProfile, onStartAchieverChallenge }) => {
  const [justClaimed, setJustClaimed] = useState<number | null>(null);

  const handleClaim = (id: number) => {
    if (id === 4 && onStartAchieverChallenge) {
      onStartAchieverChallenge();
      return;
    }
    
    setJustClaimed(id);
    
    const newClaimedOffers = [...(userProfile.claimedOffers || []), id];
    onUpdateProfile({
      ...userProfile,
      claimedOffers: newClaimedOffers
    });

    setTimeout(() => setJustClaimed(null), 3000);
  };

  const offers = [
    {
      id: 1,
      title: "Scholarship Plus",
      description: "Get 50% extra credits on all top-ups for valid student ID holders.",
      icon: <GraduationCap className="w-6 h-6 text-indigo-500" />,
      tag: "Limited Time",
      color: "from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-900",
      borderColor: "border-indigo-100 dark:border-indigo-800",
      accent: "bg-indigo-600"
    },
    {
      id: 2,
      title: "Exam Season Boost",
      description: "Unlimited AI Tutor chats during exam weeks (May - June).",
      icon: <Zap className="w-6 h-6 text-amber-500" />,
      tag: "Seasonal",
      color: "from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-900",
      borderColor: "border-amber-100 dark:border-amber-800",
      accent: "bg-amber-500"
    },
    {
      id: 3,
      title: "Refer a Study Buddy",
      description: "Invite a friend and both get 200 credits once they sign up.",
      icon: <Gift className="w-6 h-6 text-rose-500" />,
      tag: "Always On",
      color: "from-rose-50 to-white dark:from-rose-900/20 dark:to-slate-900",
      borderColor: "border-rose-100 dark:border-rose-800",
      accent: "bg-rose-600"
    },
    {
      id: 4,
      title: "Premium for Top 1%",
      description: "Score 95%+ in 10 consecutive quizzes to unlock 1 month of Achiever Plan.",
      icon: <Star className="w-6 h-6 text-emerald-500" />,
      tag: "Achievement",
      color: "from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-900",
      borderColor: "border-emerald-100 dark:border-emerald-800",
      accent: "bg-emerald-600"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-20">
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 flex items-center justify-center sm:justify-start gap-3">
          <Tag className="w-8 h-8 text-primary-600" />
          Student Exclusive Offers
        </h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
          We&apos;re committed to making education accessible and fun. Unlock these special deals designed specifically for your academic success.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {offers
          .filter(offer => !(userProfile.claimedOffers || []).includes(offer.id) || justClaimed === offer.id)
          .map((offer, index) => (
          <motion.div
            key={offer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative overflow-hidden rounded-2xl border ${offer.borderColor} p-6 bg-gradient-to-br ${offer.color} group hover:shadow-xl hover:shadow-primary-600/5 transition-all duration-300`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm border ${offer.borderColor}`}>
                {offer.icon}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-white/80 dark:bg-slate-800/80 rounded-full border border-slate-100 dark:border-slate-700 text-slate-500">
                {offer.tag}
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 group-hover:text-primary-600 transition-colors">
              {offer.title}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">
              {offer.description}
            </p>

            <button 
              onClick={() => handleClaim(offer.id)}
              disabled={justClaimed === offer.id}
              className={`w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 ${justClaimed === offer.id ? 'bg-emerald-500' : offer.accent} hover:opacity-90 transition-all shadow-lg shadow-black/10 active:scale-[0.98] disabled:cursor-not-allowed`}
            >
              {justClaimed === offer.id ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Offer Claimed!
                </>
              ) : (
                <>
                  Claim Offer
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
            
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              {React.cloneElement(offer.icon as React.ReactElement, { size: 100 })}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {justClaimed && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold"
          >
            <div className="bg-white/20 p-1 rounded-full text-white">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            Success! Your offer has been claimed.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-primary-600 rounded-3xl p-8 sm:p-12 text-white overflow-hidden relative shadow-2xl shadow-primary-600/20">
        <div className="relative z-10 max-w-xl">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">Never miss an update!</h2>
          <p className="text-primary-100 mb-8 text-lg">
            New offers are added every week. Turn on notifications to stay ahead of the game and save more on your study tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="px-8 py-4 bg-white text-primary-600 rounded-xl font-bold hover:bg-primary-50 transition-colors flex items-center justify-center gap-2">
              <Bell className="w-5 h-5" />
              Notify Me
            </button>
            <div className="flex items-center gap-2 text-primary-100 text-sm italic py-2">
              <Clock className="w-4 h-4" />
              Updated 2 hours ago
            </div>
          </div>
        </div>
        
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-400 opacity-20 rounded-full -mr-32 -mb-32 blur-3xl"></div>
      </div>
    </div>
  );
};

export default StudentOffers;
