
import React, { useState, useEffect } from 'react';
import { NoteItem, ReminderItem, TimetableEntry } from '../types';
import { Plus, Trash2, Calendar, Clock, CheckSquare, Save, X, Sparkles, StickyNote, Bell, Edit3, Loader2, Edit } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { SJTUTOR_AVATAR } from '../App';

interface NotesViewProps {
  userId: string | null;
  onDeductCredit: (amount: number) => boolean;
}

const NotesView: React.FC<NotesViewProps> = ({ userId, onDeductCredit }) => {
  const [activeTab, setActiveTab] = useState<'NOTES' | 'REMINDERS' | 'TIMETABLE'>('NOTES');
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [editingNote, setEditingNote] = useState<Partial<NoteItem> | null>(null);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [newReminder, setNewReminder] = useState('');
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const key = userId || 'guest';
    const savedNotes = localStorage.getItem(`notes_${key}`);
    if (savedNotes) setNotes(JSON.parse(savedNotes));
  }, [userId]);

  const handleSaveNote = () => {
    if (!editingNote?.title) return;
    const newNote: NoteItem = { id: Date.now().toString(), title: editingNote.title, content: editingNote.content || '', date: Date.now(), tags: [] };
    setNotes(prev => [newNote, ...prev]);
    setEditingNote(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
        <button 
          onClick={() => setActiveTab('NOTES')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${activeTab === 'NOTES' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <StickyNote className="w-4 h-4" /> Notes
        </button>
        <button 
          onClick={() => setActiveTab('REMINDERS')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${activeTab === 'REMINDERS' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <Bell className="w-4 h-4" /> Reminders
        </button>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'NOTES' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             <div onClick={() => setEditingNote({})} className="min-h-[160px] flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
               <Plus className="w-6 h-6 text-slate-400" />
               <p className="text-slate-500 text-sm mt-2">New Note</p>
             </div>
             {notes.map(note => (
               <div key={note.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                 <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate">{note.title}</h4>
                 <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 line-clamp-3">{note.content}</p>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesView;
