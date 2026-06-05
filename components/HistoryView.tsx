import React, { useState } from 'react';
import { AppMode, HistoryItem } from '../types';
import { 
  FileText, 
  BrainCircuit, 
  BookOpen, 
  MessageCircle, 
  Calendar, 
  Search, 
  Trash2, 
  Filter,
  Clock,
  Camera,
  TrendingUp,
  Award
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HistoryViewProps {
  history: HistoryItem[];
  onLoadItem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, onLoadItem, onDeleteItem }) => {
  const [filter, setFilter] = useState<AppMode | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = history.filter(item => {
    const matchesFilter = filter === 'ALL' || item.type === filter;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const quizItems = history
    .filter(item => item.type === AppMode.QUIZ)
    .sort((a, b) => a.timestamp - b.timestamp);

  const parsedQuizData = quizItems.map((item, idx) => {
    let numericScore = 0;
    if (typeof item.score === 'number') {
      numericScore = item.score;
    } else if (typeof item.score === 'string') {
      if (item.score.includes('/')) {
        const [num, den] = item.score.split('/').map(Number);
        numericScore = den ? Math.round((num / den) * 100) : num;
      } else {
        numericScore = parseFloat(item.score.replace(/[^0-9.]/g, '')) || 0;
      }
    }
    return {
      index: idx + 1,
      date: new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      subject: item.subtitle,
      score: numericScore,
      rawScore: item.score || `${numericScore}%`
    };
  });

  const getIcon = (type: AppMode) => {
    switch (type) {
      case AppMode.QUIZ: return <BrainCircuit className="w-5 h-5" />;
      case AppMode.SUMMARY: return <FileText className="w-5 h-5" />;
      case AppMode.HOMEWORK: return <Camera className="w-5 h-5" />;
      case AppMode.ESSAY: return <BookOpen className="w-5 h-5" />;
      case AppMode.TUTOR: return <MessageCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getColorClass = (type: AppMode) => {
    switch (type) {
      case AppMode.QUIZ: return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
      case AppMode.SUMMARY: return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      case AppMode.HOMEWORK: return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
      case AppMode.ESSAY: return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400';
      case AppMode.TUTOR: return 'text-violet-600 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-400';
      default: return 'text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary-500" />
            Activity History
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            View and revisit your generated content and study sessions
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none w-full sm:w-64"
            />
          </div>
          
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Filter className="w-4 h-4 text-slate-400 ml-2" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer py-1 pr-8"
            >
              <option value="ALL">All Items</option>
              <option value={AppMode.SUMMARY}>Summaries</option>
              <option value={AppMode.HOMEWORK}>Homeworks</option>
              <option value={AppMode.QUIZ}>Quizzes</option>
              <option value={AppMode.ESSAY}>Essays</option>
              <option value={AppMode.TUTOR}>Chats</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quiz Progress & Trend Chart Section */}
      {(filter === 'ALL' || filter === AppMode.QUIZ) && parsedQuizData.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm mb-8 animate-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Quiz Score Trend over Time
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Track and visualize your chronological evaluation scores across mock exams.</p>
            </div>
            
            <div className="flex gap-4 items-center self-start sm:self-center">
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-450 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-xs font-bold font-sans">
                <Award className="w-4 h-4" />
                <span>Average Score: {Math.round(parsedQuizData.reduce((acc, c) => acc + c.score, 0) / parsedQuizData.length)}%</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={parsedQuizData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" className="hidden dark:block" />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs max-w-sm">
                          <p className="font-bold text-[10px] text-amber-400 uppercase tracking-wider mb-0.5">{data.date}</p>
                          <p className="font-semibold text-white truncate max-w-[200px]">{data.subject}</p>
                          <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex justify-between items-center gap-4">
                            <span className="text-slate-400">Score Achieved:</span>
                            <span className="font-bold text-emerald-400">{data.rawScore} ({data.score}%)</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#f59e0b" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {filteredHistory.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No history found</h3>
          <p className="text-slate-500 dark:text-slate-400">
            {searchQuery || filter !== 'ALL' 
              ? "Try adjusting your search or filters" 
              : "Start generating content to see it here"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              onClick={() => onLoadItem(item)}
              className="group bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getColorClass(item.type)}`}>
                  {getIcon(item.type)}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full font-medium">
                      {item.subtitle}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                    {item.type === AppMode.QUIZ && item.score !== undefined && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Score: {item.score}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteItem(item.id);
                }}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryView;
