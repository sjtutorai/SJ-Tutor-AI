import React from 'react';
import { motion } from 'motion/react';
import { 
  Sprout,
  Flame, 
  Zap, 
  Shield,
  Rocket,
  Crown, 
  Gem, 
  Star, 
  Infinity as InfinityIcon
} from 'lucide-react';

export interface StreakTier {
  id: string;
  minDays: number;
  maxDays: number | null;
  name: string;
  title: string;
  boardTitle: string;
  levelLabel: string;
  emoji: string;
  iconType: 'sprout' | 'flame' | 'zap' | 'shield' | 'rocket' | 'gem' | 'crown' | 'star' | 'infinity';
  gradient: string;
  boardBgGradient: string;
  boardCardBorder: string;
  boardAccentHex: string;
  boardSecondaryHex: string;
  lightBg: string;
  darkBg: string;
  borderColor: string;
  textColor: string;
  glowColor: string;
  ringColor: string;
  fillColor: string;
  description: string;
  perk: string;
  creditBonusLabel: string;
  animationStyle: 'pulse' | 'flicker' | 'electric' | 'fortress' | 'orbit' | 'prism' | 'solar' | 'supernova' | 'cosmic';
  tierRank: number;
}

export const STREAK_TIERS: StreakTier[] = [
  {
    id: 'ember-sprout',
    minDays: 0,
    maxDays: 2,
    name: 'Ember Sprout',
    title: 'Seedling Starter',
    boardTitle: 'Level 1 • Emerald Seedling Board',
    levelLabel: 'Lv. 1',
    emoji: '🌱',
    iconType: 'sprout',
    gradient: 'from-emerald-500 via-teal-500 to-amber-500',
    boardBgGradient: 'from-emerald-500/15 via-teal-500/10 to-emerald-500/5',
    boardCardBorder: 'border-emerald-300/80 dark:border-emerald-700/70',
    boardAccentHex: '#10B981',
    boardSecondaryHex: '#14B8A6',
    lightBg: 'bg-emerald-50 text-emerald-800',
    darkBg: 'dark:bg-emerald-950/40 dark:text-emerald-300',
    borderColor: 'border-emerald-300 dark:border-emerald-800',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    glowColor: 'shadow-emerald-500/30',
    ringColor: 'ring-emerald-400',
    fillColor: 'fill-emerald-400 text-emerald-100',
    description: 'The green seedling spark of a lifelong learning commitment',
    perk: 'Daily Spark Bonus • 1.0x Learning Momentum',
    creditBonusLabel: '+5 Starter Credits',
    animationStyle: 'pulse',
    tierRank: 1
  },
  {
    id: 'amber-flame',
    minDays: 3,
    maxDays: 6,
    name: 'Amber Flame',
    title: 'Ignited Flame',
    boardTitle: 'Level 2 • Ignited Amber Board',
    levelLabel: 'Lv. 2',
    emoji: '🔥',
    iconType: 'flame',
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    boardBgGradient: 'from-amber-500/20 via-orange-500/10 to-amber-500/5',
    boardCardBorder: 'border-amber-300/80 dark:border-amber-700/70',
    boardAccentHex: '#F59E0B',
    boardSecondaryHex: '#F97316',
    lightBg: 'bg-amber-50 text-amber-900',
    darkBg: 'dark:bg-amber-950/40 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-800',
    textColor: 'text-amber-600 dark:text-amber-400',
    glowColor: 'shadow-orange-500/40',
    ringColor: 'ring-amber-400',
    fillColor: 'fill-amber-400 text-amber-100',
    description: '3+ Days of continuous daily focus and rising study heat',
    perk: 'Ignited Momentum • 1.2x Credit Multiplier',
    creditBonusLabel: '+10 Milestone Credits',
    animationStyle: 'flicker',
    tierRank: 2
  },
  {
    id: 'blazing-torch',
    minDays: 7,
    maxDays: 13,
    name: 'Blazing Torch',
    title: '7-Day Scholar Torch',
    boardTitle: 'Level 3 • Blazing Scholar Board',
    levelLabel: 'Lv. 3',
    emoji: '⚡',
    iconType: 'zap',
    gradient: 'from-amber-500 via-yellow-500 to-orange-500',
    boardBgGradient: 'from-yellow-500/20 via-amber-500/12 to-orange-500/5',
    boardCardBorder: 'border-yellow-400/80 dark:border-yellow-600/70',
    boardAccentHex: '#EAB308',
    boardSecondaryHex: '#F97316',
    lightBg: 'bg-amber-50 text-amber-900',
    darkBg: 'dark:bg-amber-950/40 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-800',
    textColor: 'text-amber-500 dark:text-amber-400',
    glowColor: 'shadow-amber-500/40',
    ringColor: 'ring-amber-400',
    fillColor: 'fill-amber-400 text-amber-100',
    description: '1 full week of dedicated daily study electricity',
    perk: 'Weekly Scholar Badge • 1.4x Credit Multiplier',
    creditBonusLabel: '+25 Milestone Credits',
    animationStyle: 'electric',
    tierRank: 3
  },
  {
    id: 'cobalt-shield',
    minDays: 14,
    maxDays: 20,
    name: 'Cobalt Shield',
    title: '14-Day Fortnight Guard',
    boardTitle: 'Level 4 • Cobalt Fortress Board',
    levelLabel: 'Lv. 4',
    emoji: '🛡️',
    iconType: 'shield',
    gradient: 'from-blue-600 via-indigo-600 to-amber-500',
    boardBgGradient: 'from-blue-600/20 via-indigo-600/12 to-blue-500/5',
    boardCardBorder: 'border-indigo-400/80 dark:border-indigo-600/70',
    boardAccentHex: '#2563EB',
    boardSecondaryHex: '#4F46E5',
    lightBg: 'bg-indigo-50 text-indigo-900',
    darkBg: 'dark:bg-indigo-950/40 dark:text-indigo-300',
    borderColor: 'border-indigo-400 dark:border-indigo-800',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    glowColor: 'shadow-indigo-500/40',
    ringColor: 'ring-indigo-400',
    fillColor: 'fill-indigo-400 text-indigo-100',
    description: '2 weeks of fortified discipline and learning armor',
    perk: 'Fortified Shield • Permanent Streak Freeze Buffer',
    creditBonusLabel: '+50 Milestone Credits',
    animationStyle: 'fortress',
    tierRank: 4
  },
  {
    id: 'astral-rocket',
    minDays: 21,
    maxDays: 29,
    name: 'Astral Rocket',
    title: '21-Day Habit Catalyst',
    boardTitle: 'Level 5 • Astral Orbit Board',
    levelLabel: 'Lv. 5',
    emoji: '🚀',
    iconType: 'rocket',
    gradient: 'from-purple-600 via-violet-600 to-pink-500',
    boardBgGradient: 'from-purple-600/20 via-violet-600/12 to-pink-500/5',
    boardCardBorder: 'border-purple-400/80 dark:border-purple-600/70',
    boardAccentHex: '#9333EA',
    boardSecondaryHex: '#EC4899',
    lightBg: 'bg-purple-50 text-purple-900',
    darkBg: 'dark:bg-purple-950/40 dark:text-purple-300',
    borderColor: 'border-purple-400 dark:border-purple-800',
    textColor: 'text-purple-600 dark:text-purple-400',
    glowColor: 'shadow-purple-500/40',
    ringColor: 'ring-purple-400',
    fillColor: 'fill-purple-400 text-purple-100',
    description: '21 days to launch an unbreakable learning habit into orbit',
    perk: 'Habit Orbit • High-Priority AI Tutor Speed (1.75x)',
    creditBonusLabel: '+75 Milestone Credits',
    animationStyle: 'orbit',
    tierRank: 5
  },
  {
    id: 'diamond-legend',
    minDays: 30,
    maxDays: 49,
    name: 'Diamond Legend',
    title: '30-Day Monthly Legend',
    boardTitle: 'Level 6 • Crystalline Diamond Board',
    levelLabel: 'Lv. 6',
    emoji: '💎',
    iconType: 'gem',
    gradient: 'from-cyan-500 via-blue-500 to-amber-500',
    boardBgGradient: 'from-cyan-500/20 via-blue-500/12 to-amber-500/5',
    boardCardBorder: 'border-cyan-400/80 dark:border-cyan-600/70',
    boardAccentHex: '#06B6D4',
    boardSecondaryHex: '#3B82F6',
    lightBg: 'bg-cyan-50 text-cyan-950',
    darkBg: 'dark:bg-cyan-950/40 dark:text-cyan-300',
    borderColor: 'border-cyan-400 dark:border-cyan-800',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    glowColor: 'shadow-cyan-500/50',
    ringColor: 'ring-cyan-400',
    fillColor: 'fill-cyan-400 text-cyan-100',
    description: '1 continuous month of elite crystalline academic dedication',
    perk: 'Elite Diamond Status • 2.0x Credit Multiplier',
    creditBonusLabel: '+100 Milestone Credits',
    animationStyle: 'prism',
    tierRank: 6
  },
  {
    id: 'phoenix-crown',
    minDays: 50,
    maxDays: 99,
    name: 'Phoenix Crown',
    title: '50-Day Phoenix Crown',
    boardTitle: 'Level 7 • Royal Phoenix Board',
    levelLabel: 'Lv. 7',
    emoji: '👑',
    iconType: 'crown',
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    boardBgGradient: 'from-amber-500/25 via-orange-500/15 to-red-500/5',
    boardCardBorder: 'border-amber-400/90 dark:border-amber-600/80',
    boardAccentHex: '#F59E0B',
    boardSecondaryHex: '#EF4444',
    lightBg: 'bg-amber-50 text-amber-950',
    darkBg: 'dark:bg-amber-950/40 dark:text-amber-300',
    borderColor: 'border-amber-400 dark:border-amber-800',
    textColor: 'text-amber-500 dark:text-amber-400',
    glowColor: 'shadow-amber-500/50',
    ringColor: 'ring-amber-400',
    fillColor: 'fill-amber-400 text-amber-100',
    description: 'Half-century milestone of outstanding scholastic royalty',
    perk: 'Royalty Rank • Exclusive ID Card Gold Border (2.5x)',
    creditBonusLabel: '+200 Milestone Credits',
    animationStyle: 'solar',
    tierRank: 7
  },
  {
    id: 'century-star',
    minDays: 100,
    maxDays: 364,
    name: 'Century Star',
    title: '100-Day Supernova',
    boardTitle: 'Level 8 • Supernova Century Board',
    levelLabel: 'Lv. 8',
    emoji: '🌟',
    iconType: 'star',
    gradient: 'from-yellow-400 via-amber-500 to-rose-500',
    boardBgGradient: 'from-yellow-400/25 via-amber-500/15 to-rose-500/10',
    boardCardBorder: 'border-amber-400/90 dark:border-rose-500/70',
    boardAccentHex: '#EAB308',
    boardSecondaryHex: '#F43F5E',
    lightBg: 'bg-amber-50 text-amber-950',
    darkBg: 'dark:bg-amber-950/40 dark:text-amber-300',
    borderColor: 'border-amber-400 dark:border-amber-800',
    textColor: 'text-amber-500 dark:text-amber-300',
    glowColor: 'shadow-amber-500/50',
    ringColor: 'ring-amber-400',
    fillColor: 'fill-amber-400 text-amber-100',
    description: 'Triple-digit century milestone of extraordinary supernova excellence',
    perk: 'Triple-Digit Master • +500 Bonus Credits (3.0x)',
    creditBonusLabel: '+500 Milestone Credits',
    animationStyle: 'supernova',
    tierRank: 8
  },
  {
    id: 'grand-sage',
    minDays: 365,
    maxDays: null,
    name: 'Grand Sage Infinite',
    title: '365-Day Grand Sage',
    boardTitle: 'Level 9 • Grand Sage Infinite Board',
    levelLabel: 'Lv. 9 MAX',
    emoji: '♾️',
    iconType: 'infinity',
    gradient: 'from-violet-600 via-amber-500 to-emerald-500',
    boardBgGradient: 'from-violet-600/25 via-amber-500/15 to-emerald-500/15',
    boardCardBorder: 'border-amber-400 dark:border-amber-500',
    boardAccentHex: '#8B5CF6',
    boardSecondaryHex: '#10B981',
    lightBg: 'bg-amber-50 text-amber-950',
    darkBg: 'dark:bg-amber-950/40 dark:text-amber-300',
    borderColor: 'border-amber-400 dark:border-amber-800',
    textColor: 'text-amber-500 dark:text-amber-300',
    glowColor: 'shadow-amber-500/60',
    ringColor: 'ring-amber-400',
    fillColor: 'fill-amber-400 text-amber-100',
    description: '1 full year of continuous unstoppable learning immortality',
    perk: 'Immortal Grand Sage • Unlimited AI Tutor & 5.0x Boost',
    creditBonusLabel: '+1000 Milestone Credits',
    animationStyle: 'cosmic',
    tierRank: 9
  }
];

