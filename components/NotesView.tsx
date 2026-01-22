
import React, { useState, useEffect } from 'react';
import { NoteItem, ReminderItem, TimetableEntry, SJTUTOR_AVATAR, NoteStatus, NoteTemplate } from '../types';
import { 
  Plus, Trash2, Calendar, Clock, CheckSquare, Save, X, Sparkles, 
  StickyNote, Bell, Edit3, Loader2, Edit, Share2, Folder, 
  ChevronRight, Star, Tag, Book, Lightbulb, Languages, Download, MoreVertical,
  CheckCircle2, Circle
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
  
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Partial<NoteItem> | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [newReminder, setNewReminder] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
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

  const subjects = Array.from(new Set(notes.map(n => n.subject)));
  const filteredNotes = notes.filter(n => {
    const matchesSubject = !selectedSubject || n.subject === selectedSubject;
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const handleCreateNote = async (template: NoteTemplate = 'Blank') => {
    const subject = selectedSubject || 'General';
    const chapter = 'New Chapter';
    let content = '';

    if (template !== 'Blank') {
      setIsAiLoading(true);
      try {
        content = await GeminiService.generateNoteTemplate(subject, chapter, template) || '';
      } catch (e) {
        content = `# ${template} Notes\nStart writing here...`;
      } finally {
        setIsAiLoading(false);
      }
    }

    const newNote: NoteItem = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content,
      subject,
      chapter,
      template,
      status: 'New',
      isFavorite: false,
      date: Date.now(),
      tags: []
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
    if (window.confirm("Are you sure you want to delete this note? This cannot be undone.")) {
      setNotes(prev => prev.filter(n => n.id !== id));
      if (editingNote?.id === id) {
        setEditingNote(null);
        setViewMode('LIST');
      }
    }
  };

  const handleAiAction = async (task: 'summarize' | 'simplify' | 'mcq' | 'translate') => {
    if (!editingNote?.content) return;
    const cost = 5;
    if (!onDeductCredit(cost)) { alert(`AI actions cost ${cost} credits.`); return; }
    setIsAiLoading(true);
    try {
      const result = await GeminiService.processNoteAI(editingNote.content, task);
      if (result) {
        setEditingNote({
          ...editingNote,
          content: `${editingNote.content}\n\n---\n### AI ${task.toUpperCase()}\n${result}`
        });
      }
    } catch (e) { alert("AI request failed."); } finally { setIsAiLoading(false); }
  };

  const StatusIcon = ({ status }: { status: NoteStatus }) => {
    if (status === 'Mastered') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === 'Revised') return <CheckSquare className="w-4 h-4 text-amber-500" />;
    return <Circle className="w-4 h-4 text-slate-300" />;
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
                {subjects.length === 0 && <div className="col-span-full py-20 text-center text-slate-400">No notes yet. Create your first one above!</div>}
                {subjects.map(subject => {
                  const count = notes.filter(n => n.subject === subject).length;
                  return (
                    <div key={subject} onClick={() => { setSelectedSubject(subject); setViewMode('LIST'); }} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-primary-500 cursor-pointer group transition-all shadow-sm">
                      <Folder className="w-8 h-8 text-primary-600 mb-4" />
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white truncate">{subject}</h3>
                      <p className="text-sm text-slate-400">{count} notes</p>
                    </div>
                  );
                })}
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
                        <div className="flex gap-2 items-center">
                          <StatusIcon status={note.status} />
                          <button onClick={(e) => handleDeleteNote(note.id, e)} className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-white mb-2 line-clamp-1">{note.title}</h4>
                      <p className="text-sm text-slate-500 line-clamp-3">{note.content.substring(0, 100)}...</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewMode === 'EDITOR' && editingNote && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95">
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-slate-200 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                    <input type="text" value={editingNote.title} onChange={(e) => setEditingNote({...editingNote, title: e.target.value})} className="font-bold text-slate-800 dark:text-white bg-transparent outline-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDeleteNote(editingNote.id!)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Note">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={handleSaveNote} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2">
                      <Save className="w-4 h-4" /> Save
                    </button>
                  </div>
                </div>

                <div className="px-6 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex gap-2 overflow-x-auto">
                   {['summarize', 'simplify', 'mcq', 'translate'].map(action => (
                     <button key={action} onClick={() => handleAiAction(action as any)} className="flex-shrink-0 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-xs font-bold flex items-center gap-1.5 hover:bg-primary-100">
                        <Sparkles className="w-3 h-3" /> {action.toUpperCase()}
                     </button>
                   ))}
                </div>

                <div className="flex flex-col md:flex-row h-[500px]">
                  <textarea value={editingNote.content} onChange={(e) => setEditingNote({...editingNote, content: e.target.value})} className="flex-1 p-6 bg-transparent outline-none resize-none dark:text-slate-200 border-r border-slate-100 dark:border-slate-700 font-mono text-sm" placeholder="Write notes here..." />
                  <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/20">
                     <div className="prose prose-sm dark:prose-invert max-w-none markdown-body"><ReactMarkdown>{editingNote.content || '*No content yet*'}</ReactMarkdown></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'REMINDERS' && (
          <div className="max-w-3xl mx-auto space-y-4">
             <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
               <h3 className="font-bold mb-4">Add Task</h3>
               <div className="flex gap-2">
                 <input type="text" value={newReminder} onChange={e => setNewReminder(e.target.value)} placeholder="Task description..." className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-lg outline-none" />
                 <button onClick={() => { if(!newReminder) return; setReminders([...reminders, { id: Date.now().toString(), task: newReminder, dueTime: '', completed: false }]); setNewReminder(''); }} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold">Add</button>
               </div>
            </div>
            <div className="space-y-2">
              {reminders.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <button onClick={() => setReminders(reminders.map(r => r.id === item.id ? {...r, completed: !r.completed} : r))} className={`w-5 h-5 rounded-full border-2 ${item.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`} />
                  <span className={`flex-1 ${item.completed ? 'line-through text-slate-400' : ''}`}>{item.task}</span>
                  <button onClick={() => setReminders(reminders.filter(r => r.id !== item.id))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'TIMETABLE' && (
          <div className="max-w-4xl mx-auto text-center">
             {timetable.length === 0 ? (
               <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <Calendar className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                  <h2 className="text-xl font-bold mb-2">Personalized Planner</h2>
                  <p className="text-slate-500 mb-6">I can create a study schedule for your upcoming exams.</p>
                  <div className="space-y-4 text-left max-w-md mx-auto">
                    <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="w-full px-4 py-2 border rounded-xl" />
                    <textarea value={examSubjects} onChange={e => setExamSubjects(e.target.value)} placeholder="Enter subjects..." className="w-full px-4 py-2 border rounded-xl" />
                    <button onClick={async () => { if(!examDate || !examSubjects) return; if(!onDeductCredit(10)) return; setIsGenerating(true); try { const s = await GeminiService.generateStudyTimetable(examDate, examSubjects, studyHours); if(s) setTimetable(s); } finally { setIsGenerating(false); } }} className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white rounded-xl font-bold shadow-lg">Generate Timetable</button>
                  </div>
               </div>
             ) : (
               <div className="space-y-6 text-left">
                  {timetable.map((day, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border">
                      <h4 className="font-bold border-b pb-2 mb-4">{day.day} - {day.date}</h4>
                      {day.slots.map((s, j) => (
                        <div key={j} className="flex gap-4 mb-2 text-sm">
                          <span className="font-bold text-primary-600">{s.time}</span>
                          <span>{s.subject}: {s.activity}</span>
                        </div>
                      ))}
                    </div>
                  ))}
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesView;
