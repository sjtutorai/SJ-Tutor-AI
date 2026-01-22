
import React, { useState, useEffect } from 'react';
import { NoteItem, ReminderItem, TimetableEntry, SJTUTOR_AVATAR, NoteStatus, NoteTemplate, PriorityLevel } from '../types';
import { 
  Plus, Trash2, Calendar, Clock, CheckSquare, Save, X, Sparkles, 
  StickyNote, Bell, Edit3, Loader2, Edit, Share2, Folder, 
  ChevronRight, Star, Tag, Book, Lightbulb, Languages, Download, MoreVertical,
  CheckCircle2, Circle, AlertCircle, History
} from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface NotesViewProps {
  userId: string | null;
  onDeductCredit: (amount: number) => boolean;
}

const NotesView: React.FC<NotesViewProps> = ({ userId, onDeductCredit }) => {
  const [activeTab, setActiveTab] = useState<'NOTES' | 'REMINDERS' | 'TIMETABLE'>('NOTES');
  const [viewMode, setViewMode] = useState<'SUBJECTS' | 'LIST' | 'EDITOR'>('SUBJECTS');
  const [reminderFilter, setReminderFilter] = useState<'TODAY' | 'UPCOMING' | 'COMPLETED'>('TODAY');
  
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Partial<NoteItem> | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Derived subjects from the existing notes
  const subjects = Array.from(new Set(notes.map(n => n.subject || 'General'))).sort();

  // Filtered notes based on subject selection and search query
  const filteredNotes = notes.filter(note => {
    const matchesSubject = selectedSubject ? note.subject === selectedSubject : true;
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          note.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });
  
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [newReminder, setNewReminder] = useState<Partial<ReminderItem>>({
    priority: 'Medium',
    task: '',
    subject: 'General'
  });

  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [examDate, setExamDate] = useState('');
  const [examSubjects, setExamSubjects] = useState('');
  const [studyHours, setStudyHours] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const key = userId || 'guest';
    const savedNotes = localStorage.getItem(`notes_${key}`);
    const savedReminders = localStorage.getItem(`reminders_${key}`);
    const savedTimetable = localStorage.getItem(`timetable_${key}`);
    if (savedNotes) setNotes(JSON.parse(savedNotes));
    if (savedReminders) setReminders(JSON.parse(savedReminders));
    if (savedTimetable) setTimetable(JSON.parse(savedTimetable));
  }, [userId]);

  useEffect(() => {
    const key = userId || 'guest';
    localStorage.setItem(`notes_${key}`, JSON.stringify(notes));
    localStorage.setItem(`reminders_${key}`, JSON.stringify(reminders));
    localStorage.setItem(`timetable_${key}`, JSON.stringify(timetable));
  }, [notes, reminders, timetable, userId]);

  const handleCreateNote = async (template: NoteTemplate = 'Blank') => {
    const subject = selectedSubject || 'General';
    let content = '';
    if (template !== 'Blank') {
      setIsAiLoading(true);
      try {
        content = await GeminiService.generateNoteTemplate(subject, 'New Chapter', template) || '';
      } catch (e) {
        content = `# ${template} Notes\nStart writing here...`;
      } finally {
        setIsAiLoading(false);
      }
    }
    const newNote: NoteItem = {
      id: Date.now().toString(), title: 'Untitled Note', content, subject, chapter: 'General',
      template, status: 'New', isFavorite: false, date: Date.now(), tags: [], difficulty: 'Medium'
    };
    setNotes([newNote, ...notes]);
    setEditingNote(newNote);
    setViewMode('EDITOR');
  };

  const handleSaveNote = () => {
    if (!editingNote?.id) return;
    setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, ...editingNote } as NoteItem : n));
    setViewMode('LIST');
    setEditingNote(null);
  };

  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm("Delete this note?")) {
      setNotes(prev => prev.filter(n => n.id !== id));
      if (editingNote?.id === id) { setEditingNote(null); setViewMode('LIST'); }
    }
  };

  const handleSmartSuggest = async () => {
    if (!editingNote?.title) return;
    setIsAiLoading(true);
    try {
      const suggest = await GeminiService.suggestSmartReminder(editingNote.title, editingNote.subject || 'General', editingNote.difficulty || 'Medium');
      if (suggest) {
        setNewReminder({
          ...newReminder,
          task: `Revise ${editingNote.title}`,
          dueTime: `${suggest.suggestedDate}T${suggest.suggestedTime}`,
          aiMessage: suggest.message
        });
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddReminder = () => {
    if (!newReminder.task || !newReminder.dueTime) return;
    const item: ReminderItem = {
      id: Date.now().toString(),
      noteId: editingNote?.id,
      task: newReminder.task,
      subject: newReminder.subject || 'General',
      dueTime: new Date(newReminder.dueTime).toISOString(),
      completed: false,
      priority: newReminder.priority || 'Medium',
      aiMessage: newReminder.aiMessage
    };
    setReminders([item, ...reminders]);
    setShowReminderModal(false);
    setNewReminder({ priority: 'Medium', task: '', subject: 'General' });
  };

  const filteredReminders = reminders.filter(r => {
    const today = new Date().toDateString();
    const due = new Date(r.dueTime).toDateString();
    if (reminderFilter === 'TODAY') return due === today && !r.completed;
    if (reminderFilter === 'UPCOMING') return due !== today && !r.completed;
    return r.completed;
  }).sort((a, b) => new Date(a.dueTime).getTime() - new Date(b.dueTime).getTime());

  const getPriorityColor = (p: PriorityLevel) => {
    if (p === 'High') return 'border-red-500 text-red-700 bg-red-50';
    if (p === 'Medium') return 'border-amber-500 text-amber-700 bg-amber-50';
    return 'border-slate-300 text-slate-700 bg-slate-50';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
        {['NOTES', 'REMINDERS', 'TIMETABLE'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${activeTab === tab ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            {tab === 'NOTES' && <StickyNote className="w-4 h-4" />}
            {tab === 'REMINDERS' && <Bell className="w-4 h-4" />}
            {tab === 'TIMETABLE' && <Calendar className="w-4 h-4" />}
            {tab}
          </button>
        ))}
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'NOTES' && (
          <div className="animate-in fade-in duration-300">
            {viewMode !== 'EDITOR' && (
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <input type="text" placeholder="Search notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                  <Folder className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                </div>
                <button onClick={() => handleCreateNote('Blank')} className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20">
                  <Plus className="w-4 h-4" /> New Note
                </button>
              </div>
            )}

            {viewMode === 'SUBJECTS' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {subjects.map(subject => (
                  <div key={subject} onClick={() => { setSelectedSubject(subject); setViewMode('LIST'); }} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-primary-500 cursor-pointer group transition-all shadow-sm">
                    <Folder className="w-8 h-8 text-primary-600 mb-4" />
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white truncate">{subject}</h3>
                    <p className="text-sm text-slate-400">{notes.filter(n => n.subject === subject).length} notes</p>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'LIST' && (
              <div className="space-y-4">
                <button onClick={() => { setSelectedSubject(null); setViewMode('SUBJECTS'); }} className="flex items-center text-sm font-bold text-slate-500 hover:text-primary-600 mb-2">
                  <ChevronRight className="w-4 h-4 rotate-180" /> Back to Subjects
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNotes.map(note => (
                    <div key={note.id} onClick={() => { setEditingNote(note); setViewMode('EDITOR'); }} className="relative bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex justify-between items-start mb-3">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold uppercase">{note.template}</span>
                        <button onClick={(e) => handleDeleteNote(note.id, e)} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-white mb-2 line-clamp-1">{note.title}</h4>
                      <p className="text-xs text-slate-400">{note.subject} • {note.difficulty}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewMode === 'EDITOR' && editingNote && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-slate-200 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                    <input type="text" value={editingNote.title} onChange={(e) => setEditingNote({...editingNote, title: e.target.value})} className="font-bold text-slate-800 dark:text-white bg-transparent outline-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { 
                      setNewReminder({ task: `Revise ${editingNote.title}`, subject: editingNote.subject || 'General' });
                      setShowReminderModal(true);
                    }} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg flex items-center gap-2 text-sm font-bold">
                      <Bell className="w-4 h-4" /> 🔔 Reminder
                    </button>
                    <button onClick={handleSaveNote} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2">
                      <Save className="w-4 h-4" /> Save
                    </button>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row h-[500px]">
                  <textarea value={editingNote.content} onChange={(e) => setEditingNote({...editingNote, content: e.target.value})} className="flex-1 p-6 bg-transparent outline-none resize-none dark:text-slate-200 border-r border-slate-100 dark:border-slate-700 font-mono text-sm" />
                  <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/20">
                     <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{editingNote.content || ''}</ReactMarkdown></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'REMINDERS' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
             <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
                {['TODAY', 'UPCOMING', 'COMPLETED'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setReminderFilter(f as any)}
                    className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${reminderFilter === f ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    {f}
                  </button>
                ))}
             </div>

             <div className="grid gap-4">
                {filteredReminders.length === 0 && (
                  <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center">
                    <History className="w-12 h-12 text-slate-200 mb-4" />
                    <p className="text-slate-400 font-medium">No reminders here.</p>
                  </div>
                )}
                {filteredReminders.map(r => (
                  <div key={r.id} className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border-l-4 shadow-sm flex items-center gap-4 group transition-all hover:shadow-md ${getPriorityColor(r.priority)}`}>
                    <button onClick={() => setReminders(reminders.map(rem => rem.id === r.id ? {...rem, completed: !rem.completed} : rem))} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${r.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                      {r.completed && <CheckSquare className="w-4 h-4 text-white" />}
                    </button>
                    <div className="flex-1 cursor-pointer" onClick={() => {
                      if(r.noteId) {
                        const note = notes.find(n => n.id === r.noteId);
                        if(note) { setEditingNote(note); setViewMode('EDITOR'); setActiveTab('NOTES'); }
                      }
                    }}>
                      <h4 className={`font-bold text-slate-800 dark:text-white ${r.completed ? 'line-through opacity-50' : ''}`}>{r.task}</h4>
                      <p className="text-[10px] text-slate-500 flex items-center gap-2 mt-1">
                        <Tag className="w-3 h-3" /> {r.subject} • <Clock className="w-3 h-3 ml-1" /> {new Date(r.dueTime).toLocaleString([], { hour: '2-digit', minute:'2-digit', weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      {r.aiMessage && !r.completed && (
                        <div className="mt-2 text-xs bg-white/50 p-2 rounded-lg italic text-primary-600 flex items-center gap-2">
                           <Sparkles className="w-3 h-3" /> "{r.aiMessage}"
                        </div>
                      )}
                    </div>
                    <button onClick={() => setReminders(reminders.filter(rem => rem.id !== r.id))} className="text-slate-300 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'TIMETABLE' && (
          <div className="max-w-4xl mx-auto space-y-6">
             {/* Same timetable logic as before */}
             <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border text-center">
                <Calendar className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-4">Exam Planner</h2>
                <div className="max-w-md mx-auto space-y-4 text-left">
                  <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="w-full p-3 border rounded-xl" />
                  <textarea placeholder="Subjects..." value={examSubjects} onChange={e => setExamSubjects(e.target.value)} className="w-full p-3 border rounded-xl" />
                  <button onClick={async () => { if(!examDate || !examSubjects) return; setIsGenerating(true); try { const s = await GeminiService.generateStudyTimetable(examDate, examSubjects, studyHours); if(s) setTimetable(s); } finally { setIsGenerating(false); } }} className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold">Generate</button>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* REMINDER MODAL */}
      {showReminderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReminderModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-md p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary-500" /> Set Study Reminder
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Task Name</label>
                <input type="text" value={newReminder.task} onChange={e => setNewReminder({...newReminder, task: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Due Time</label>
                    <input type="datetime-local" value={newReminder.dueTime} onChange={e => setNewReminder({...newReminder, dueTime: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Priority</label>
                    <select value={newReminder.priority} onChange={e => setNewReminder({...newReminder, priority: e.target.value as any})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm">
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                 </div>
              </div>
              
              <button onClick={handleSmartSuggest} disabled={isAiLoading} className="w-full py-2.5 bg-primary-50 text-primary-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-primary-100 hover:bg-primary-100 transition-colors">
                {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Smart Suggest Time & Message
              </button>

              {newReminder.aiMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl animate-in fade-in slide-in-from-top-1">
                   <p className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Suggestion:</p>
                   <p className="text-xs text-emerald-700 italic">"{newReminder.aiMessage}"</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                 <button onClick={() => setShowReminderModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                 <button onClick={handleAddReminder} className="flex-1 py-3 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20">Set Reminder</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesView;