export function getStreakTier(streakCount: number = 0): StreakTier {
  const count = Math.max(0, streakCount);
  for (let i = STREAK_TIERS.length - 1; i >= 0; i--) {
    const tier = STREAK_TIERS[i];
    if (count >= tier.minDays) {
      return tier;
    }
  }
  return STREAK_TIERS[0];
}

export function getNextStreakTier(streakCount: number = 0): StreakTier | null {
  const current = getStreakTier(streakCount);
  const currentIndex = STREAK_TIERS.findIndex(t => t.id === current.id);
  if (currentIndex < STREAK_TIERS.length - 1) {
    return STREAK_TIERS[currentIndex + 1];
  }
  return null;
}

export function getStreakTierProgress(streakCount: number = 0): {
  currentTier: StreakTier;
  nextTier: StreakTier | null;
  daysToNext: number;
  percentage: number;
} {
  const currentTier = getStreakTier(streakCount);
  const nextTier = getNextStreakTier(streakCount);

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      daysToNext: 0,
      percentage: 100
    };
  }

  const range = nextTier.minDays - currentTier.minDays;
  const progressInTier = streakCount - currentTier.minDays;
  const percentage = Math.min(100, Math.max(0, Math.round((progressInTier / range) * 100)));
  const daysToNext = Math.max(0, nextTier.minDays - streakCount);

  return {
    currentTier,
    nextTier,
    daysToNext,
    percentage
  };
}

