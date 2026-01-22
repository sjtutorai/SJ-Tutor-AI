
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
  
  // States
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Partial<NoteItem> | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reminders/Timetable (Existing Logic Preserved)
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [newReminder, setNewReminder] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [examDate, setExamDate] = useState('');
  const [examSubjects, setExamSubjects] = useState('');
  const [studyHours, setStudyHours] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showEditTimetable, setShowEditTimetable] = useState(false);
  const [editInstruction, setEditInstruction] = useState('');

  // Load/Persist
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

  // Derived
  const subjects = Array.from(new Set(notes.map(n => n.subject)));
  const filteredNotes = notes.filter(n => {
    const matchesSubject = !selectedSubject || n.subject === selectedSubject;
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  // Handlers
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

  const handleAiAction = async (task: 'summarize' | 'simplify' | 'mcq' | 'translate') => {
    if (!editingNote?.content) return;
    
    const cost = 5;
    if (!onDeductCredit(cost)) {
      alert(`AI actions cost ${cost} credits.`);
      return;
    }

    setIsAiLoading(true);
    try {
      const result = await GeminiService.processNoteAI(editingNote.content, task);
      if (result) {
        setEditingNote({
          ...editingNote,
          content: `${editingNote.content}\n\n---\n### AI ${task.toUpperCase()}\n${result}`
        });
      }
    } catch (e) {
      alert("AI request failed. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // UI Components
  const StatusIcon = ({ status }: { status: NoteStatus }) => {
    if (status === 'Mastered') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === 'Revised') return <CheckSquare className="w-4 h-4 text-amber-500" />;
    return <Circle className="w-4 h-4 text-slate-300" />;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Navigation Tabs */}
      <div className="flex p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
        {['NOTES', 'REMINDERS', 'TIMETABLE'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${activeTab === tab ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
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
            
            {/* SEARCH & FILTERS */}
            {viewMode !== 'EDITOR' && (
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    placeholder="Search notes..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <Folder className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleCreateNote('Blank')} className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20">
                    <Plus className="w-4 h-4" /> New Note
                  </button>
                </div>
              </div>
            )}

            {/* SUBJECTS VIEW */}
            {viewMode === 'SUBJECTS' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {subjects.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <Book className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <h3 className="font-bold text-slate-700 dark:text-slate-300">No notes yet</h3>
                    <p className="text-sm text-slate-400 mt-1">Start by creating your first study note.</p>
                  </div>
                )}
                {subjects.map(subject => {
                  const count = notes.filter(n => n.subject === subject).length;
                  return (
                    <div 
                      key={subject}
                      onClick={() => { setSelectedSubject(subject); setViewMode('LIST'); }}
                      className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 cursor-pointer group transition-all hover:-translate-y-1 shadow-sm"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 mb-4 group-hover:scale-110 transition-transform">
                        <Folder className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white truncate">{subject}</h3>
                      <p className="text-sm text-slate-400 mt-1">{count} notes</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* LIST VIEW */}
            {viewMode === 'LIST' && (
              <div className="space-y-4">
                <button 
                  onClick={() => { setSelectedSubject(null); setViewMode('SUBJECTS'); }}
                  className="flex items-center text-sm font-bold text-slate-500 hover:text-primary-600 mb-2"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" /> Back to Subjects
                </button>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{selectedSubject || 'All Notes'}</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNotes.map(note => (
                    <div 
                      key={note.id}
                      onClick={() => { setEditingNote(note); setViewMode('EDITOR'); }}
                      className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          note.template === 'Formula' ? 'bg-blue-50 text-blue-600' :
                          note.template === 'Q&A' ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {note.template}
                        </div>
                        <StatusIcon status={note.status} />
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-white line-clamp-1 mb-2 group-hover:text-primary-600">{note.title}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-4">{note.content.replace(/[#*]/g, '')}</p>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-3 border-t border-slate-50 dark:border-slate-700">
                        <span>{new Date(note.date).toLocaleDateString()}</span>
                        <div className="flex gap-2">
                           {note.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                           <Tag className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EDITOR VIEW */}
            {viewMode === 'EDITOR' && editingNote && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Editor Header */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                    <div className="flex flex-col">
                      <input 
                        type="text" 
                        value={editingNote.title} 
                        onChange={(e) => setEditingNote({...editingNote, title: e.target.value})}
                        className="font-bold text-slate-800 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-primary-500"
                        placeholder="Note Title"
                      />
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{editingNote.subject} • {editingNote.chapter}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleSaveNote} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                      <Save className="w-4 h-4" /> Save
                    </button>
                  </div>
                </div>

                {/* AI ACTION BAR */}
                <div className="px-6 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex gap-2 overflow-x-auto custom-scrollbar">
                   <button onClick={() => handleAiAction('summarize')} className="flex-shrink-0 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-xs font-bold flex items-center gap-1.5 hover:bg-primary-100">
                      <Sparkles className="w-3.5 h-3.5" /> Summarize
                   </button>
                   <button onClick={() => handleAiAction('simplify')} className="flex-shrink-0 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-bold flex items-center gap-1.5 hover:bg-blue-100">
                      <Lightbulb className="w-3.5 h-3.5" /> Simplify
                   </button>
                   <button onClick={() => handleAiAction('mcq')} className="flex-shrink-0 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs font-bold flex items-center gap-1.5 hover:bg-purple-100">
                      <Edit3 className="w-3.5 h-3.5" /> Get MCQs
                   </button>
                   <button onClick={() => handleAiAction('translate')} className="flex-shrink-0 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold flex items-center gap-1.5 hover:bg-amber-100">
                      <Languages className="w-3.5 h-3.5" /> Hindi
                   </button>
                </div>

                <div className="flex flex-col md:flex-row h-[500px]">
                  {/* Markdown Editor */}
                  <textarea 
                    value={editingNote.content}
                    onChange={(e) => setEditingNote({...editingNote, content: e.target.value})}
                    placeholder="Write your study notes here..."
                    className="flex-1 p-6 bg-transparent outline-none resize-none dark:text-slate-200 border-r border-slate-100 dark:border-slate-700 font-mono text-sm"
                  />
                  
                  {/* Live Preview */}
                  <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/20 custom-scrollbar">
                     <div className="prose prose-sm dark:prose-invert max-w-none markdown-body">
                        <ReactMarkdown>{editingNote.content || '*No content yet*'}</ReactMarkdown>
                     </div>
                  </div>
                </div>

                {/* Editor Footer */}
                <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                       Status: 
                       <select 
                         value={editingNote.status} 
                         onChange={(e) => setEditingNote({...editingNote, status: e.target.value as NoteStatus})}
                         className="bg-transparent text-primary-600 outline-none"
                       >
                         <option value="New">New</option>
                         <option value="Revised">Revised</option>
                         <option value="Mastered">Mastered</option>
                       </select>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                       <input 
                         type="checkbox" 
                         checked={editingNote.isFavorite} 
                         onChange={(e) => setEditingNote({...editingNote, isFavorite: e.target.checked})}
                         className="sr-only"
                       />
                       <Star className={`w-3.5 h-3.5 ${editingNote.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`} />
                       Favorite
                    </label>
                  </div>
                  {isAiLoading && <div className="flex items-center gap-2 text-primary-600"><Loader2 className="w-3 h-3 animate-spin" /> AI Thinking...</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- REMINDERS TAB --- (Preserved Logic) */}
        {activeTab === 'REMINDERS' && (
          <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
             <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
               <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                 <Plus className="w-5 h-5 text-primary-500" />
                 Add New Task
               </h3>
               <div className="flex flex-col sm:flex-row gap-3">
                 <input 
                   type="text" 
                   value={newReminder}
                   onChange={e => setNewReminder(e.target.value)}
                   placeholder="What needs to be done?"
                   className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
                 />
                 <div className="flex gap-2">
                    <input 
                      type="date" 
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-slate-600 text-sm"
                    />
                    <input 
                      type="time" 
                      value={newTime}
                      onChange={e => setNewTime(e.target.value)}
                      className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-slate-600 text-sm"
                    />
                 </div>
                 <button 
                  onClick={() => {
                    if (!newReminder) return;
                    let dueTimeString = newDate ? `${newDate}T${newTime || '23:59'}` : '';
                    const item: ReminderItem = {
                      id: Date.now().toString(),
                      task: newReminder,
                      dueTime: dueTimeString ? new Date(dueTimeString).toISOString() : '',
                      completed: false
                    };
                    setReminders([...reminders, item]);
                    setNewReminder(''); setNewDate(''); setNewTime('');
                  }}
                  className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                 >
                   Add
                 </button>
               </div>
            </div>

            <div className="space-y-3">
              {reminders.map(item => (
                <div key={item.id} className={`flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border transition-all ${item.completed ? 'border-slate-100 opacity-60' : 'border-slate-200 dark:border-slate-700 shadow-sm'}`}>
                  <button 
                    onClick={() => setReminders(reminders.map(r => r.id === item.id ? {...r, completed: !r.completed} : r))}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${item.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-primary-400'}`}
                  >
                    {item.completed && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                  </button>
                  <div className="flex-1">
                    <p className={`font-medium ${item.completed ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-white'}`}>{item.task}</p>
                    {item.dueTime && <p className="text-xs text-slate-400 flex items-center gap-1 mt-1"><Clock className="w-3 h-3" />{new Date(item.dueTime).toLocaleString()}</p>}
                  </div>
                  <button onClick={() => setReminders(reminders.filter(r => r.id !== item.id))} className="text-slate-300 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TIMETABLE TAB --- (Preserved Logic) */}
        {activeTab === 'TIMETABLE' && (
          <div className="animate-in fade-in duration-300">
            {timetable.length === 0 && !isGenerating ? (
              <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg overflow-hidden">
                     <img src={SJTUTOR_AVATAR} alt="SJ Tutor AI" className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">SJ Tutor AI's Planner</h2>
                  <p className="text-slate-500">I can generate a personalized timetable for your upcoming exams.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Exam Date</label>
                    <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Syllabus / Subjects</label>
                    <textarea placeholder="e.g. Physics (Ch 1-5), Math (Calculus)..." value={examSubjects} onChange={e => setExamSubjects(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px] resize-none dark:text-white" />
                  </div>
                  <button 
                    onClick={async () => {
                      if (!examDate || !examSubjects) return;
                      if (!onDeductCredit(10)) return;
                      setIsGenerating(true);
                      try {
                        const schedule = await GeminiService.generateStudyTimetable(examDate, examSubjects, studyHours);
                        if (schedule) setTimetable(schedule);
                      } catch (e) { alert("Failed to generate."); } finally { setIsGenerating(false); }
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-amber-600 text-white rounded-xl font-bold shadow-lg"
                  >
                    Generate Timetable
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Your Study Plan</h3>
                  <button onClick={() => setTimetable([])} className="text-sm text-red-500 hover:underline">Reset Plan</button>
                </div>
                {timetable.map((day, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                     <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="font-bold text-slate-800 dark:text-white">{day.day}</span>
                        <span className="text-sm text-slate-500">{day.date}</span>
                     </div>
                     <div className="p-6 space-y-4">
                        {day.slots.map((slot, sIdx) => (
                           <div key={sIdx} className="flex gap-4 items-start">
                              <div className="min-w-[100px] text-xs font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded text-center">{slot.time}</div>
                              <div>
                                 <p className="font-bold text-slate-800 dark:text-white">{slot.subject}</p>
                                 <p className="text-slate-600 dark:text-slate-400 text-sm">{slot.activity}</p>
                              </div>
                           </div>
                        ))}
                     </div>
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
