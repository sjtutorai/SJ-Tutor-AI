
import React, { useState } from 'react';
import { FlaggedContent } from '../types';
import { AlertTriangle, CheckCircle, XCircle, MessageSquare, Clock, User, ExternalLink, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModerationViewProps {
  flags: FlaggedContent[];
  onResolve: (flagId: string, status: 'resolved' | 'dismissed', feedback: string) => void;
}

const ModerationView: React.FC<ModerationViewProps> = ({ flags, onResolve }) => {
  const [selectedFlag, setSelectedFlag] = useState<FlaggedContent | null>(null);
  const [feedback, setFeedback] = useState('');

  const handleResolve = (status: 'resolved' | 'dismissed') => {
    if (selectedFlag) {
      onResolve(selectedFlag.id, status, feedback);
      setSelectedFlag(null);
      setFeedback('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Shield className="w-7 h-7 text-primary-500" />
          Content Moderation
        </h2>
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border border-amber-100 dark:border-amber-800">
          <Clock className="w-3.5 h-3.5" />
          {flags.filter(f => f.status === 'pending').length} Pending Reviews
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flags List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wider">Flagged Items</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[600px] overflow-y-auto">
              {flags.map(flag => (
                <button
                  key={flag.id}
                  onClick={() => setSelectedFlag(flag)}
                  className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-start gap-3 ${
                    selectedFlag?.id === flag.id ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500' : ''
                  }`}
                >
                  <div className={`mt-1 p-1.5 rounded-lg ${
                    flag.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400">{flag.contentType}</span>
                      <span className="text-[10px] text-slate-400">{new Date(flag.timestamp).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-semibold text-slate-800 dark:text-white text-sm truncate">{flag.reason}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {flag.flaggedBy}
                    </p>
                  </div>
                </button>
              ))}
              {flags.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No flagged content found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Flag Detail */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedFlag ? (
              <motion.div
                key={selectedFlag.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Review Flag</h3>
                    <p className="text-sm text-slate-500">Flagged on {new Date(selectedFlag.timestamp).toLocaleString()}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    selectedFlag.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {selectedFlag.status}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Content Type</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 capitalize">{selectedFlag.contentType}</span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Reason</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedFlag.reason}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Original Content Snippet</label>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 max-h-40 overflow-y-auto text-sm text-slate-600 dark:text-slate-400 font-mono">
                    {typeof selectedFlag.originalContent === 'string' 
                      ? selectedFlag.originalContent 
                      : JSON.stringify(selectedFlag.originalContent, null, 2)}
                  </div>
                </div>

                {selectedFlag.status === 'pending' && (
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Feedback / Correction</label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none min-h-[100px] text-slate-800 dark:text-white"
                        placeholder="Provide feedback to improve the AI model..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleResolve('dismissed')}
                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-5 h-5" />
                        Dismiss Flag
                      </button>
                      <button
                        onClick={() => handleResolve('resolved')}
                        className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Mark Resolved
                      </button>
                    </div>
                  </div>
                )}

                {selectedFlag.status !== 'pending' && selectedFlag.adminFeedback && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm mb-2">
                      <MessageSquare className="w-4 h-4" />
                      Admin Feedback
                    </div>
                    <p className="text-sm text-emerald-600 dark:text-emerald-300 italic">&quot;{selectedFlag.adminFeedback}&quot;</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
                <Shield className="w-16 h-16 mb-4 opacity-20" />
                <p>Select a flagged item to review</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ModerationView;
