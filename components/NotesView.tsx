import React, { useState, useEffect, useRef } from 'react';
import { 
  NoteItem, ReminderItem, TimetableEntry, NoteStatus, NoteTemplate, 
  UserProfile, DifficultyLevel, NoteFolder, DEFAULT_NOTE_FOLDERS, AppMode 
} from '../types';
import { 
  Plus, Trash2, Calendar, Clock, CheckSquare, Save, X, Sparkles, 
  StickyNote, Bell, Edit3, Loader2, Folder, FolderPlus, FolderOpen, 
  ChevronRight, Star,
  CheckCircle2, Circle, Download, Mic, MicOff, Square,
  FolderCheck, Check, Type, GraduationCap, School, Languages, BookOpen,
  User, FileText, BarChart, Crown, Zap
} from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { SettingsService } from '../services/settingsService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExportModal } from './ExportModal';
import Logo from './Logo';
import LoadingState from './LoadingState';
import { 
  saveNotesToFirestore, getNotesFromFirestore, 
  saveNoteFoldersToFirestore, getNoteFoldersFromFirestore 
} from '../utils/firebaseUtils';
import { useNotifications } from './NotificationContext';
import { requestMicrophoneStream, VoiceDictationSession } from '../services/audioService';
import { motion, AnimatePresence } from 'motion/react';

interface NotesViewProps {
  userId: string | null;
  onDeductCredit: (amount: number) => boolean;
  userProfile?: UserProfile;
  onOpenUpgrade?: () => void;
}

