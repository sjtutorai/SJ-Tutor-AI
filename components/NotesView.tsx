
import React, { useState, useEffect, useRef } from 'react';
import { NoteItem, ReminderItem, TimetableEntry, NoteStatus, NoteTemplate, UserProfile, DifficultyLevel } from '../types';
import { 
  Plus, Trash2, Calendar, Clock, CheckSquare, Save, X, Sparkles, 
  StickyNote, Bell, Edit3, Loader2, Folder, 
  ChevronRight, Star, Tag, Book, Lightbulb, Languages,
  CheckCircle2, Circle, Download, Mic, MicOff, Square, Radio,
  BookOpen, GraduationCap, School, User, BookType, BarChart, Zap, Crown, FileText, AlertCircle
} from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { SettingsService } from '../services/settingsService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExportModal } from './ExportModal';
import Logo from './Logo';
import { saveNotesToFirestore, getNotesFromFirestore } from '../utils/firebaseUtils';
import { useNotifications } from './NotificationContext';
import { blobToDataUrl, transcribeAudioViaAI, requestMicrophoneStream, VoiceDictationSession } from '../services/audioService';

interface NotesViewProps {
  userId: string | null;
  onDeductCredit: (amount: number) => boolean;
  userProfile?: UserProfile;
}

const NotesView: React.FC<NotesViewProps> = ({ userId, onDeductCredit, userProfile }) => {
  const { triggerToast } = useNotifications();
  const [activeTab, setActiveTab] = useState<'NOTES' | 'REMINDERS' | 'TIMETABLE'>('NOTES');
  const [viewMode, setViewMode] = useState<'FOLDERS' | 'LIST' | 'EDITOR' | 'AI_GENERATOR'>('FOLDERS');
  
  // States
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Partial<NoteItem> | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // AI Notes Generator Form States (Matching Quiz Generator layout)
  const [subjectInput, setSubjectInput] = useState('Science');
  const [classGradeInput, setClassGradeInput] = useState(userProfile?.grade || '10th Grade');
  const [boardInput, setBoardInput] = useState(userProfile?.board || 'CBSE');
  const [languageInput, setLanguageInput] = useState('English');
  const [chapterNameInput, setChapterNameInput] = useState('');
  const [authorInput, setAuthorInput] = useState('');
  const [maxCharactersInput, setMaxCharactersInput] = useState(5000);
  const [difficultyInput, setDifficultyInput] = useState<DifficultyLevel>('Medium');
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [isListeningChapter, setIsListeningChapter] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const chapterVoiceSessionRef = useRef<VoiceDictationSession | null>(null);
  
  // Reminders/Timetable (Existing Logic Preserved)
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [newReminder, setNewReminder] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [examDate, setExamDate] = useState('');
  const [examSubjects, setExamSubjects] = useState('');
  const [studyHours] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Voice-to-Text Dictation States & MediaRecorder
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingInterimText, setRecordingInterimText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load defaults from Settings
  useEffect(() => {
    try {
      const settings = SettingsService.getSettings();
      if (settings) {
        if (settings.learning?.preferredSubject) {
          setSubjectInput(settings.learning.preferredSubject);
        }
        if (settings.learning?.language) {
          setLanguageInput(settings.learning.language);
        }
      }
    } catch (e) {
      console.warn("Failed to load settings defaults for AI Notes form", e);
    }
  }, []);

  // Load/Persist
  useEffect(() => {
    const key = userId || 'guest';
    const savedNotes = localStorage.getItem(`notes_${key}`);
    const savedReminders = localStorage.getItem(`reminders_${key}`);
    const savedTimetable = localStorage.getItem(`timetable_${key}`);
    if (savedNotes) setNotes(JSON.parse(savedNotes));
    if (savedReminders) setReminders(JSON.parse(savedReminders));
    if (savedTimetable) setTimetable(JSON.parse(savedTimetable));

    if (userId && userId !== 'guest') {
      getNotesFromFirestore(userId).then((firestoreNotes) => {
        if (firestoreNotes && firestoreNotes.length > 0) {
          setNotes(prev => {
            const merged = [...firestoreNotes];
            const localOnly = prev.filter(ln => !firestoreNotes.some(fn => fn.id === ln.id));
            return [...localOnly, ...merged];
          });
        }
      });
    }
  }, [userId]);

  useEffect(() => {
    const key = userId || 'guest';
    localStorage.setItem(`notes_${key}`, JSON.stringify(notes));
    localStorage.setItem(`reminders_${key}`, JSON.stringify(reminders));
    localStorage.setItem(`timetable_${key}`, JSON.stringify(timetable));

    if (userId && userId !== 'guest' && notes.length > 0) {
      saveNotesToFirestore(userId, notes);
    }
  }, [notes, reminders, timetable, userId]);

  // Derived
  const folders = Array.from(new Set(notes.map(n => n.folder || 'Uncategorized')));
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || [])));
  const filteredNotes = notes.filter(n => {
    const matchesFolder = !selectedFolder || (n.folder || 'Uncategorized') === selectedFolder;
    const matchesTag = !selectedTag || (n.tags || []).includes(selectedTag);
    // replaced above
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesTag && matchesSearch;
  });

  // Handlers
  const handleCreateNote = async (template: NoteTemplate = 'Blank') => {
    const subject = selectedFolder || 'General';
    const chapter = 'New Chapter';
    let content = '';

    if (template !== 'Blank') {
      setIsAiLoading(true);
      try {
        content = await GeminiService.generateNoteTemplate(subject, chapter, template) || '';
      } catch {
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

  const handleDeleteNote = (noteId: string) => {
    const noteToDelete = notes.find(n => n.id === noteId);
    const updatedNotes = notes.filter(n => n.id !== noteId);
    setNotes(updatedNotes);
    
    // Check if we have any notes left in the currently selected subject
    if (selectedFolder) {
      const remainingInSubject = updatedNotes.filter(n => n.subject === selectedFolder).length;
      if (remainingInSubject === 0) {
        setSelectedFolder(null);
        setViewMode('FOLDERS');
      } else {
        setViewMode('LIST');
      }
    } else {
      setViewMode('FOLDERS');
    }
    setEditingNote(null);
    triggerToast('Note Deleted 🗑️', `"${noteToDelete?.title || 'Note'}" has been deleted.`, 'Important Alerts');
  };

  const handleFillSample = () => {
    setSubjectInput('Science');
    setClassGradeInput(userProfile?.grade || '10th Grade');
    setBoardInput(userProfile?.board || 'CBSE');
    setLanguageInput('English');
    setChapterNameInput('Chemical Reactions and Equations');
    setAuthorInput('NCERT');
    setMaxCharactersInput(5000);
    setDifficultyInput('Medium');
  };

  const toggleChapterVoice = async () => {
    if (isListeningChapter) {
      if (chapterVoiceSessionRef.current) {
        try {
          const finalVal = await chapterVoiceSessionRef.current.stop();
          if (finalVal) {
            setChapterNameInput((prev) => {
              const trimmed = finalVal.trim();
              if (!prev.toLowerCase().includes(trimmed.toLowerCase())) {
                return prev ? `${prev} ${trimmed}` : trimmed;
              }
              return prev;
            });
          }
        } catch (e) {
          console.warn('Chapter voice stop error:', e);
        }
        chapterVoiceSessionRef.current = null;
      }
      setIsListeningChapter(false);
    } else {
      setVoiceNotice(null);
      try {
        const session = new VoiceDictationSession({
          language: languageInput || 'English',
          onInterim: (text) => {
            setChapterNameInput((prev) => {
              if (!prev.toLowerCase().includes(text.toLowerCase())) {
                return prev ? `${prev} ${text}` : text;
              }
              return prev;
            });
          },
          onFinal: (text) => {
            setChapterNameInput((prev) => {
              if (!prev.toLowerCase().includes(text.toLowerCase())) {
                return prev ? `${prev} ${text}` : text;
              }
              return prev;
            });
          },
          onError: (err) => {
            setVoiceNotice(err);
            setIsListeningChapter(false);
          },
          onRecordingStateChange: (rec) => {
            setIsListeningChapter(rec);
          }
        });
        chapterVoiceSessionRef.current = session;
        await session.start();
        setIsListeningChapter(true);
      } catch (err: any) {
        console.error('Failed to start chapter dictation:', err);
        setVoiceNotice(err.message || 'Microphone access is unavailable.');
        setIsListeningChapter(false);
      }
    }
  };

  const handleGenerateAiNotesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectInput || !languageInput || !chapterNameInput) {
      triggerToast('Incomplete Form', 'Please fill in all required fields.', 'Important Alerts');
      return;
    }

    const cost = 5;
    if (!onDeductCredit(cost)) {
      triggerToast('Insufficient Credits 🪙', 'You need at least 5 credits to generate study notes.', 'Important Alerts');
      return;
    }

    setIsGeneratingNotes(true);
    try {
      const classGrade = classGradeInput || userProfile?.grade || "10th";
      const board = boardInput || userProfile?.board || "CBSE";

      const content = await GeminiService.generateAiNotes({
        classGrade,
        board,
        subject: subjectInput,
        language: languageInput,
        chapterName: chapterNameInput,
        author: authorInput || undefined,
        maxCharacters: maxCharactersInput,
        difficulty: difficultyInput,
      });

      if (content) {
        // Automatically save as a new note item
        const newNote: NoteItem = {
          id: Date.now().toString(),
          title: chapterNameInput,
          content,
          subject: subjectInput,
          chapter: chapterNameInput,
          template: 'Theory',
          status: 'New',
          isFavorite: false,
          date: Date.now(),
          tags: ['AI-Generated']
        };

        const updatedNotes = [newNote, ...notes];
        setNotes(updatedNotes);
        
        const key = userId || 'guest';
        localStorage.setItem(`notes_${key}`, JSON.stringify(updatedNotes));

        setEditingNote(newNote);
        setViewMode('EDITOR');
        
        triggerToast('Notes Generated! ✨', `Syllabus-aligned notes for "${chapterNameInput}" are ready in your notebook.`, 'Important Alerts');

        // Clear Chapter & Author inputs for future creations
        setChapterNameInput('');
        setAuthorInput('');
      } else {
        triggerToast('Generation Failed', 'Failed to generate notes. Please check your input or try again.', 'Important Alerts');
      }
    } catch (err) {
      console.error("AI notes generation error:", err);
      triggerToast('Generation Error', 'Something went wrong during notes generation. Please check your connection and try again.', 'Important Alerts');
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  // Cleanup voice recording on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (recognitionRef.current) {
        try { 
          recognitionRef.current.stop(); 
        } catch {
          // Ignore cleanup error
        }
      }
    };
  }, []);

  const startVoiceRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await requestMicrophoneStream();
      audioStreamRef.current = stream;

      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else mimeType = '';
      }

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingInterimText('');

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Start Web Speech Recognition if available for real-time dictation
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = languageInput === 'Hindi' ? 'hi-IN' : 'en-US';

          recognition.onresult = (event: any) => {
            let fullTranscript = '';
            for (let i = 0; i < event.results.length; ++i) {
              fullTranscript += event.results[i][0].transcript;
            }
            setRecordingInterimText(fullTranscript);
          };

          recognition.onerror = (event: any) => {
            console.warn('Speech recognition warning:', event.error);
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn('SpeechRecognition initialization notice:', e);
        }
      }

      triggerToast('Voice Recording Started 🎙️', 'Speak clearly to dictate your study notes.', 'Important Alerts');
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      triggerToast('Microphone Notice', err.message || 'Please allow microphone access to dictate notes.', 'Important Alerts');
    }
  };

  const stopVoiceRecording = async (saveToNote = true) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    let recordedBlob: Blob | null = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        await new Promise<void>((resolve) => {
          if (!mediaRecorderRef.current) return resolve();
          mediaRecorderRef.current.onstop = () => resolve();
          mediaRecorderRef.current.stop();
        });
      } catch {
        // Ignore recorder stop error
      }
    }

    if (audioChunksRef.current.length > 0) {
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      recordedBlob = new Blob(audioChunksRef.current, { type: mimeType });
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore recognition stop error
      }
      recognitionRef.current = null;
    }

    setIsRecording(false);

    if (saveToNote && editingNote) {
      let dictatedText = recordingInterimText.trim();
      
      // If Web Speech did not yield transcript, try transcribing recorded audio via server Gemini AI
      if (!dictatedText && recordedBlob && recordedBlob.size > 1000) {
        try {
          triggerToast('Transcribing Audio ⏳', 'Transcribing spoken notes using AI...', 'Important Alerts');
          const dataUrl = await blobToDataUrl(recordedBlob);
          dictatedText = await transcribeAudioViaAI(dataUrl, recordedBlob.type, languageInput);
        } catch (e: any) {
          console.warn('AI transcription error on voice stop:', e);
        }
      }

      if (dictatedText) {
        const timestampHeader = `\n\n> 🎙️ **Voice Dictation (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})**\n> ${dictatedText}\n`;
        const updatedContent = (editingNote.content || '') + timestampHeader;
        setEditingNote({
          ...editingNote,
          content: updatedContent
        });
        triggerToast('Dictation Inserted 🎙️', 'Your voice notes have been added to the editor.', 'Important Alerts');
      } else {
        triggerToast('Recording Finished', 'No audible speech was detected.', 'Important Alerts');
      }
    }
    setRecordingInterimText('');
    setRecordingDuration(0);
    audioChunksRef.current = [];
  };

  const handleAiAction = async (task: 'summarize' | 'simplify' | 'mcq' | 'translate') => {
    if (!editingNote?.content) return;
    
    const cost = 0; // Free unlimited 10-day trial active
    if (!onDeductCredit(cost)) {
      triggerToast('Trial Notice', 'AI actions are currently free during your trial!', 'Important Alerts');
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
        triggerToast('AI Action Complete! 🧠', `Successfully applied ${task} to your notes.`, 'Important Alerts');
      }
    } catch {
      triggerToast('AI Action Failed', 'AI request failed. Please try again.', 'Important Alerts');
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
            {viewMode !== 'EDITOR' && viewMode !== 'AI_GENERATOR' && (
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
                {allTags.length > 0 && (
                  <select 
                    value={selectedTag || ''}
                    onChange={(e) => setSelectedTag(e.target.value || null)}
                    className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-slate-700 dark:text-slate-200"
                  >
                    <option value="">All Tags</option>
                    {allTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                )}

                <div className="flex gap-2">
                  <button 
                    onClick={() => setViewMode('AI_GENERATOR')} 
                    className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300/20" /> AI Notes Generator
                  </button>
                  <button onClick={() => handleCreateNote('Blank')} className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20">
                    <Plus className="w-4 h-4" /> New Note
                  </button>
                </div>
              </div>
            )}

            {/* SUBJECTS VIEW */}
            {viewMode === 'FOLDERS' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {folders.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <Book className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <h3 className="font-bold text-slate-700 dark:text-slate-300">No notes yet</h3>
                    <p className="text-sm text-slate-400 mt-1">Start by creating your first study note.</p>
                  </div>
                )}
                {folders.map(folder => {
                  const count = notes.filter(n => (n.folder || 'Uncategorized') === folder).length;
                  return (
                    <div 
                      key={folder}
                      onClick={() => { setSelectedFolder(folder); setViewMode('LIST'); }}
                      className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 cursor-pointer group transition-all hover:-translate-y-1 shadow-sm"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 mb-4 group-hover:scale-110 transition-transform">
                        <Folder className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white truncate">{folder}</h3>
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
                  onClick={() => { setSelectedFolder(null); setViewMode('FOLDERS'); }}
                  className="flex items-center text-sm font-bold text-slate-500 hover:text-primary-600 mb-2"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" /> Back to Subjects
                </button>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{selectedFolder || 'All Notes'}</h2>
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
                          note.template === 'Q&A' ? 'bg-purple-50 text-purple-600' : 'bg-white border border-slate-200 text-slate-600'
                        }`}>
                          {note.template}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNote(note.id);
                            }}
                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <StatusIcon status={note.status} />
                        </div>
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
                <div className="px-6 py-4 bg-white dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
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
                    {/* Voice Dictation (MediaRecorder) Button */}
                    {isRecording ? (
                      <button
                        onClick={() => stopVoiceRecording(true)}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-rose-500/20 animate-pulse transition active:scale-[0.98]"
                        title="Stop recording and insert dictation"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                        <Square className="w-3.5 h-3.5 fill-white" />
                        <span>Done ({Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')})</span>
                      </button>
                    ) : (
                      <button
                        onClick={startVoiceRecording}
                        className="px-3.5 py-2 bg-primary-50 dark:bg-primary-950/30 hover:bg-primary-100 dark:hover:bg-primary-900/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-[0.98]"
                        title="Dictate study notes directly using voice recording"
                      >
                        <Mic className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                        <span>Dictate</span>
                      </button>
                    )}

                    {/* Unified Premium Export Button */}
                    <button 
                      onClick={() => setIsExportOpen(true)} 
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition active:scale-[0.98]"
                      title="Export notes in any of 20 formats (PDF, Word, HTML, etc.)"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Note</span>
                    </button>

                    <button 
                      onClick={() => editingNote.id && handleDeleteNote(editingNote.id)}
                      className="p-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl transition active:scale-[0.98]"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button onClick={handleSaveNote} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                      <Save className="w-4 h-4" /> Save
                    </button>
                  </div>
                </div>

                {/* Live Voice Dictation Active Banner */}
                {isRecording && (
                  <div className="px-6 py-3 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center animate-pulse">
                        <Radio className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          <span className="font-bold text-xs uppercase tracking-wider">Recording Voice Dictation</span>
                          <span className="font-mono text-xs bg-white/20 px-2 py-0.5 rounded font-bold">
                            {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                        <p className="text-xs text-white/90 italic truncate max-w-md">
                          {recordingInterimText ? `"${recordingInterimText}"` : "Listening... Speak your notes clearly into the microphone."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => stopVoiceRecording(false)}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => stopVoiceRecording(true)}
                        className="px-4 py-1.5 bg-white text-rose-600 hover:bg-white/90 text-xs font-extrabold rounded-lg shadow transition flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Done & Insert
                      </button>
                    </div>
                  </div>
                )}

                {/* AI ACTION BAR */}
                <div className="px-6 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex gap-2 overflow-x-auto custom-scrollbar">
                   {/* Voice Recording Quick Toggle in Action Bar */}
                   <button 
                     onClick={isRecording ? () => stopVoiceRecording(true) : startVoiceRecording} 
                     className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'}`}
                   >
                      {isRecording ? <Square className="w-3.5 h-3.5 fill-white" /> : <Mic className="w-3.5 h-3.5" />}
                      {isRecording ? 'Finish Dictation' : 'Voice Dictate'}
                   </button>
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
                  <div className="flex-1 p-6 overflow-y-auto bg-white/50 dark:bg-slate-900/20 custom-scrollbar">
                     <div className="prose prose-sm dark:prose-invert max-w-none markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{editingNote.content || '*No content yet*'}</ReactMarkdown>
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

            {viewMode === 'AI_GENERATOR' && (
              <div className="space-y-4 max-w-4xl mx-auto animate-in zoom-in-95 duration-300">
                <button 
                  onClick={() => setViewMode('FOLDERS')}
                  className="flex items-center text-sm font-bold text-slate-500 hover:text-primary-600 mb-1 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-180 mr-1" /> Back to Notes
                </button>
                
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 mb-5 relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 dark:bg-primary-950/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                  {/* Header Row */}
                  <div className="flex justify-between items-center mb-5 relative z-10">
                    <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      Study Details
                    </h2>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30">
                        <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                        Cost: 5 Credits
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleFillSample}
                        className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/30 dark:text-primary-300 dark:hover:bg-primary-900/40 border border-primary-100 dark:border-primary-800 rounded-full transition-all hover:scale-105 active:scale-95 uppercase tracking-wide"
                      >
                        <Sparkles className="w-3 h-3 fill-primary-400 text-primary-600 dark:text-primary-400" />
                        Try Example
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleGenerateAiNotesSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4 mb-4 relative z-10">
                      {/* Subject */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subject</label>
                        <div className="relative">
                          <BookType className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={subjectInput}
                            onChange={(e) => setSubjectInput(e.target.value)}
                            disabled={isGeneratingNotes}
                            placeholder="e.g. Science"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 text-slate-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>

                      {/* Class / Grade */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Class / Grade</span>
                          {userProfile?.grade && (
                            <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5 fill-emerald-500" /> Profile Set
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <GraduationCap className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={classGradeInput}
                            onChange={(e) => setClassGradeInput(e.target.value)}
                            disabled={isGeneratingNotes}
                            placeholder="e.g. 10th Grade"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 text-slate-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>

                      {/* Board */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Board</label>
                        <div className="relative">
                          <School className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={boardInput}
                            onChange={(e) => setBoardInput(e.target.value)}
                            disabled={isGeneratingNotes}
                            placeholder="e.g. CBSE"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 text-slate-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>

                      {/* Language */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Language</label>
                        <div className="relative">
                          <Languages className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={languageInput}
                            onChange={(e) => setLanguageInput(e.target.value)}
                            disabled={isGeneratingNotes}
                            placeholder="e.g. English"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 text-slate-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>

                      {/* Chapter Name with Dictate button */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Chapter Name</label>
                          <button
                            type="button"
                            onClick={toggleChapterVoice}
                            disabled={isGeneratingNotes}
                            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded transition-all ${
                              isListeningChapter
                                ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 animate-pulse'
                                : 'bg-primary-50 dark:bg-primary-950/40 hover:bg-primary-100 dark:hover:bg-primary-900/60 text-primary-700 dark:text-primary-300'
                            }`}
                          >
                            {isListeningChapter ? <MicOff className="w-2.5 h-2.5" /> : <Mic className="w-2.5 h-2.5" />}
                            {isListeningChapter ? 'LISTENING...' : 'DICTATE'}
                          </button>
                        </div>
                        <div className="relative">
                          <BookOpen className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={chapterNameInput}
                            onChange={(e) => setChapterNameInput(e.target.value)}
                            disabled={isGeneratingNotes}
                            placeholder="e.g. Chemical Reactions and Equations"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 text-slate-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>

                      {/* Author (Optional) */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Author (Optional)</label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={authorInput}
                            onChange={(e) => setAuthorInput(e.target.value)}
                            disabled={isGeneratingNotes}
                            placeholder="e.g. NCERT"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 text-slate-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>

                      {/* No. of Characters (replacing No. of Questions) */}
                      <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">No. of Characters</label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="number"
                            value={maxCharactersInput || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setMaxCharactersInput(isNaN(val) ? 0 : val);
                            }}
                            disabled={isGeneratingNotes}
                            min="500"
                            max="20000"
                            step="500"
                            placeholder="e.g. 5000"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 text-slate-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>

                      {/* Difficulty */}
                      <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Difficulty</label>
                        <div className="relative">
                          <BarChart className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                          <select
                            value={difficultyInput}
                            onChange={(e) => setDifficultyInput(e.target.value as DifficultyLevel)}
                            disabled={isGeneratingNotes}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 appearance-none text-slate-900 dark:text-white text-sm"
                          >
                            <option value="Easy">Easy (Quick Revision)</option>
                            <option value="Medium">Medium (Standard Notes)</option>
                            <option value="Hard">Hard (In-Depth / Exam Prep)</option>
                          </select>
                        </div>
                      </div>

                      {/* Helper Tip */}
                      <div className="col-span-full mt-1">
                        <p className="text-[10px] text-slate-400 dark:text-slate-400 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500" />
                          Tip: Customize <span className="font-bold text-primary-600 dark:text-primary-400">No. of Characters</span> (e.g. 5,000) and <span className="font-bold text-primary-600 dark:text-primary-400">Difficulty</span> for syllabus-aligned revision notes!
                        </p>
                      </div>
                    </div>

                    {/* Voice Dictation Status Notice if active */}
                    {voiceNotice && (
                      <div className="mb-4 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>{voiceNotice}</span>
                      </div>
                    )}

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={isGeneratingNotes}
                      className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-75 disabled:transform-none mt-2"
                    >
                      {isGeneratingNotes ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating Syllabus-Aligned Notes...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                          <span>Generate AI Notes (Cost: 5 Credits)</span>
                        </>
                      )}
                    </button>
                  </form>
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
                   className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
                 />
                 <div className="flex gap-2">
                    <input 
                      type="date" 
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-slate-600 text-sm"
                    />
                    <input 
                      type="time" 
                      value={newTime}
                      onChange={e => setNewTime(e.target.value)}
                      className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-slate-600 text-sm"
                    />
                  </div>
                 <button 
                  onClick={() => {
                    if (!newReminder) return;
                    const dueTimeString = newDate ? `${newDate}T${newTime || '23:59'}` : '';
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
                     <Logo className="w-full h-full" iconOnly noBorder />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">SJ Tutor AI&apos;s Planner</h2>
                  <p className="text-slate-500">I can generate a personalized timetable for your upcoming exams.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Exam Date</label>
                    <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Syllabus / Subjects</label>
                    <textarea placeholder="e.g. Physics (Ch 1-5), Math (Calculus)..." value={examSubjects} onChange={e => setExamSubjects(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px] resize-none dark:text-white" />
                  </div>
                  <button 
                    onClick={async () => {
                      if (!examDate || !examSubjects) return;
                      if (!onDeductCredit(10)) return;
                      setIsGenerating(true);
                      try {
                        const schedule = await GeminiService.generateStudyTimetable(examDate, examSubjects, studyHours);
                        if (schedule) setTimetable(schedule);
                      } catch { alert("Failed to generate."); } finally { setIsGenerating(false); }
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white rounded-xl font-bold shadow-lg"
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
                     <div className="bg-white dark:bg-slate-900/50 px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
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
        {editingNote && (
          <ExportModal
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
            contentType="notes"
            contentData={editingNote}
            title={editingNote.title || 'Untitled Note'}
            metadata={{
              subject: editingNote.subject,
              chapter: editingNote.chapter,
              date: editingNote.date
            }}
          />
        )}
      </div>
    </div>
  );
};

export default NotesView;
