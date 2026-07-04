import React from "react";
import { motion } from "motion/react";

const DashboardSkeleton: React.FC = () => {
  // Stagger parameters
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-full space-y-8"
    >
      {/* 1. Welcome Card / Header Skeleton */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-2">
          {/* Shimmering Welcome Text */}
          <div className="h-7 w-56 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 dark:via-slate-700/30 to-transparent animate-shimmer" />
          </div>
          {/* Subtitle shimmer */}
          <div className="h-4 w-72 bg-slate-200/75 dark:bg-slate-800/75 rounded animate-pulse relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 dark:via-slate-700/30 to-transparent animate-shimmer" />
          </div>
        </div>
      </motion.div>

      {/* 2. Main Stats Cards Grid Skeleton */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4 relative overflow-hidden"
          >
            {/* Shimmering Overlay */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-slate-100/40 dark:via-slate-700/10 to-transparent animate-shimmer" />
            
            <div className="flex justify-between items-start">
              {/* Icon Placeholder */}
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
              {/* Count Placeholder */}
              <div className="h-6 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>

            {/* Title & Info */}
            <div className="space-y-2">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-3 w-16 bg-slate-150 dark:bg-slate-750 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </motion.div>

      {/* 3. Subjects and Study Streak Middle Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Study Streak Card */}
        <div className="lg:col-span-1 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden flex flex-col justify-between h-[280px]">
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-slate-100/40 dark:via-slate-700/10 to-transparent animate-shimmer" />
          
          <div className="space-y-3">
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-3 w-48 bg-slate-150 dark:bg-slate-750 rounded animate-pulse" />
          </div>

          {/* Large Circular/Streak Ring Placeholder */}
          <div className="w-28 h-28 bg-slate-100 dark:bg-slate-700 rounded-full mx-auto my-4 animate-pulse flex items-center justify-center">
            <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full" />
          </div>

          <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded mx-auto animate-pulse" />
        </div>

        {/* Subjects & Curriculum Card */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden h-[280px] flex flex-col">
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-slate-100/40 dark:via-slate-700/10 to-transparent animate-shimmer" />
          
          <div className="space-y-3 mb-6">
            <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-3 w-64 bg-slate-150 dark:bg-slate-750 rounded animate-pulse" />
          </div>

          {/* Subjects horizontal scroll or grid items */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="p-4 border border-slate-100 dark:border-slate-700 rounded-lg space-y-2">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 4. AI Tutor Card and Recent Activity */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity List */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden min-h-[220px]">
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-slate-100/40 dark:via-slate-700/10 to-transparent animate-shimmer" />
          
          <div className="h-5 w-36 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-6" />

          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 w-44 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-3 w-28 bg-slate-150 dark:bg-slate-750 rounded animate-pulse" />
                  </div>
                </div>
                <div className="w-4 h-4 rounded bg-slate-150 dark:bg-slate-700 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* AI Tutor Floating Card */}
        <div className="lg:col-span-1 p-6 bg-gradient-to-br from-blue-500/5 to-purple-500/5 bg-white dark:bg-slate-800 rounded-xl border border-blue-100/50 dark:border-slate-700 shadow-sm relative overflow-hidden min-h-[220px] flex flex-col justify-between">
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 dark:via-slate-700/10 to-transparent animate-shimmer" />
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4.5 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-3 w-16 bg-slate-150 dark:bg-slate-750 rounded animate-pulse" />
            </div>
          </div>

          <div className="space-y-2 my-4">
            <div className="h-3.5 w-full bg-slate-150 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-3.5 w-[85%] bg-slate-150 dark:bg-slate-700 rounded animate-pulse" />
          </div>

          <div className="h-9 w-full bg-blue-100 dark:bg-slate-750 rounded-lg animate-pulse" />
        </div>
      </motion.div>

      {/* 5. Quick Actions Skeleton */}
      <motion.div variants={itemVariants} className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-slate-100/40 dark:via-slate-700/10 to-transparent animate-shimmer" />
        <div className="h-5 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex flex-col items-center gap-3 border border-slate-100/50 dark:border-slate-600"
            >
              <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-600 animate-pulse" />
              <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-600 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DashboardSkeleton;
