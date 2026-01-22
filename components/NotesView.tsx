
import React, { useState, useEffect } from 'react';
import { NoteItem, ReminderItem, TimetableEntry, SJTUTOR_AVATAR } from '../types';
import { Plus, Trash2, Calendar, Clock, CheckSquare, Save, X, Sparkles, StickyNote, Bell, Edit3, Loader2, Edit, Share2 } from 'lucide-react';
import { GeminiService } from '../services/geminiService';

interface NotesViewProps {
  userId: string | null; // Use for local storage keys
  onDeductCredit: (amount: number) => boolean;
}

const NotesView: React.FC<NotesViewProps> = ({ userId, onDeductCredit }) => {
  const [activeTab, setActiveTab] = useState<'NOTES' | 'REMINDERS' | 'TIMETABLE'>('NOTES');
  
  // Notes State
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [editingNote, setEditingNote] = useState<Partial<NoteItem> | null>(null);
  
  // Reminders State
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [newReminder, setNewReminder] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');

  // Timetable State
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [examDate, setExamDate] = useState('');
  const [examSubjects, setExamSubjects] = useState('');
  const [studyHours, setStudyHours] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Timetable Editing State
  const [showEditTimetable, setShowEditTimetable] = useState(false);
  const [editInstruction, setEditInstruction] = useState('');

  // Load Data on Mount
  useEffect(() => {
    const key = userId || 'guest';
    try {
      const savedNotes = localStorage.getItem(`notes_${key}`);
      const savedReminders = localStorage.getItem(`reminders_${key}`);
      const savedTimetable = localStorage.getItem(`timetable_${key}`);

      if (savedNotes) setNotes(JSON.parse(savedNotes));
      if (savedReminders) setReminders(JSON.parse(savedReminders));
      if (savedTimetable) setTimetable(JSON.parse(savedTimetable));
    } catch (e) {
      console.error("Error loading notes data", e);
      // Reset if corrupted
      setNotes([]);
      setReminders([]);
      setTimetable([]);
    }
  }, [userId]);

  // Persist Data
  useEffect(() => {
    const key = userId || 'guest';
    localStorage.setItem(`notes_${key}`, JSON.stringify(notes));
    localStorage.setItem(`reminders_${key}`, JSON.stringify(reminders));
    localStorage.setItem(`timetable_${key}`, JSON.stringify(timetable));
  }, [notes, reminders, timetable, userId]);

  // --- Notes Handlers ---
  const handleSaveNote = () => {
    if (!editingNote?.title || !editingNote?.content) return;
    
    if (editingNote.id) {
      setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, ...editingNote } as NoteItem : n));
    } else {
      const newNote: NoteItem = {
        id: Date.now().toString(),
        title: editingNote.title,
        content: editingNote.content,
        date: Date.now(),
        tags: []
      };
      setNotes(prev => [newNote, ...prev]);
    }
    setEditingNote(null);
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('Delete this note?')) {
      setNotes(prev => prev.filter(n => n.id !== id));
    }
  };

  const handleShareNote = async (note: NoteItem) => {
    const text = `${note.title}\n\n${note.content}`;
    if (navigator.share) {
        try {
            await navigator.share({
                title: note.title,
                text: text
            });
        } catch (e) { console.log('Share canceled'); }
    } else {
        try {
            await navigator.clipboard.writeText(text);
            alert('Note copied to clipboard');
        } catch (e) { alert('Failed to copy'); }
    }
  };

  // --- Reminders Handlers ---
  const handleAddReminder = () => {
    if (!newReminder) return;
    const item: ReminderItem = {
      id: Date.now().toString(),
      task: newReminder,
      dueTime: newReminderDate,
      completed: false
    };
    setReminders(prev => [...prev, item]);
    setNewReminder('');
    setNewReminderDate('');
  };

  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  const deleteReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  // --- Timetable Handler ---
  const handleGenerateTimetable = async () => {
    if (!examDate || !examSubjects) return;
    
    const cost = 10;
    if (!onDeductCredit(cost)) {
        alert(`Insufficient credits. Timetable generation costs ${cost} credits.`);
        return;
    }

    setIsGenerating(true);
    try {
      const schedule = await GeminiService.generateStudyTimetable(examDate, examSubjects, studyHours);
      if (schedule && schedule.length > 0) {
        setTimetable(schedule);
      } else {
        alert("Received empty timetable from AI. Please try again.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate timetable. Please try simplifying your inputs.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateTimetable = async () => {
    if (!editInstruction.trim()) return;

    const cost = 10;
    if (!onDeductCredit(cost)) {
        alert(`Insufficient credits. Updating timetable costs ${cost} credits.`);
        return;
    }

    setIsGenerating(true);
    try {
        const updatedSchedule = await GeminiService.updateStudyTimetable(timetable, editInstruction);
        if (updatedSchedule && updatedSchedule.length > 0) {
            setTimetable(updatedSchedule);
            setShowEditTimetable(false);
            setEditInstruction('');
        }
    } catch (error) {
        console.error(error);
        alert("Failed to update timetable. Please try again.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleShareTimetable = async () => {
    const text = timetable.map(day => 
        `${day.day} (${day.date}):\n` + 
        day.slots.map(s => `  • ${s.time}: ${s.subject} - ${s.activity}`).join('\n')
    ).join('\n\n');
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'My Study Timetable',
                text: `Here is my study plan from SJ Tutor AI:\n\n${text}`
            });
        } catch (e) { console.log('Share canceled'); }
    } else {
        try {
            await navigator.clipboard.writeText(text);
            alert('Timetable copied to clipboard');
        } catch (e) { alert('Failed to copy'); }
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex p-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <button 
          onClick={() => setActiveTab('NOTES')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${activeTab === 'NOTES' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <StickyNote className="w-4 h-4" />
          Notes
        </button>
        <button 
          onClick={() => setActiveTab('REMINDERS')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${activeTab === 'REMINDERS' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Bell className="w-4 h-4" />
          Reminders
        </button>
        <button 
          onClick={() => setActiveTab('TIMETABLE')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${activeTab === 'TIMETABLE' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Calendar className="w-4 h-4" />
          AI Timetable
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[500px]">
        {/* --- NOTES TAB --- */}
        {activeTab === 'NOTES' && (
          <div className="animate-in fade-in duration-300">
            {editingNote ? (
              <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-slate-800">{editingNote.id ? 'Edit Note' : 'New Note'}</h3>
                  <button onClick={() => setEditingNote(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <input 
                  type="text" 
                  placeholder="Note Title" 
                  value={editingNote.title || ''} 
                  onChange={e => setEditingNote({...editingNote, title: e.target.value})}
                  className="w-full text-xl font-bold mb-4 p-2 border-b border-transparent hover:border-slate-200 focus:border-primary-500 outline-none bg-transparent"
                />
                <textarea 
                  placeholder="Start typing..." 
                  value={editingNote.content || ''}
                  onChange={e => setEditingNote({...editingNote, content: e.target.value})}
                  className="w-full min-h-[300px] p-4 bg-slate-50 rounded-xl resize-none outline-none focus:ring-2 focus:ring-primary-100 mb-4 text-slate-700 leading-relaxed"
                />
                <div className="flex justify-end">
                   <button 
                    onClick={handleSaveNote}
                    disabled={!editingNote.title}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    Save Note
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Add New Card */}
                <div 
                  onClick={() => setEditingNote({})}
                  className="min-h-[200px] flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all group"
                >
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6 text-primary-500" />
                  </div>
                  <p className="font-semibold text-slate-500 group-hover:text-primary-600">Create New Note</p>
                </div>

                {/* Note Cards */}
                {notes.map(note => (
                  <div key={note.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative group">
                    <div className="flex justify-between items-start mb-2">
                         <h4 className="font-bold text-slate-800 truncate flex-1">{note.title}</h4>
                    </div>
                    <p className="text-slate-500 text-sm line-clamp-4 mb-4">{note.content}</p>
                    <div className="flex justify-between items-center text-xs text-slate-400 mt-auto pt-3 border-t border-slate-50">
                      <span>{new Date(note.date).toLocaleDateString()}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => { e.stopPropagation(); handleShareNote(note); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600" title="Share Note">
                           <Share2 className="w-4 h-4" />
                         </button>
                         <button onClick={() => setEditingNote(note)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-primary-600" title="Edit">
                           <Edit3 className="w-4 h-4" />
                         </button>
                         <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 hover:bg-red-50 rounded text-slate-500 hover:text-red-500" title="Delete">
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- REMINDERS TAB --- */}
        {activeTab === 'REMINDERS' && (
          <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
               <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                 <Plus className="w-5 h-5 text-primary-500" />
                 Add New Task
               </h3>
               <div className="flex flex-col sm:flex-row gap-3">
                 <input 
                   type="text" 
                   value={newReminder}
                   onChange={e => setNewReminder(e.target.value)}
                   placeholder="What needs to be done?"
                   className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                 />
                 <input 
                   type="datetime-local" 
                   value={newReminderDate}
                   onChange={e => setNewReminderDate(e.target.value)}
                   className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-slate-600"
                 />
                 <button 
                  onClick={handleAddReminder}
                  disabled={!newReminder}
                  className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                 >
                   Add
                 </button>
               </div>
            </div>

            <div className="space-y-3">
              {reminders.length === 0 && (
                 <div className="text-center py-10 text-slate-400">
                    <CheckSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No reminders yet. Stay organized!</p>
                 </div>
              )}
              {reminders.map(item => (
                <div key={item.id} className={`flex items-center gap-4 p-4 bg-white rounded-xl border transition-all ${item.completed ? 'border-slate-100 opacity-60' : 'border-slate-200 shadow-sm'}`}>
                  <button 
                    onClick={() => toggleReminder(item.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${item.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-primary-400'}`}
                  >
                    {item.completed && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                  </button>
                  <div className="flex-1">
                    <p className={`font-medium ${item.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{item.task}</p>
                    {item.dueTime && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.dueTime).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button onClick={() => deleteReminder(item.id)} className="text-slate-300 hover:text-red-500 p-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TIMETABLE TAB --- */}
        {activeTab === 'TIMETABLE' && (
          <div className="animate-in fade-in duration-300">
            {timetable.length === 0 && !isGenerating ? (
              <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg overflow-hidden">
                     <img src={SJTUTOR_AVATAR} alt="SJ Tutor AI" className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">SJ Tutor AI's Planner</h2>
                  <p className="text-slate-500">I can generate a personalized timetable for your upcoming exams.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Exam Date</label>
                    <input 
                      type="date" 
                      value={examDate}
                      onChange={e => setExamDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Daily Study Hours</label>
                    <input 
                      type="number" 
                      min="1" max="12"
                      value={studyHours}
                      onChange={e => setStudyHours(parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Syllabus / Subjects to Cover</label>
                    <textarea 
                      placeholder="e.g. Physics (Ch 1-5), Math (Calculus), English Literature..."
                      value={examSubjects}
                      onChange={e => setExamSubjects(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px] resize-none"
                    />
                  </div>
                  <button 
                    onClick={handleGenerateTimetable}
                    disabled={!examDate || !examSubjects}
                    className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-amber-600 hover:from-primary-700 hover:to-amber-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-5 h-5" />
                    Generate Timetable
                  </button>
                  <p className="text-xs text-center text-slate-400">Costs 10 Generation Credits</p>
                </div>
              </div>
            ) : isGenerating ? (
               <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-white rounded-2xl border border-slate-200">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-500 mb-4 animate-bounce">
                     <img src={SJTUTOR_AVATAR} alt="Thinking..." className="w-full h-full object-cover" />
                  </div>
                  <p className="font-medium">
                    {showEditTimetable ? 'SJ Tutor AI is Optimizing...' : 'SJ Tutor AI is Planning...'}
                  </p>
                  <p className="text-sm">Creating an optimized schedule for you.</p>
               </div>
            ) : (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <h3 className="text-2xl font-bold text-slate-800">Your Study Plan</h3>
                  <div className="flex items-center gap-3">
                     {!showEditTimetable && (
                        <>
                        <button
                          onClick={() => setShowEditTimetable(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg font-medium transition-colors text-sm"
                        >
                           <Edit className="w-4 h-4" />
                           Edit with AI
                        </button>
                        <button
                          onClick={handleShareTimetable}
                          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors text-sm"
                        >
                           <Share2 className="w-4 h-4" />
                           Share
                        </button>
                        </>
                     )}
                     <button 
                        onClick={() => {
                           if (confirm('Create a new plan? Current one will be lost.')) {
                                 setTimetable([]);
                                 setShowEditTimetable(false);
                           }
                        }}
                        className="text-sm text-red-500 hover:underline"
                     >
                        Reset Plan
                     </button>
                  </div>
                </div>

                {/* Edit Mode Interface */}
                {showEditTimetable && (
                  <div className="bg-white border border-primary-200 rounded-xl p-5 mb-6 shadow-sm animate-in fade-in slide-in-from-top-2">
                     <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                           <Sparkles className="w-4 h-4 text-primary-500" />
                           Edit Schedule with AI
                        </h4>
                        <button onClick={() => setShowEditTimetable(false)} className="text-slate-400 hover:text-slate-600">
                           <X className="w-5 h-5" />
                        </button>
                     </div>
                     <textarea
                        value={editInstruction}
                        onChange={(e) => setEditInstruction(e.target.value)}
                        placeholder="e.g. Move Friday's Math session to Saturday morning, or add a break on Wednesday."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm min-h-[80px] resize-none mb-3"
                     />
                     <div className="flex justify-end gap-2">
                        <button 
                           onClick={() => setShowEditTimetable(false)}
                           className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium"
                        >
                           Cancel
                        </button>
                        <button 
                           onClick={handleUpdateTimetable}
                           disabled={!editInstruction.trim()}
                           className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                        >
                           Update Schedule (10 Credits)
                        </button>
                     </div>
                  </div>
                )}
                
                <div className="grid gap-6">
                  {timetable.map((day, idx) => (
                    <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                       <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                          <span className="font-bold text-slate-800">{day.day}</span>
                          <span className="text-sm text-slate-500">{day.date}</span>
                       </div>
                       <div className="p-6 space-y-4">
                          {day.slots.map((slot, sIdx) => (
                             <div key={sIdx} className="flex gap-4 items-start">
                                <div className="min-w-[100px] text-sm font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded text-center">
                                  {slot.time}
                                </div>
                                <div>
                                   <p className="font-bold text-slate-800">{slot.subject}</p>
                                   <p className="text-slate-600 text-sm">{slot.activity}</p>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesView;