interface StreakTierIconProps {
  streak?: number;
  tier?: StreakTier;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  animate?: boolean;
}

export const StreakTierIcon: React.FC<StreakTierIconProps> = ({
  streak = 0,
  tier: propTier,
  size = 'md',
  className = '',
  animate = true
}) => {
  const tier = propTier || getStreakTier(streak);

  const sizeClasses = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-9 h-9',
    '2xl': 'w-12 h-12'
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  // Distinct motion keyframe animations per board level
  const getMotionAnimation = () => {
    if (!animate) return {};
    switch (tier.animationStyle) {
      case 'pulse':
        return {
          scale: [1, 1.12, 1],
          rotate: [0, 4, -4, 0],
          transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' as const }
        };
      case 'flicker':
        return {
          scale: [1, 1.16, 0.96, 1.12, 1],
          rotate: [0, -6, 6, -3, 0],
          y: [0, -2, 0],
          transition: { duration: 1.9, repeat: Infinity, ease: 'easeInOut' as const }
        };
      case 'electric':
        return {
          scale: [1, 1.18, 1, 1.14, 1],
          rotate: [0, 8, -8, 4, 0],
          transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' as const }
        };
      case 'fortress':
        return {
          scale: [1, 1.1, 1],
          y: [0, -2.5, 0],
          transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' as const }
        };
      case 'orbit':
        return {
          y: [0, -3.5, 0],
          rotate: [0, 10, -6, 0],
          scale: [1, 1.14, 1],
          transition: { duration: 2.0, repeat: Infinity, ease: 'easeInOut' as const }
        };
      case 'prism':
        return {
          rotateY: [0, 180, 360],
          scale: [1, 1.15, 1],
          transition: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' as const }
        };
      case 'solar':
        return {
          scale: [1, 1.18, 1.05, 1.18, 1],
          rotate: [0, -7, 7, 0],
          y: [0, -2, 0],
          transition: { duration: 2.1, repeat: Infinity, ease: 'easeInOut' as const }
        };
      case 'supernova':
        return {
          rotate: [0, 20, -20, 0],
          scale: [1, 1.22, 0.95, 1.18, 1],
          transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' as const }
        };
      case 'cosmic':
        return {
          scale: [1, 1.2, 1.05, 1.22, 1],
          rotate: [0, 12, -12, 0],
          transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' as const }
        };
      default:
        return {
          scale: [1, 1.1, 1],
          transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const }
        };
    }
  };

  const renderIcon = () => {
    switch (tier.iconType) {
      case 'sprout':
        return <Sprout className={`${currentSizeClass} ${tier.textColor} ${className}`} />;
      case 'flame':
        return <Flame className={`${currentSizeClass} ${tier.textColor} ${className}`} />;
      case 'zap':
        return <Zap className={`${currentSizeClass} ${tier.textColor} ${className}`} />;
      case 'shield':
        return <Shield className={`${currentSizeClass} ${tier.textColor} ${className}`} />;
      case 'rocket':
        return <Rocket className={`${currentSizeClass} ${tier.textColor} ${className}`} />;
      case 'gem':
        return <Gem className={`${currentSizeClass} ${tier.textColor} ${className}`} />;
      case 'crown':
        return <Crown className={`${currentSizeClass} ${tier.textColor} ${className}`} />;
      case 'star':
        return <Star className={`${currentSizeClass} ${tier.textColor} ${className}`} />;
      case 'infinity':
        return <InfinityIcon className={`${currentSizeClass} ${tier.textColor} ${className}`} />;
      default:
        return <Flame className={`${currentSizeClass} ${tier.textColor} ${className}`} />;
    }
  };

  return (
    <motion.span
      animate={getMotionAnimation()}
      className="inline-flex items-center justify-center shrink-0"
    >
      {renderIcon()}
    </motion.span>
  );
};

