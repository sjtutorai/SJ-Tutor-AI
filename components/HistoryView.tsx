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
  Clock
} from 'lucide-react';

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

  const getIcon = (type: AppMode) => {
    switch (type) {
      case AppMode.QUIZ: return <BrainCircuit className="w-5 h-5" />;
      case AppMode.SUMMARY: return <FileText className="w-5 h-5" />;
      case AppMode.ESSAY: return <BookOpen className="w-5 h-5" />;
      case AppMode.TUTOR: return <MessageCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getColorClass = (type: AppMode) => {
    switch (type) {
      case AppMode.QUIZ: return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
      case AppMode.SUMMARY: return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
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
              <option value={AppMode.QUIZ}>Quizzes</option>
              <option value={AppMode.ESSAY}>Essays</option>
              <option value={AppMode.TUTOR}>Chats</option>
            </select>
          </div>
        </div>
      </div>

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