const FOLDER_COLORS: Record<string, { bg: string; text: string; border: string; lightBg: string }> = {
  indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', lightBg: 'bg-indigo-50 dark:bg-indigo-950/40' },
  sky: { bg: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800', lightBg: 'bg-sky-50 dark:bg-sky-950/40' },
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', lightBg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', lightBg: 'bg-amber-50 dark:bg-amber-950/40' },
  rose: { bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', lightBg: 'bg-rose-50 dark:bg-rose-950/40' },
  violet: { bg: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800', lightBg: 'bg-violet-50 dark:bg-violet-950/40' },
  teal: { bg: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800', lightBg: 'bg-teal-50 dark:bg-teal-950/40' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', lightBg: 'bg-orange-50 dark:bg-orange-950/40' },
};

const FOLDER_ICONS = ['📁', '📐', '🔬', '📖', '🧪', '🎯', '💡', '⚡', '📝', '🧠', '🏛️', '🌍', '🎨', '🎵', '💻'];

const NotesView: React.FC<NotesViewProps> = ({ userId, onDeductCredit, userProfile, onOpenUpgrade }) => {
  const { triggerToast } = useNotifications();
  const isPremium = Boolean(userProfile?.planType && userProfile.planType !== 'Free');
  const [activeTab, setActiveTab] = useState<'NOTES' | 'REMINDERS' | 'TIMETABLE'>('NOTES');
  const [viewMode, setViewMode] = useState<'FOLDERS' | 'LIST' | 'EDITOR' | 'AI_GENERATOR'>('FOLDERS');
  
  // Notes & Folder States
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [foldersList, setFoldersList] = useState<NoteFolder[]>(DEFAULT_NOTE_FOLDERS);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Partial<NoteItem> | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [justSavedNote, setJustSavedNote] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | NoteStatus>('ALL');

  // Folder Management Modal States
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null);
  const [folderFormName, setFolderFormName] = useState('');
  const [folderFormColor, setFolderFormColor] = useState('indigo');
  const [folderFormIcon, setFolderFormIcon] = useState('📁');
  const [folderFormDesc, setFolderFormDesc] = useState('');

  // Delete Folder Modal States
  const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<NoteFolder | null>(null);

  // Quick Move Dropdown state
  const [movingNoteId, setMovingNoteId] = useState<string | null>(null);
  const [editorFolderDropdownOpen, setEditorFolderDropdownOpen] = useState(false);

  // AI Notes Generator Form States
  const [subjectInput, setSubjectInput] = useState('Science');
  const [classGradeInput, setClassGradeInput] = useState(userProfile?.grade || '10th Grade');
  const [boardInput, setBoardInput] = useState(userProfile?.board || 'CBSE');
  const [languageInput, setLanguageInput] = useState('English');
  const [chapterNameInput, setChapterNameInput] = useState('');
  const [authorInput, setAuthorInput] = useState('');
  const [maxCharactersInput, setMaxCharactersInput] = useState(5000);
  const [difficultyInput, setDifficultyInput] = useState<DifficultyLevel>('Medium');
  const [targetFolderForAi, setTargetFolderForAi] = useState<string>('General Notes');
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [isListeningChapter, setIsListeningChapter] = useState(false);
  const chapterVoiceSessionRef = useRef<VoiceDictationSession | null>(null);

  // Sync profile grade when non-premium
  useEffect(() => {
    if (!isPremium && userProfile?.grade) {
      setClassGradeInput(userProfile.grade);
    }
  }, [userProfile?.grade, isPremium]);
  
  // Reminders/Timetable
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

  // Load / Persist Folders & Notes
  useEffect(() => {
    const key = userId || 'guest';
    const savedNotes = localStorage.getItem(`notes_${key}`);
    const savedFolders = localStorage.getItem(`notes_folders_${key}`);
    const savedReminders = localStorage.getItem(`reminders_${key}`);
    const savedTimetable = localStorage.getItem(`timetable_${key}`);

    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.debug('Notes parse error:', e);
      }
    }

    if (savedFolders) {
      try {
        const parsed = JSON.parse(savedFolders);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFoldersList(parsed);
        }
      } catch (e) {
        console.debug('Folders parse error:', e);
      }
    }

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

      getNoteFoldersFromFirestore(userId).then((fsFolders) => {
        if (fsFolders && fsFolders.length > 0) {
          setFoldersList(prev => {
            const merged = [...fsFolders];
            prev.forEach(pf => {
              if (!merged.some(mf => mf.id === pf.id || mf.name.toLowerCase() === pf.name.toLowerCase())) {
                merged.push(pf);
              }
            });
            return merged;
          });
        }
      });
    }
  }, [userId]);

  // Synchronize dynamic folders from notes
  useEffect(() => {
    const existingFolderNames = new Set(foldersList.map(f => f.name.toLowerCase()));
    const newFoldersToAdd: NoteFolder[] = [];
    notes.forEach(n => {
      if (n.folder && !existingFolderNames.has(n.folder.toLowerCase())) {
        existingFolderNames.add(n.folder.toLowerCase());
        newFoldersToAdd.push({
          id: `folder-auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: n.folder,
          color: 'indigo',
          icon: '📁',
          createdAt: Date.now()
        });
      }
    });
    if (newFoldersToAdd.length > 0) {
      setFoldersList(prev => [...prev, ...newFoldersToAdd]);
    }
  }, [notes, foldersList]);

  // Save notes & reminders & timetable changes
  useEffect(() => {
    const key = userId || 'guest';
    localStorage.setItem(`notes_${key}`, JSON.stringify(notes));
    localStorage.setItem(`reminders_${key}`, JSON.stringify(reminders));
    localStorage.setItem(`timetable_${key}`, JSON.stringify(timetable));

    if (userId && userId !== 'guest' && notes.length > 0) {
      saveNotesToFirestore(userId, notes);
    }
  }, [notes, reminders, timetable, userId]);

  // Save folders list changes
  useEffect(() => {
    const key = userId || 'guest';
    try {
      localStorage.setItem(`notes_folders_${key}`, JSON.stringify(foldersList));
    } catch (e) {
      console.debug('Failed saving folders locally:', e);
    }
    if (userId && userId !== 'guest' && foldersList.length > 0) {
      saveNoteFoldersToFirestore(userId, foldersList);
    }
  }, [foldersList, userId]);

  // Derived notes filtering
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || [])));
  const filteredNotes = notes.filter(n => {
    const noteFolder = n.folder || 'General Notes';
    const matchesFolder = !selectedFolder || noteFolder === selectedFolder;
    const matchesTag = !selectedTag || (n.tags || []).includes(selectedTag);
    const matchesStatus = statusFilter === 'ALL' || n.status === statusFilter;
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesTag && matchesStatus && matchesSearch;
  });

  // Folder helper: find folder config
  const getFolderConfig = (folderName: string) => {
    const found = foldersList.find(f => f.name.toLowerCase() === folderName.toLowerCase());
    if (found) return found;
    return {
      id: 'default',
      name: folderName,
      color: 'indigo',
      icon: '📁',
      description: '',
      createdAt: 0
    };
  };

  // Handlers for Folders
  const openCreateFolderModal = () => {
    setEditingFolder(null);
    setFolderFormName('');
    setFolderFormColor('indigo');
    setFolderFormIcon('📁');
    setFolderFormDesc('');
    setIsFolderModalOpen(true);
  };

  const openEditFolderModal = (e: React.MouseEvent, folder: NoteFolder) => {
    e.stopPropagation();
    setEditingFolder(folder);
    setFolderFormName(folder.name);
    setFolderFormColor(folder.color || 'indigo');
    setFolderFormIcon(folder.icon || '📁');
    setFolderFormDesc(folder.description || '');
    setIsFolderModalOpen(true);
  };

  const handleSaveFolderForm = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = folderFormName.trim();
    if (!trimmed) {
      triggerToast('Folder Name Required', 'Please enter a name for the folder.', 'Important Alerts');
      return;
    }

    if (editingFolder) {
      const oldName = editingFolder.name;
      const updated = foldersList.map(f => f.id === editingFolder.id ? {
        ...f,
        name: trimmed,
        color: folderFormColor,
        icon: folderFormIcon,
        description: folderFormDesc.trim() || undefined
      } : f);
      setFoldersList(updated);

      // Cascade rename to notes
      if (oldName !== trimmed) {
        setNotes(prev => prev.map(n => (n.folder === oldName) ? { ...n, folder: trimmed, subject: trimmed } : n));
        if (selectedFolder === oldName) setSelectedFolder(trimmed);
      }
      triggerToast('Folder Updated 📁', `Updated folder "${trimmed}".`, 'Important Alerts');
    } else {
      // Check duplicate name
      if (foldersList.some(f => f.name.toLowerCase() === trimmed.toLowerCase())) {
        triggerToast('Folder Exists', 'A folder with this name already exists.', 'Important Alerts');
        return;
      }

      const newFolder: NoteFolder = {
        id: `folder-${Date.now()}`,
        name: trimmed,
        color: folderFormColor,
        icon: folderFormIcon,
        description: folderFormDesc.trim() || undefined,
        createdAt: Date.now()
      };
      setFoldersList([...foldersList, newFolder]);
      triggerToast('Folder Created! 📁', `Created folder "${trimmed}".`, 'Important Alerts');
    }

    setIsFolderModalOpen(false);
  };

  const promptDeleteFolder = (e: React.MouseEvent, folder: NoteFolder) => {
    e.stopPropagation();
    setDeleteFolderTarget(folder);
    setIsDeleteFolderModalOpen(true);
  };

  const confirmDeleteFolder = (deleteNotesWithin: boolean) => {
    if (!deleteFolderTarget) return;
    const targetName = deleteFolderTarget.name;
    const remaining = foldersList.filter(f => f.id !== deleteFolderTarget.id);
    setFoldersList(remaining);

    if (deleteNotesWithin) {
      setNotes(prev => prev.filter(n => n.folder !== targetName));
      triggerToast('Folder & Notes Deleted 🗑️', `Deleted "${targetName}" and its notes.`, 'Important Alerts');
    } else {
      setNotes(prev => prev.map(n => n.folder === targetName ? { ...n, folder: 'General Notes', subject: 'General Notes' } : n));
      triggerToast('Folder Deleted 📁', `Deleted "${targetName}". Notes moved to "General Notes".`, 'Important Alerts');
    }

    if (selectedFolder === targetName) {
      setSelectedFolder(null);
    }
    setIsDeleteFolderModalOpen(false);
    setDeleteFolderTarget(null);
  };

  const handleMoveNote = (e: React.MouseEvent, noteId: string, targetFolderName: string) => {
    e.stopPropagation();
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folder: targetFolderName, subject: targetFolderName } : n));
    if (editingNote && editingNote.id === noteId) {
      setEditingNote(prev => prev ? { ...prev, folder: targetFolderName, subject: targetFolderName } : null);
    }
    setMovingNoteId(null);
    triggerToast('Note Moved 📂', `Moved to "${targetFolderName}".`, 'Important Alerts');
  };

  // Note Handlers
  const handleCreateNote = async (template: NoteTemplate = 'Blank', targetFolder?: string) => {
    const assignedFolder = targetFolder || selectedFolder || 'General Notes';
    const chapter = 'New Chapter';
    let content = '';

    if (template !== 'Blank') {
      setIsAiLoading(true);
      try {
        content = await GeminiService.generateNoteTemplate(assignedFolder, chapter, template) || '';
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
      subject: assignedFolder,
      chapter,
      template,
      status: 'New',
      isFavorite: false,
      date: Date.now(),
      tags: [],
      folder: assignedFolder
    };
    setNotes([newNote, ...notes]);
    setEditingNote(newNote);
    setViewMode('EDITOR');
  };

  const handleSaveNote = () => {
    if (!editingNote?.id) return;
    setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, ...editingNote } as NoteItem : n));
    setJustSavedNote(true);
    triggerToast('Note Saved! 💾', `"${editingNote.title || 'Untitled'}" saved successfully.`, 'Important Alerts');
    setTimeout(() => {
      setJustSavedNote(false);
      setViewMode('LIST');
      setEditingNote(null);
    }, 520);
  };

  const handleDeleteNote = (noteId: string) => {
    const noteToDelete = notes.find(n => n.id === noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
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
    setTargetFolderForAi(selectedFolder || 'Science & Lab');
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
          onError: () => setIsListeningChapter(false),
        });
        chapterVoiceSessionRef.current = session;
        await session.start();
        setIsListeningChapter(true);
      } catch {
        setIsListeningChapter(false);
      }
    }
  };

  const handleGenerateAiNotesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterNameInput.trim()) {
      triggerToast('Chapter Required', 'Please enter a chapter name to generate study notes.', 'Important Alerts');
      return;
    }

    const cost = 0; // Trial unlimited
    if (!onDeductCredit(cost)) {
      triggerToast('Credits Notice', 'You need credits to generate AI notes.', 'Important Alerts');
      return;
    }

    setIsGeneratingNotes(true);
    try {
      const classGrade = isPremium ? classGradeInput : (userProfile?.grade || classGradeInput);
      const board = isPremium ? boardInput : (userProfile?.board || boardInput);

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
        const assignedFolder = targetFolderForAi || selectedFolder || 'General Notes';
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
          tags: ['AI-Generated'],
          folder: assignedFolder
        };

        const updatedNotes = [newNote, ...notes];
        setNotes(updatedNotes);
        setEditingNote(newNote);
        setViewMode('EDITOR');
        triggerToast('Notes Generated! ✨', `Syllabus-aligned notes for "${chapterNameInput}" added to "${assignedFolder}".`, 'Important Alerts');
        setChapterNameInput('');
        setAuthorInput('');
      } else {
        triggerToast('Generation Failed', 'Failed to generate notes. Please try again.', 'Important Alerts');
      }
    } catch (err) {
      console.error("AI notes generation error:", err);
      triggerToast('Generation Error', 'Something went wrong. Please check your connection and retry.', 'Important Alerts');
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  // Voice recording
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

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

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
            if (editingNote && fullTranscript) {
              setEditingNote(prev => prev ? {
                ...prev,
                content: `${prev.content || ''}\n${fullTranscript}`
              } : null);
            }
          };
          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.debug('Speech recognition notice:', e);
        }
      }

      triggerToast('Voice Recording Started 🎙️', 'Speak clearly to dictate into your notes.', 'Important Alerts');
    } catch (err: any) {
      triggerToast('Microphone Notice', err.message || 'Please allow microphone access to dictate notes.', 'Important Alerts');
    }
  };

  const stopVoiceRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (recognitionRef.current) {
      try { 
        recognitionRef.current.stop(); 
      } catch {
        console.debug('Speech recognition cleanup handled');
      }
    }
    setIsRecording(false);
    triggerToast('Dictation Finished 🎙️', 'Voice notes captured.', 'Important Alerts');
  };

  const handleAiAction = async (task: 'summarize' | 'simplify' | 'mcq' | 'translate') => {
    if (!editingNote?.content) return;
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

  const StatusIcon = ({ status }: { status: NoteStatus }) => {
    if (status === 'Mastered') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === 'Revised') return <CheckSquare className="w-4 h-4 text-amber-500" />;
    return <Circle className="w-4 h-4 text-slate-300" />;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Navigation Tabs */}
      <div className="flex p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs relative">
        {[
          { id: 'NOTES', label: 'Study Notes & Folders', icon: StickyNote },
          { id: 'REMINDERS', label: 'Study Tasks', icon: Bell },
          { id: 'TIMETABLE', label: 'Exam Planner', icon: Calendar },
        ].map((tab) => {
          const Icon = tab.icon;
          const isCurrent = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 rounded-xl transition-colors z-10 cursor-pointer ${
                isCurrent 
                  ? 'text-primary-700 dark:text-primary-300' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {isCurrent && (
                <motion.div
                  layoutId="notes-active-tab"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="absolute inset-0 bg-primary-50 dark:bg-primary-900/35 border border-primary-200/70 dark:border-primary-800/60 rounded-xl shadow-xs"
                />
              )}
              <Icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'NOTES' && (
          <div className="animate-in fade-in duration-300">
            
            {/* TOP BAR / ACTIONS */}
            {viewMode !== 'EDITOR' && viewMode !== 'AI_GENERATOR' && (
              <div className="space-y-4 mb-6">
                
                {/* Search & Main Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      placeholder="Search across all notes, categories, and topics..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm text-slate-800 dark:text-white"
                    />
                    <Folder className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* View Switcher: Folders Hub vs Notes List */}
                    <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                      <button
                        onClick={() => { setSelectedFolder(null); setViewMode('FOLDERS'); }}
                        className={`px-3 py-1.5 rounded-lg transition ${viewMode === 'FOLDERS' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Folders Hub
                      </button>
                      <button
                        onClick={() => setViewMode('LIST')}
                        className={`px-3 py-1.5 rounded-lg transition ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        All Notes
                      </button>
                    </div>

                    <motion.button 
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={openCreateFolderModal}
                      className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer group"
                      title="Create a new study category/folder"
                    >
                      <FolderPlus className="w-4 h-4 text-primary-600 dark:text-primary-400 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      <span>+ New Folder</span>
                    </motion.button>

                    <motion.button 
                      whileHover={{ y: -2, scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setViewMode('AI_GENERATOR')} 
                      className="btn-glow-border px-4 py-2.5 bg-gradient-to-r from-primary-500 via-indigo-600 to-primary-700 hover:from-primary-600 hover:via-indigo-500 hover:to-primary-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer group"
                    >
                      <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" /> 
                      <span className="hidden sm:inline">AI Notes</span>
                    </motion.button>

                    <motion.button 
                      whileHover={{ y: -2, scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleCreateNote('Blank', selectedFolder || undefined)} 
                      className="btn-glow-border px-4 py-2.5 bg-gradient-to-r from-primary-500 via-indigo-600 to-primary-700 hover:from-primary-600 hover:via-indigo-500 hover:to-primary-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer group"
                    >
                      <Plus className="w-4 h-4 group-hover:rotate-90 group-hover:scale-110 transition-transform duration-300" /> 
                      <span>New Note</span>
                    </motion.button>
                  </div>
                </div>

                {/* HORIZONTAL CATEGORY / FOLDER TABS BAR (when in List View or when filtering) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  <button
                    onClick={() => { setSelectedFolder(null); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 border ${
                      selectedFolder === null 
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs' 
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>📁 All Notes</span>
                    <span className="text-[10px] opacity-75 font-mono">({notes.length})</span>
                  </button>

                  {foldersList.map((f) => {
                    const count = notes.filter(n => (n.folder || 'General Notes') === f.name).length;
                    const isSelected = selectedFolder === f.name;
                    const col = FOLDER_COLORS[f.color] || FOLDER_COLORS.indigo;

                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          setSelectedFolder(f.name);
                          if (viewMode === 'FOLDERS') setViewMode('LIST');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 border ${
                          isSelected
                            ? `${col.lightBg} ${col.text} ${col.border} ring-1 ${col.border}`
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <span>{f.icon || '📁'}</span>
                        <span>{f.name}</span>
                        <span className="text-[10px] opacity-70 font-mono">({count})</span>
                      </button>
                    );
                  })}

                  <button
                    onClick={openCreateFolderModal}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 border border-dashed border-primary-300 dark:border-primary-800 whitespace-nowrap flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Folder</span>
                  </button>
                </div>
              </div>
            )}

            {/* FOLDERS OVERVIEW VIEW */}
            {viewMode === 'FOLDERS' && (
              <div className="space-y-6">
                
                {/* Folders Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  {/* Create New Folder Action Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={openCreateFolderModal}
                    className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-600 bg-white/50 dark:bg-slate-800/50 flex flex-col items-center justify-center text-center cursor-pointer group transition-colors min-h-[190px]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <FolderPlus className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-primary-600 transition">Create New Folder</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Organize study notes by subject, unit, or exam topic.</p>
                  </motion.div>

                  {foldersList.map((folder, fIdx) => {
                    const containedNotes = notes.filter(n => (n.folder || 'General Notes') === folder.name);
                    const col = FOLDER_COLORS[folder.color] || FOLDER_COLORS.indigo;

                    return (
                      <motion.div 
                        key={folder.id}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.38, delay: Math.min(fIdx * 0.045, 0.35), ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ y: -5, scale: 1.012 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => { setSelectedFolder(folder.name); setViewMode('LIST'); }}
                        className="card-3d-hover bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-600 cursor-pointer group transition-colors shadow-xs hover:shadow-lg flex flex-col justify-between"
                      >
                        <div>
                          {/* Folder Card Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className={`w-12 h-12 rounded-2xl ${col.lightBg} ${col.text} flex items-center justify-center text-2xl group-hover:scale-105 transition-transform`}>
                              {folder.icon || '📁'}
                            </div>

                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => openEditFolderModal(e, folder)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                                title="Edit folder name & color"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => promptDeleteFolder(e, folder)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                                title="Delete folder"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <h3 className="font-bold text-base text-slate-800 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition">
                            {folder.name}
                          </h3>

                          {folder.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {folder.description}
                            </p>
                          )}

                          {/* Recent Notes Preview */}
                          {containedNotes.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-1">
                              {containedNotes.slice(0, 2).map((cn) => (
                                <div key={cn.id} className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
                                  <span className="truncate">{cn.title}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Folder Card Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                          <span className="font-medium">
                            {containedNotes.length} {containedNotes.length === 1 ? 'note' : 'notes'}
                          </span>
                          <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400 font-semibold group-hover:translate-x-1 transition-transform">
                            Open <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* LIST VIEW */}
            {viewMode === 'LIST' && (
              <div className="space-y-4">
                
                {/* Breadcrumbs & Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { setSelectedFolder(null); setViewMode('FOLDERS'); }}
                      className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Back to all folders"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-slate-800 dark:text-white">
                          {selectedFolder || 'All Notes'}
                        </span>
                        {selectedFolder && (
                          <span className="text-xs text-slate-400 font-medium">
                            ({filteredNotes.length} notes)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {selectedFolder ? `Organized under "${selectedFolder}" folder` : 'Browsing all student study materials'}
                      </div>
                    </div>
                  </div>

                  {/* Filter by Status */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 text-xs">
                      {(['ALL', 'New', 'Revised', 'Mastered'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-2.5 py-1 rounded-lg font-medium transition ${
                            statusFilter === st ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-bold' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {st === 'ALL' ? 'All Status' : st}
                        </button>
                      ))}
                    </div>

                    {allTags.length > 0 && (
                      <select 
                        value={selectedTag || ''}
                        onChange={(e) => setSelectedTag(e.target.value || null)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-700 dark:text-slate-200"
                      >
                        <option value="">All Tags</option>
                        {allTags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {filteredNotes.length === 0 ? (
                  <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 text-base">No notes in this view</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {selectedFolder 
                        ? `You don't have any notes inside "${selectedFolder}" yet. Create one now or move existing notes into it!`
                        : 'Start organizing your thoughts and materials by creating your first note.'
                      }
                    </p>
                    <button 
                      onClick={() => handleCreateNote('Blank', selectedFolder || undefined)}
                      className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Create Note in this Folder
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredNotes.map((note, nIdx) => {
                      const noteFolder = getFolderConfig(note.folder || 'General Notes');
                      const col = FOLDER_COLORS[noteFolder.color] || FOLDER_COLORS.indigo;

                      return (
                        <motion.div 
                          key={note.id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: Math.min(nIdx * 0.04, 0.32), ease: [0.16, 1, 0.3, 1] }}
                          whileHover={{ y: -4, scale: 1.01 }}
                          whileTap={{ scale: 0.985 }}
                          onClick={() => { setEditingNote(note); setViewMode('EDITOR'); }}
                          className="card-3d-hover bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-primary-400 dark:hover:border-primary-600 transition-colors cursor-pointer group relative flex flex-col justify-between"
                        >
                          <div>
                            {/* Card Top: Folder badge & Action Controls */}
                            <div className="flex justify-between items-start mb-3">
                              {/* Category / Folder Badge */}
                              <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 ${col.lightBg} ${col.text}`}>
                                <span>{noteFolder.icon || '📁'}</span>
                                <span className="truncate max-w-[110px]">{noteFolder.name}</span>
                              </div>

                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                {/* Quick Move to Folder Dropdown */}
                                <div className="relative">
                                  <button
                                    onClick={() => setMovingNoteId(movingNoteId === note.id ? null : note.id)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg text-[10px] font-semibold flex items-center gap-1"
                                    title="Move note to another folder"
                                  >
                                    <Folder className="w-3.5 h-3.5" />
                                  </button>

                                  {movingNoteId === note.id && (
                                    <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                                      <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                        Move to Folder
                                      </div>
                                      {foldersList.map(f => (
                                        <button
                                          key={f.id}
                                          onClick={(e) => handleMoveNote(e, note.id, f.name)}
                                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                                            (note.folder || 'General Notes') === f.name ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                          }`}
                                        >
                                          <span className="flex items-center gap-1.5 truncate">
                                            <span>{f.icon || '📁'}</span>
                                            <span className="truncate">{f.name}</span>
                                          </span>
                                          {(note.folder || 'General Notes') === f.name && <Check className="w-3 h-3 text-primary-600" />}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

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

                            <h4 className="font-bold text-slate-800 dark:text-white line-clamp-1 mb-1.5 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition text-sm">
                              {note.title}
                            </h4>

                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                              {note.content.replace(/[#*`_]/g, '')}
                            </p>
                          </div>

                          {/* Card Footer */}
                          <div className="flex justify-between items-center text-[10px] text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(note.date).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-2">
                              {note.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 font-semibold text-[9px] uppercase">
                                {note.template}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* EDITOR VIEW */}
            {viewMode === 'EDITOR' && editingNote && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Editor Header */}
                <div className="px-6 py-4 bg-white dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                    <button 
                      onClick={() => setViewMode('LIST')} 
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                      title="Back to notes list"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                    
                    <div className="flex-1">
                      <input 
                        type="text" 
                        value={editingNote.title} 
                        onChange={(e) => setEditingNote({...editingNote, title: e.target.value})}
                        className="font-bold text-base sm:text-lg text-slate-800 dark:text-white bg-transparent outline-none w-full border-b border-transparent focus:border-primary-500"
                        placeholder="Note Title"
                      />

                      {/* Folder / Category Selector Dropdown in Editor */}
                      <div className="relative inline-block mt-1">
                        <button
                          type="button"
                          onClick={() => setEditorFolderDropdownOpen(!editorFolderDropdownOpen)}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                        >
                          <span>{getFolderConfig(editingNote.folder || 'General Notes').icon}</span>
                          <span>Folder: {editingNote.folder || 'General Notes'}</span>
                          <ChevronRight className="w-3 h-3 rotate-90" />
                        </button>

                        {editorFolderDropdownOpen && (
                          <div className="absolute left-0 mt-1 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-1.5 z-40">
                            <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              Assign Folder / Category
                            </div>
                            {foldersList.map(f => (
                              <button
                                key={f.id}
                                onClick={() => {
                                  setEditingNote({ ...editingNote, folder: f.name, subject: f.name });
                                  setEditorFolderDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                                  (editingNote.folder || 'General Notes') === f.name ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <span>{f.icon || '📁'}</span>
                                  <span className="truncate">{f.name}</span>
                                </span>
                                {(editingNote.folder || 'General Notes') === f.name && <FolderCheck className="w-3.5 h-3.5 text-primary-600" />}
                              </button>
                            ))}
                            <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                              <button
                                onClick={() => {
                                  setEditorFolderDropdownOpen(false);
                                  openCreateFolderModal();
                                }}
                                className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-primary-600 dark:text-primary-400 font-bold hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg"
                              >
                                <Plus className="w-3.5 h-3.5" /> + Create New Folder
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Voice Dictation Button */}
                    {isRecording ? (
                      <button
                        onClick={stopVoiceRecording}
                        className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-rose-500/20 animate-pulse transition active:scale-95"
                      >
                        <Square className="w-3 h-3 fill-white" />
                        <span>Done ({Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')})</span>
                      </button>
                    ) : (
                      <button
                        onClick={startVoiceRecording}
                        className="px-3 py-2 bg-primary-50 dark:bg-primary-950/30 hover:bg-primary-100 dark:hover:bg-primary-900/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                      >
                        <Mic className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                        <span>Dictate</span>
                      </button>
                    )}

                    {/* Export */}
                    <button 
                      onClick={() => setIsExportOpen(true)} 
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export</span>
                    </button>

                    <button 
                      onClick={() => editingNote.id && handleDeleteNote(editingNote.id)}
                      className="p-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl transition active:scale-95"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <motion.button 
                      whileHover={{ y: -1, scale: 1.03 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSaveNote} 
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {justSavedNote ? (
                          <motion.span
                            key="saved"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5 text-white" /> Saved!
                          </motion.span>
                        ) : (
                          <motion.span
                            key="save"
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.85, opacity: 0 }}
                            className="flex items-center gap-1.5"
                          >
                            <Save className="w-3.5 h-3.5" /> Save Note
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </div>

                {/* AI Actions Quick Bar */}
                <div className="px-6 py-2 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 overflow-x-auto text-xs">
                  <span className="font-bold text-slate-400 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-primary-500" /> AI Assistant:
                  </span>
                  <button onClick={() => handleAiAction('summarize')} className="px-2.5 py-1 bg-white dark:bg-slate-800 text-primary-700 dark:text-primary-300 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-primary-50">
                    Summarize
                  </button>
                  <button onClick={() => handleAiAction('simplify')} className="px-2.5 py-1 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-blue-50">
                    Simplify
                  </button>
                  <button onClick={() => handleAiAction('mcq')} className="px-2.5 py-1 bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-purple-50">
                    Generate MCQs
                  </button>
                  <button onClick={() => handleAiAction('translate')} className="px-2.5 py-1 bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-amber-50">
                    Translate (Hindi)
                  </button>
                </div>

                {/* Editor Body */}
                <div className="flex flex-col md:flex-row h-[500px]">
                  {/* Markdown Editor */}
                  <textarea 
                    value={editingNote.content}
                    onChange={(e) => setEditingNote({...editingNote, content: e.target.value})}
                    placeholder="Write your study notes here..."
                    className="flex-1 p-6 bg-transparent outline-none resize-none dark:text-slate-200 border-r border-slate-100 dark:border-slate-700 font-mono text-sm leading-relaxed"
                  />
                  
                  {/* Live Preview */}
                  <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/20 custom-scrollbar">
                    <div className="prose prose-sm dark:prose-invert max-w-none markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{editingNote.content || '*No content yet*'}</ReactMarkdown>
                    </div>
                  </div>
                </div>

                {/* Editor Footer */}
                <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span>Status:</span>
                      <select 
                        value={editingNote.status} 
                        onChange={(e) => setEditingNote({...editingNote, status: e.target.value as NoteStatus})}
                        className="bg-transparent text-primary-600 font-bold outline-none cursor-pointer"
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
                      <Star className={`w-3.5 h-3.5 ${editingNote.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
                      <span>Favorite</span>
                    </label>
                  </div>
                  {isAiLoading && (
                    <div className="flex items-center gap-1.5 text-primary-600 font-bold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> AI Processing...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI GENERATOR VIEW */}
            {viewMode === 'AI_GENERATOR' && (
              <div className="space-y-4 max-w-4xl mx-auto">
                <motion.button 
                  whileHover={{ x: -3 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setViewMode('FOLDERS')}
                  className="flex items-center text-sm font-bold text-slate-500 hover:text-primary-600 mb-1 transition-colors group cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 rotate-180 mr-1 group-hover:-translate-x-0.5 transition-transform" /> Back to Folders Hub
                </motion.button>

                {isGeneratingNotes ? (
                  <LoadingState mode={AppMode.NOTES} />
                ) : (
                  <form onSubmit={handleGenerateAiNotesSubmit} className="space-y-5">
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 relative overflow-hidden"
                    >
                      {/* Background decoration */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 dark:bg-primary-900/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                      <div className="flex flex-wrap justify-between items-center gap-3 mb-5 relative z-10 perspective-1200">
                        <div>
                          <motion.h2
                            initial={{ opacity: 0, scale: 0.88, rotateX: 16, y: 6 }}
                            animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
                            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                            className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 preserve-3d group"
                          >
                            <BookOpen className="w-4 h-4 text-primary-600 group-hover:rotate-12 transition-transform duration-300" />
                            <span>AI Syllabus Notes Generator — Study Details</span>
                          </motion.h2>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Generate comprehensive, high-yield study notes with diagrams, key formulas, and explanations.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border-amber-100">
                            <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                            Cost: 20 Credits
                          </div>

                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05, y: -1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleFillSample}
                            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-100 rounded-full transition-colors uppercase tracking-wide cursor-pointer group"
                            title="Fill with sample data"
                          >
                            <Sparkles className="w-3 h-3 fill-primary-400 text-primary-600 group-hover:rotate-12 transition-transform duration-300" />
                            Try Example
                          </motion.button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                        {/* 1. Subject */}
                        <motion.div
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: 1 * 0.055, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-1"
                        >
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                          <div className="relative group">
                            <Type className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-primary-600 group-focus-within:scale-110 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300" />
                            <input
                              type="text"
                              required
                              value={subjectInput}
                              onChange={(e) => setSubjectInput(e.target.value)}
                              placeholder="e.g. Science"
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all duration-200 text-slate-900 dark:text-white text-sm"
                            />
                          </div>
                        </motion.div>

                        {/* 2. Class / Grade */}
                        <motion.div
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: 2 * 0.055, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Class / Grade</label>
                            {!isPremium ? (
                              <button
                                type="button"
                                onClick={() => onOpenUpgrade?.()}
                                className="text-[9px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
                              >
                                <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                Upgrade to Change
                              </button>
                            ) : (
                              <span className="text-[9px] font-semibold text-emerald-600 flex items-center gap-1">
                                <Crown className="w-2.5 h-2.5 fill-emerald-500" /> Premium Unlocked
                              </span>
                            )}
                          </div>
                          <div className="relative group">
                            <GraduationCap className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-primary-600 group-focus-within:scale-110 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300" />
                            <input
                              type="text"
                              value={classGradeInput}
                              onChange={(e) => setClassGradeInput(e.target.value)}
                              disabled={!isPremium}
                              placeholder="e.g. 10th Grade"
                              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white text-sm disabled:opacity-60"
                            />
                            {!isPremium && (
                              <div className="absolute right-2.5 top-2.5 text-amber-500" title="Locked: Premium required to change">
                                <Crown className="w-4 h-4 fill-amber-500" />
                              </div>
                            )}
                          </div>
                        </motion.div>

                        {/* 3. Board */}
                        <motion.div
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: 3 * 0.055, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Board</label>
                            {!isPremium ? (
                              <button
                                type="button"
                                onClick={() => onOpenUpgrade?.()}
                                className="text-[9px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
                              >
                                <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                Upgrade to Change
                              </button>
                            ) : (
                              <span className="text-[9px] font-semibold text-emerald-600 flex items-center gap-1">
                                <Crown className="w-2.5 h-2.5 fill-emerald-500" /> Premium Unlocked
                              </span>
                            )}
                          </div>
                          <div className="relative group">
                            <School className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-primary-600 group-focus-within:scale-110 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300" />
                            <input
                              type="text"
                              value={boardInput}
                              onChange={(e) => setBoardInput(e.target.value)}
                              disabled={!isPremium}
                              placeholder="e.g. CBSE"
                              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white text-sm disabled:opacity-60"
                            />
                            {!isPremium && (
                              <div className="absolute right-2.5 top-2.5 text-amber-500" title="Locked: Premium required to change">
                                <Crown className="w-4 h-4 fill-amber-500" />
                              </div>
                            )}
                          </div>
                        </motion.div>

                        {/* 4. Language */}
                        <motion.div
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: 4 * 0.055, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-1"
                        >
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Language</label>
                          <div className="relative group">
                            <Languages className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-primary-600 group-focus-within:scale-110 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 pointer-events-none" />
                            <select
                              value={languageInput}
                              onChange={(e) => setLanguageInput(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white text-sm"
                            >
                              <option value="English">English</option>
                              <option value="Hindi">Hindi</option>
                              <option value="Spanish">Spanish</option>
                              <option value="French">French</option>
                            </select>
                          </div>
                        </motion.div>

                        {/* 5. Chapter / Topic with Voice Dictate */}
                        <motion.div
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: 5 * 0.055, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chapter Name</label>
                            <button
                              type="button"
                              onClick={toggleChapterVoice}
                              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors ${
                                isListeningChapter ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              {isListeningChapter ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                              <span>{isListeningChapter ? 'Listening...' : 'Dictate'}</span>
                            </button>
                          </div>
                          <div className="relative group">
                            <BookOpen className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-primary-600 group-focus-within:scale-110 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300" />
                            <input
                              type="text"
                              required
                              value={chapterNameInput}
                              onChange={(e) => setChapterNameInput(e.target.value)}
                              placeholder="e.g. Chemical Reactions and Equations"
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all duration-200 text-slate-900 dark:text-white text-sm"
                            />
                          </div>
                        </motion.div>

                        {/* 6. Author (Optional) */}
                        <motion.div
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: 6 * 0.055, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-1"
                        >
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Author (Optional)</label>
                          <div className="relative group">
                            <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-primary-600 group-focus-within:scale-110 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300" />
                            <input
                              type="text"
                              value={authorInput}
                              onChange={(e) => setAuthorInput(e.target.value)}
                              placeholder="e.g. NCERT"
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all duration-200 text-slate-900 dark:text-white text-sm"
                            />
                          </div>
                        </motion.div>

                        {/* 7. Target Folder */}
                        <motion.div
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: 7 * 0.055, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-1"
                        >
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Folder</label>
                          <div className="relative group">
                            <Folder className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-primary-600 group-focus-within:scale-110 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 pointer-events-none" />
                            <select
                              value={targetFolderForAi}
                              onChange={(e) => setTargetFolderForAi(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white text-sm"
                            >
                              {foldersList.map(f => (
                                <option key={f.id} value={f.name}>{f.icon || '📁'} {f.name}</option>
                              ))}
                            </select>
                          </div>
                        </motion.div>

                        {/* 8. Max Characters */}
                        <motion.div
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: 8 * 0.055, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No. of Characters</label>
                            {!isPremium ? (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                Max 10,000 (Free)
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold text-emerald-600 flex items-center gap-1">
                                <Crown className="w-2.5 h-2.5 fill-emerald-500" /> Up to 20,000 Chars
                              </span>
                            )}
                          </div>
                          <div className="relative group">
                            <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-primary-600 group-focus-within:scale-110 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300" />
                            <input
                              type="number"
                              value={maxCharactersInput}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) {
                                  if (!isPremium && val > 10000) {
                                    setMaxCharactersInput(10000);
                                    onOpenUpgrade?.();
                                  } else {
                                    setMaxCharactersInput(val);
                                  }
                                } else {
                                  setMaxCharactersInput(5000);
                                }
                              }}
                              min="500"
                              max={isPremium ? 20000 : 10000}
                              step="500"
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white text-sm"
                            />
                          </div>
                        </motion.div>

                        {/* 9. Animated Segmented Difficulty Selector */}
                        <motion.div
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: 9 * 0.055, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-1"
                        >
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <BarChart className="w-3 h-3 text-slate-400" />
                            Difficulty
                          </label>
                          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-xl relative">
                            {(['Easy', 'Medium', 'Hard'] as DifficultyLevel[]).map((lvl) => {
                              const isSelected = difficultyInput === lvl;
                              return (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => setDifficultyInput(lvl)}
                                  className={`relative z-10 py-1.5 px-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center cursor-pointer ${
                                    isSelected ? 'text-primary-700 dark:text-primary-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                  }`}
                                >
                                  {isSelected && (
                                    <motion.div
                                      layoutId="ai-notes-difficulty-pill"
                                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                                      className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-xs border border-primary-200/80 dark:border-primary-700 -z-10"
                                    />
                                  )}
                                  <span>{lvl}</span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>

                    <motion.button
                      type="submit"
                      disabled={isGeneratingNotes}
                      whileHover={{ y: -2, scale: 1.01 }}
                      whileTap={{ scale: 0.985 }}
                      className="btn-glow-border w-full py-4 bg-gradient-to-r from-primary-500 via-indigo-600 to-primary-700 hover:from-primary-600 hover:via-indigo-500 hover:to-primary-800 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-5 h-5 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                      <span>Generate Notes & Save into Folder</span>
                    </motion.button>
                  </form>
                )}
              </div>
            )}

          </div>
        )}

        {/* --- REMINDERS TAB --- */}
        {activeTab === 'REMINDERS' && (
          <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
              <h3 className="font-bold text-base text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary-500" /> Add New Study Task
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  value={newReminder}
                  onChange={e => setNewReminder(e.target.value)}
                  placeholder="e.g. Revise Calculus Chapter 4 exercises..."
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm dark:text-white"
                />
                <div className="flex gap-2">
                  <input 
                    type="date" 
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-600 dark:text-slate-300 text-xs"
                  />
                  <input 
                    type="time" 
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-600 dark:text-slate-300 text-xs"
                  />
                </div>
                <motion.button 
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (!newReminder.trim()) return;
                    const dueTimeString = newDate ? `${newDate}T${newTime || '23:59'}` : '';
                    const item: ReminderItem = {
                      id: Date.now().toString(),
                      task: newReminder,
                      dueTime: dueTimeString ? new Date(dueTimeString).toISOString() : '',
                      completed: false
                    };
                    setReminders([...reminders, item]);
                    setNewReminder(''); setNewDate(''); setNewTime('');
                    triggerToast('Task Added ✅', 'New task added to your list.', 'Important Alerts');
                  }}
                  className="btn-glow-border px-5 py-2.5 bg-gradient-to-r from-primary-500 via-indigo-600 to-primary-700 hover:from-primary-600 hover:via-indigo-500 hover:to-primary-800 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 group cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  <span>Add Task</span>
                </motion.button>
              </div>
            </div>

            <div className="space-y-2.5">
              {reminders.map(item => (
                <div key={item.id} className={`flex items-center gap-3.5 p-4 bg-white dark:bg-slate-800 rounded-2xl border transition-all ${item.completed ? 'border-slate-100 dark:border-slate-800 opacity-60' : 'border-slate-200 dark:border-slate-700 shadow-xs'}`}>
                  <button 
                    onClick={() => setReminders(reminders.map(r => r.id === item.id ? {...r, completed: !r.completed} : r))}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${item.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-primary-500'}`}
                  >
                    {item.completed && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${item.completed ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>{item.task}</p>
                    {item.dueTime && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(item.dueTime).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setReminders(reminders.filter(r => r.id !== item.id))} className="text-slate-300 hover:text-rose-500 p-1.5 transition">
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
            {isGenerating ? (
              <LoadingState mode={AppMode.NOTES} />
            ) : timetable.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center"
              >
                <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-100 overflow-hidden">
                  <Logo className="w-full h-full" iconOnly noBorder />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Exam Study Planner</h2>
                <p className="text-sm text-slate-500 mt-1 mb-6">Enter your upcoming exam date and subjects to get a personalized daily study breakdown.</p>

                <div className="space-y-4 text-left max-w-md mx-auto">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Exam Date</label>
                    <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Syllabus / Subjects</label>
                    <textarea placeholder="e.g. Physics (Mechanics), Math (Calculus), Chemistry (Periodic Table)..." value={examSubjects} onChange={e => setExamSubjects(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 min-h-[90px] resize-none text-sm dark:text-white" />
                  </div>
                  <motion.button 
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={async () => {
                      if (!examDate || !examSubjects) return;
                      setIsGenerating(true);
                      try {
                        const schedule = await GeminiService.generateStudyTimetable(examDate, examSubjects, studyHours);
                        if (schedule) setTimetable(schedule);
                      } catch {
                        triggerToast('Error', 'Failed to generate timetable.', 'Important Alerts');
                      } finally {
                        setIsGenerating(false);
                      }
                    }}
                    className="btn-glow-border w-full py-4 bg-gradient-to-r from-primary-500 via-indigo-600 to-primary-700 hover:from-primary-600 hover:via-indigo-500 hover:to-primary-800 text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                    <span>Generate Study Schedule</span>
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">Your Study Plan</h3>
                  <button onClick={() => setTimetable([])} className="text-xs font-bold text-rose-500 hover:underline">Reset Plan</button>
                </div>
                {timetable.map((day, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-800 dark:text-white">{day.day}</span>
                      <span className="text-xs text-slate-500">{day.date}</span>
                    </div>
                    <div className="p-6 space-y-3">
                      {day.slots.map((slot, sIdx) => (
                        <div key={sIdx} className="flex gap-4 items-start text-xs">
                          <div className="min-w-[100px] font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded text-center">{slot.time}</div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white">{slot.subject}</p>
                            <p className="text-slate-500 dark:text-slate-400 mt-0.5">{slot.activity}</p>
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

        {/* EXPORT MODAL */}
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

        {/* CREATE / EDIT FOLDER MODAL */}
        <AnimatePresence>
          {isFolderModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <FolderPlus className="w-5 h-5 text-primary-600" />
                    <span>{editingFolder ? 'Edit Folder' : 'Create Study Folder'}</span>
                  </h3>
                  <button onClick={() => setIsFolderModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveFolderForm} className="space-y-4">
                  {/* Folder Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Folder / Category Name</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. Biology & Anatomy, AP Calculus, History Unit 2"
                      value={folderFormName}
                      onChange={(e) => setFolderFormName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Icon Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Folder Icon</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {FOLDER_ICONS.map((emoji) => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() => setFolderFormIcon(emoji)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border transition ${
                            folderFormIcon === emoji 
                              ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-500 scale-110 shadow-xs' 
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Color Accent</label>
                    <div className="flex items-center gap-2">
                      {Object.keys(FOLDER_COLORS).map((cKey) => {
                        const cObj = FOLDER_COLORS[cKey];
                        return (
                          <button
                            type="button"
                            key={cKey}
                            onClick={() => setFolderFormColor(cKey)}
                            className={`w-7 h-7 rounded-full ${cObj.bg} transition transform ${
                              folderFormColor === cKey ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : 'opacity-70 hover:opacity-100'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Midterm revision notes and formula cheat sheets"
                      value={folderFormDesc}
                      onChange={(e) => setFolderFormDesc(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsFolderModalOpen(false)}
                      className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl text-xs shadow-md transition"
                    >
                      {editingFolder ? 'Save Changes' : 'Create Folder'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DELETE FOLDER CONFIRMATION MODAL */}
        <AnimatePresence>
          {isDeleteFolderModalOpen && deleteFolderTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 12 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                  Delete &quot;{deleteFolderTarget.name}&quot;?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  Choose what happens to the notes inside this folder:
                </p>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => confirmDeleteFolder(false)}
                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl text-xs shadow-sm transition"
                  >
                    Move Notes to &quot;General Notes&quot; (Keep Notes)
                  </button>
                  <button
                    onClick={() => confirmDeleteFolder(true)}
                    className="w-full py-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold rounded-xl text-xs hover:bg-rose-100 transition"
                  >
                    Delete Folder and All Notes
                  </button>
                  <button
                    onClick={() => {
                      setIsDeleteFolderModalOpen(false);
                      setDeleteFolderTarget(null);
                    }}
                    className="w-full py-2 text-slate-400 hover:text-slate-600 font-medium rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default NotesView;
