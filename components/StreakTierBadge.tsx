import React from 'react';
import { 
  Flame, 
  Sparkles, 
  Zap, 
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
  emoji: string;
  iconType: 'sparkles' | 'flame' | 'zap' | 'plasma' | 'astral' | 'diamond' | 'crown' | 'supernova' | 'infinity';
  gradient: string;
  lightBg: string;
  darkBg: string;
  borderColor: string;
  textColor: string;
  glowColor: string;
  ringColor: string;
  fillColor: string;
  description: string;
  tierRank: number;
}

export const STREAK_TIERS: StreakTier[] = [
  {
    id: 'ember-spark',
    minDays: 0,
    maxDays: 2,
    name: 'Ember Spark',
    title: 'Spark Starter',
    emoji: '🌱',
    iconType: 'sparkles',
    gradient: 'from-amber-400 to-orange-500',
    lightBg: 'bg-amber-50 text-amber-800',
    darkBg: 'dark:bg-amber-950/40 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-800',
    textColor: 'text-amber-500 dark:text-amber-400',
    glowColor: 'shadow-amber-500/30',
    ringColor: 'ring-amber-400',
    fillColor: 'fill-amber-400 text-amber-100',
    description: 'The spark of a lifelong learning journey',
    tierRank: 1
  },
  {
    id: 'amber-flame',
    minDays: 3,
    maxDays: 6,
    name: 'Amber Flame',
    title: 'Ignited Flame',
    emoji: '🔥',
    iconType: 'flame',
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    lightBg: 'bg-amber-50 text-amber-900',
    darkBg: 'dark:bg-amber-950/40 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-800',
    textColor: 'text-amber-600 dark:text-amber-400',
    glowColor: 'shadow-orange-500/40',
    ringColor: 'ring-amber-400',
    fillColor: 'fill-amber-400 text-amber-100',
    description: '3+ Days of continuous daily focus',
    tierRank: 2
  },
  {
    id: 'blazing-torch',
    minDays: 7,
    maxDays: 13,
    name: 'Blazing Torch',
    title: '7-Day Scholar Torch',
    emoji: '⚡',
    iconType: 'zap',
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    lightBg: 'bg-amber-50 text-amber-900',
    darkBg: 'dark:bg-amber-950/40 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-800',
    textColor: 'text-amber-500 dark:text-amber-400',
    glowColor: 'shadow-amber-500/40',
    ringColor: 'ring-amber-400',
    fillColor: 'fill-amber-400 text-amber-100',
    description: '1 full week of dedicated daily study',
    tierRank: 3
  },
  {
    id: 'cobalt-plasma',
    minDays: 14,
    maxDays: 20,
    name: 'Cobalt Flame',
    title: '14-Day Fortnight Flame',
    emoji: '🔥',
    iconType: 'plasma',
    gradient: 'from-amber-500 via-orange-600 to-amber-600',
    lightBg: 'bg-amber-50 text-amber-900',
    darkBg: 'dark:bg-amber-950/40 dark:text-amber-300',
    borderColor: 'border-amber-400 dark:border-amber-800',
    textColor: 'text-amber-500 dark:text-amber-400',
    glowColor: 'shadow-amber-500/40',
    ringColor: 'ring-amber-400',
    fillColor: 'fill-amber-400 text-amber-100',
    description: '2 weeks of fortified discipline and momentum',
    tierRank: 4
  },
  {
    id: 'astral-violet',
    minDays: 21,
    maxDays: 29,
    name: 'Habit Spark',
    title: '21-Day Habit Master',
    emoji: '✨',
    iconType: 'astral',
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    lightBg: 'bg-amber-50 text-amber-900',
    darkBg: 'dark:bg-amber-950/40 dark:text-amber-300',
    borderColor: 'border-amber-400 dark:border-amber-800',
    textColor: 'text-amber-500 dark:text-amber-400',
    glowColor: 'shadow-amber-500/40',
    ringColor: 'ring-amber-400',
    fillColor: 'fill-amber-400 text-amber-100',
    description: '21 days to form an unbreakable learning habit',
    tierRank: 5
  },
  {
    id: 'diamond-inferno',
    minDays: 30,
    maxDays: 49,
    name: 'Diamond Flame',
    title: '30-Day Monthly Legend',
    emoji: '💎',
    iconType: 'diamond',
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    lightBg: 'bg-amber-50 text-amber-950',
    darkBg: 'dark:bg-amber-950/40 dark:text-amber-300',
    borderColor: 'border-amber-400 dark:border-amber-800',
    textColor: 'text-amber-500 dark:text-amber-400',
    glowColor: 'shadow-amber-500/50',
    ringColor: 'ring-amber-400',
    fillColor: 'fill-amber-400 text-amber-100',
    description: '1 continuous month of elite academic dedication',
    tierRank: 6
  },
  {
    id: 'phoenix-crown',
    minDays: 50,
    maxDays: 99,
    name: 'Phoenix Crown',
    title: '50-Day Phoenix Crown',
    emoji: '👑',
    iconType: 'crown',
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    lightBg: 'bg-amber-50 text-amber-950',
    darkBg: 'dark:bg-amber-950/40 dark:text-amber-300',
    borderColor: 'border-amber-400 dark:border-amber-800',
    textColor: 'text-amber-500 dark:text-amber-400',
    glowColor: 'shadow-amber-500/50',
    ringColor: 'ring-amber-400',
    fillColor: 'fill-amber-400 text-amber-100',
    description: 'Half-century milestone of outstanding mastery',
    tierRank: 7
  },
  {
    id: 'cosmic-supernova',
    minDays: 100,
    maxDays: 364,
    name: 'Century Star',
    title: '100-Day Century Supernova',
    emoji: '🌟',
    iconType: 'supernova',
    gradient: 'from-amber-400 via-orange-500 to-amber-600',
    lightBg: 'bg-amber-50 text-amber-950',
    darkBg: 'dark:bg-amber-950/40 dark:text-amber-300',
    borderColor: 'border-amber-400 dark:border-amber-800',
    textColor: 'text-amber-500 dark:text-amber-300',
    glowColor: 'shadow-amber-500/50',
    ringColor: 'ring-amber-400',
    fillColor: 'fill-amber-400 text-amber-100',
    description: 'Triple-digit century milestone of extraordinary excellence',
    tierRank: 8
  },
  {
    id: 'grand-sage',
    minDays: 365,
    maxDays: null,
    name: 'Grand Sage Infinite',
    title: '365-Day Grand Sage',
    emoji: '♾️',
    iconType: 'infinity',
    gradient: 'from-amber-400 via-orange-500 to-amber-600',
    lightBg: 'bg-amber-50 text-amber-950',
    darkBg: 'dark:bg-amber-950/40 dark:text-amber-300',
    borderColor: 'border-amber-400 dark:border-amber-800',
    textColor: 'text-amber-500 dark:text-amber-300',
    glowColor: 'shadow-amber-500/60',
    ringColor: 'ring-amber-400',
    fillColor: 'fill-amber-400 text-amber-100',
    description: '1 full year of continuous unstoppable learning',
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
  const animClass = animate ? 'animate-pulse' : '';

  switch (tier.iconType) {
    case 'sparkles':
      return <Sparkles className={`${currentSizeClass} ${tier.textColor} ${animClass} ${className}`} />;
    case 'flame':
      return <Flame className={`${currentSizeClass} ${tier.textColor} ${animClass} ${className}`} />;
    case 'zap':
      return <Zap className={`${currentSizeClass} ${tier.textColor} ${animClass} ${className}`} />;
    case 'plasma':
      return <Flame className={`${currentSizeClass} text-amber-500 dark:text-amber-400 fill-amber-400/30 drop-shadow-sm ${animClass} ${className}`} />;
    case 'astral':
      return <Sparkles className={`${currentSizeClass} text-amber-500 dark:text-amber-400 drop-shadow-sm ${animClass} ${className}`} />;
    case 'diamond':
      return <Gem className={`${currentSizeClass} text-amber-500 dark:text-amber-400 drop-shadow-sm ${animClass} ${className}`} />;
    case 'crown':
      return <Crown className={`${currentSizeClass} text-amber-500 dark:text-amber-300 drop-shadow-md ${animClass} ${className}`} />;
    case 'supernova':
      return <Star className={`${currentSizeClass} text-amber-500 fill-amber-400 drop-shadow-md ${animClass} ${className}`} />;
    case 'infinity':
      return <InfinityIcon className={`${currentSizeClass} text-amber-500 dark:text-amber-300 drop-shadow-lg ${animClass} ${className}`} />;
    default:
      return <Flame className={`${currentSizeClass} ${tier.textColor} ${className}`} />;
  }
};

interface StreakBadgePillProps {
  streak: number;
  showTitle?: boolean;
  showEmoji?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export const StreakBadgePill: React.FC<StreakBadgePillProps> = ({
  streak = 0,
  showTitle = false,
  showEmoji = true,
  size = 'md',
  onClick,
  className = ''
}) => {
  const tier = getStreakTier(streak);

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2'
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center font-bold rounded-xl border shadow-2xs transition-all ${
        tier.lightBg
      } ${tier.darkBg} ${tier.borderColor} ${sizeStyles[size]} ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
      } ${className}`}
      title={`${streak} Day Streak • Tier: ${tier.name} (${tier.title})`}
    >
      {showEmoji && <span className="text-sm leading-none">{tier.emoji}</span>}
      <StreakTierIcon tier={tier} size={size === 'lg' ? 'md' : 'sm'} animate={streak > 0} />
      <span className="font-mono font-black">{streak}</span>
      <span className="text-[11px] font-medium opacity-80">
        {streak === 1 ? 'day' : 'days'}
      </span>
      {showTitle && (
        <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-md bg-black/10 dark:bg-white/10 text-[10px] uppercase tracking-wider font-extrabold ml-0.5">
          {tier.name}
        </span>
      )}
    </div>
  );
};