interface AnimatedStreakCrestProps {
  tier: StreakTier;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isUnlocked?: boolean;
  isCurrent?: boolean;
}

/**
 * Multi-layered animated level crest for the Study Streak Board.
 * Renders level-specific orbital rings, pulsing aura, and animated icon.
 */
export const AnimatedStreakLevelCrest: React.FC<AnimatedStreakCrestProps> = ({
  tier,
  size = 'md',
  isUnlocked = true,
  isCurrent = false,
}) => {
  const containerSizes = {
    sm: 'w-11 h-11 rounded-xl',
    md: 'w-14 h-14 rounded-2xl',
    lg: 'w-16 h-16 rounded-2xl',
    xl: 'w-20 h-20 rounded-3xl',
  };

  const iconSizes: Record<'sm' | 'md' | 'lg' | 'xl', 'md' | 'lg' | 'xl' | '2xl'> = {
    sm: 'md',
    md: 'lg',
    lg: 'xl',
    xl: '2xl',
  };

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      {/* Level-dependent outer rotating orbital ring for Level 3+ */}
      {isUnlocked && tier.tierRank >= 3 && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: Math.max(6, 18 - tier.tierRank),
            repeat: Infinity,
            ease: 'linear',
          }}
          className={`absolute -inset-1.5 rounded-2xl border border-dashed pointer-events-none ${tier.borderColor} opacity-75`}
        />
      )}

      {/* Counter-rotating second ring for high tiers (Level 6+) */}
      {isUnlocked && tier.tierRank >= 6 && (
        <motion.div
          animate={{ rotate: -360, scale: [1, 1.06, 1] }}
          transition={{
            rotate: { duration: 10, repeat: Infinity, ease: 'linear' },
            scale: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
          }}
          className={`absolute -inset-2.5 rounded-3xl border pointer-events-none ${tier.borderColor} opacity-45`}
        />
      )}

      {/* Soft breathing glow behind active crest */}
      {(isCurrent || (isUnlocked && tier.tierRank >= 2)) && (
        <motion.div
          animate={{
            scale: [0.95, 1.18, 0.95],
            opacity: isCurrent ? [0.45, 0.85, 0.45] : [0.25, 0.55, 0.25],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute inset-0 rounded-2xl bg-gradient-to-tr ${tier.gradient} blur-md pointer-events-none`}
        />
      )}

      {/* Core Crest Box */}
      <motion.div
        whileHover={{ scale: 1.08, rotate: 3 }}
        transition={{ duration: 0.18 }}
        className={`relative ${containerSizes[size]} bg-gradient-to-tr ${tier.gradient} flex items-center justify-center text-white shadow-lg ${tier.glowColor} border border-white/40 overflow-hidden`}
      >
        {/* Shimmer sweep for unlocked tiers */}
        {isUnlocked && (
          <motion.div
            animate={{ x: ['-140%', '220%'] }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              repeatDelay: Math.max(0.8, 3.5 - tier.tierRank * 0.25),
              ease: 'easeInOut',
            }}
            className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent -skew-x-12 pointer-events-none"
          />
        )}

        <StreakTierIcon
          tier={tier}
          size={iconSizes[size]}
          animate={isUnlocked}
          className="text-white fill-white/80 drop-shadow-sm relative z-10"
        />

        {/* Level Rank Corner Chip */}
        <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-slate-950/80 text-white font-mono font-black text-[9px] leading-tight border border-white/25 z-20">
          L{tier.tierRank}
        </span>
      </motion.div>
    </div>
  );
};

interface StreakBadgePillProps {
  streak?: number;
  streakCount?: number;
  showTitle?: boolean;
  showLabel?: boolean;
  showEmoji?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export const StreakBadgePill: React.FC<StreakBadgePillProps> = ({
  streak,
  streakCount,
  showTitle,
  showLabel,
  showEmoji = true,
  size = 'md',
  onClick,
  className = ''
}) => {
  const resolvedStreak = streak ?? streakCount ?? 0;
  const resolvedShowTitle = showTitle ?? showLabel ?? false;
  const tier = getStreakTier(resolvedStreak);

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2'
  };

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.04, y: -1 } : undefined}
      whileTap={onClick ? { scale: 0.96 } : undefined}
      onClick={onClick}
      className={`inline-flex items-center font-bold rounded-xl border shadow-2xs transition-all ${
        tier.lightBg
      } ${tier.darkBg} ${tier.borderColor} ${sizeStyles[size]} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      title={`${resolvedStreak} Day Streak • ${tier.boardTitle} (${tier.title})`}
    >
      {showEmoji && <span className="text-sm leading-none">{tier.emoji}</span>}
      <StreakTierIcon tier={tier} size={size === 'lg' ? 'md' : 'sm'} animate={resolvedStreak > 0} />
      <span className="font-mono font-black tabular-nums">{resolvedStreak}</span>
      <span className="text-[11px] font-medium opacity-80">
        {resolvedStreak === 1 ? 'day' : 'days'}
      </span>
      {resolvedShowTitle && (
        <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-md bg-black/10 dark:bg-white/10 text-[10px] uppercase tracking-wider font-extrabold ml-0.5">
          {tier.levelLabel} • {tier.name}
        </span>
      )}
    </motion.div>
  );
};
