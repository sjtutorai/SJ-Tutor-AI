
import React, { useRef, useState, useEffect } from 'react';
import { StudyRequestData, AppMode, DifficultyLevel, HomeworkFile, UserProfile } from '../types';
import { 
  BookOpen, 
  GraduationCap, 
  School, 
  User, 
  Languages, 
  BookType, 
  HelpCircle, 
  BarChart, 
  Sparkles, 
  Zap, 
  Crown, 
  Image as ImageIcon, 
  X, 
  Mic, 
  MicOff, 
  FileText, 
  FileSpreadsheet, 
  FileCode, 
  FileUp,
  AlertCircle
} from 'lucide-react';
import { VoiceDictationSession } from '../services/audioService';

interface InputFormProps {
  data: StudyRequestData;
  mode: AppMode;
  onChange: (field: keyof StudyRequestData, value: string | number | boolean) => void;
  onFillSample?: () => void;
  disabled?: boolean;
  lockGradeClass?: boolean;
  onFilesUpload?: (files: HomeworkFile[]) => void;
  homeworkFiles?: HomeworkFile[];
  userProfile?: UserProfile;
  onOpenUpgrade?: () => void;
}

const getMimeTypeFromExtension = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls': return 'application/vnd.ms-excel';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'csv': return 'text/csv';
    case 'txt': return 'text/plain';
    case 'md': return 'text/plain';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
};

const getFileMetadata = (file: HomeworkFile) => {
  const type = file.type.toLowerCase();
  const name = file.name || "File";
  
  if (type.startsWith("image/")) {
    return {
      isImage: true,
      bgColor: "bg-slate-100",
      textColor: "text-slate-600",
      borderColor: "border-slate-200",
      icon: ImageIcon,
      label: "Image"
    };
  }
  if (type === "application/pdf") {
    return {
      isImage: false,
      bgColor: "bg-red-50 dark:bg-red-950/20",
      textColor: "text-red-600 dark:text-red-400",
      borderColor: "border-red-100 dark:border-red-900/30",
      icon: FileText,
      label: "PDF"
    };
  }
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv") || name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
    return {
      isImage: false,
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
      textColor: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-emerald-100 dark:border-emerald-900/30",
      icon: FileSpreadsheet,
      label: "Sheet"
    };
  }
  if (type.includes("word") || type.includes("officedocument") || name.endsWith(".docx") || name.endsWith(".doc") || name.endsWith(".odt")) {
    return {
      isImage: false,
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      textColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-100 dark:border-blue-900/30",
      icon: FileText,
      label: "Document"
    };
  }
  return {
    isImage: false,
    bgColor: "bg-slate-50 dark:bg-slate-900",
    textColor: "text-slate-600 dark:text-slate-400",
    borderColor: "border-slate-100 dark:border-slate-800",
    icon: FileCode,
    label: "Text"
  };
};

const InputForm: React.FC<InputFormProps> = ({ 
  data, 
  mode, 
  onChange, 
  onFillSample, 
  disabled, 
  lockGradeClass,
  onFilesUpload,
  homeworkFiles = [],
  userProfile,
  onOpenUpgrade
}) => {

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const isRewardMode = mode === AppMode.QUIZ && data.questionCount === 10 && data.difficulty === 'Hard';
  const isPremium = Boolean(userProfile?.planType && userProfile.planType !== 'Free');
  const lockBoard = !isPremium;
  const isGradeLocked = lockGradeClass ?? !isPremium;

  const stateRef = useRef({
    mode,
    homeworkQuery: data.homeworkQuery,
    chapterName: data.chapterName,
    onChange
  });

  // Keep stateRef up to date
  useEffect(() => {
    stateRef.current = {
      mode,
      homeworkQuery: data.homeworkQuery,
      chapterName: data.chapterName,
      onChange
    };
  });

  const voiceSessionRef = useRef<VoiceDictationSession | null>(null);

  useEffect(() => {
    return () => {
      if (voiceSessionRef.current) {
        voiceSessionRef.current.stop().catch(() => {});
        voiceSessionRef.current = null;
      }
    };
  }, []);

  const toggleVoiceInput = async () => {
    setVoiceNotice(null);

    if (isListening) {
      setIsListening(false);
      if (voiceSessionRef.current) {
        try {
          const transcript = await voiceSessionRef.current.stop();
          if (transcript) {
            const { mode, homeworkQuery, chapterName, onChange } = stateRef.current;
            if (mode === AppMode.HOMEWORK) {
              const currentVal = homeworkQuery || '';
              if (!currentVal.toLowerCase().includes(transcript.toLowerCase())) {
                onChange('homeworkQuery', currentVal + (currentVal ? ' ' : '') + transcript);
              }
            } else {
              const currentVal = chapterName || '';
              if (!currentVal.toLowerCase().includes(transcript.toLowerCase())) {
                onChange('chapterName', currentVal + (currentVal ? ' ' : '') + transcript);
              }
            }
          }
        } catch (e) {
          console.warn('InputForm voice stop notice:', e);
        }
        voiceSessionRef.current = null;
      }
    } else {
      try {
        const session = new VoiceDictationSession({
          language: data.language || 'English',
          onInterim: (text) => {
            const { mode, homeworkQuery, chapterName, onChange } = stateRef.current;
            if (mode === AppMode.HOMEWORK) {
              const currentVal = homeworkQuery || '';
              onChange('homeworkQuery', currentVal + (currentVal ? ' ' : '') + text);
            } else {
              const currentVal = chapterName || '';
              onChange('chapterName', currentVal + (currentVal ? ' ' : '') + text);
            }
          },
          onFinal: (text) => {
            const { mode, homeworkQuery, chapterName, onChange } = stateRef.current;
            if (mode === AppMode.HOMEWORK) {
              const currentVal = homeworkQuery || '';
              onChange('homeworkQuery', currentVal + (currentVal ? ' ' : '') + text);
            } else {
              const currentVal = chapterName || '';
              onChange('chapterName', currentVal + (currentVal ? ' ' : '') + text);
            }
          },
          onError: (err) => {
            setVoiceNotice(err);
            setIsListening(false);
          },
          onRecordingStateChange: (rec) => {
            setIsListening(rec);
          }
        });

        voiceSessionRef.current = session;
        await session.start();
        setIsListening(true);
      } catch (err: any) {
        console.error('Failed to start InputForm dictation:', err);
        setVoiceNotice(err.message || 'Microphone access is unavailable. Please grant microphone permissions.');
        setIsListening(false);
      }
    }
  };


  const getEstimatedCost = () => {
    if (mode === AppMode.SUMMARY) return 10;
    if (mode === AppMode.HOMEWORK) {
      return 10;
    }
    if (mode === AppMode.QUIZ) {
      if (isRewardMode) return 0;
      let cost = 10;
      const qCount = data.questionCount || 5;
      cost += Math.ceil(qCount / 2);
      if (data.difficulty === 'Hard') cost += 5;
      return cost;
    }
    return 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && onFilesUpload) {
      const readers = Array.from(files).map(file => {
        return new Promise<HomeworkFile>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              name: file.name,
              type: file.type || getMimeTypeFromExtension(file.name),
              dataUrl: reader.result as string
            });
          };
          reader.readAsDataURL(file);
        });
      });
      
      Promise.all(readers).then(results => {
        onFilesUpload([...homeworkFiles, ...results]);
      });
    }
  };

  const removeFile = (index: number) => {
    if (onFilesUpload) {
      const newFiles = [...homeworkFiles];
      newFiles.splice(index, 1);
      onFilesUpload(newFiles);
    }
  };

  const cost = getEstimatedCost();

  const renderInput = (
    label: string, 
    field: keyof StudyRequestData, 
    Icon: React.ElementType, 
    placeholder: string
  ) => (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="relative group">
        <Icon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={data[field] as string}
          onChange={(e) => onChange(field, e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 text-slate-900 text-sm"
        />
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-5 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

      <div className="flex justify-between items-center mb-5 relative z-10">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          {mode === AppMode.HOMEWORK ? <BookOpen className="w-4 h-4 text-primary-600" /> : <BookOpen className="w-4 h-4 text-primary-600" />}
          {mode === AppMode.HOMEWORK ? 'Homework Solver' : 'Study Details'}
        </h2>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${isRewardMode ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
            {isRewardMode ? (
              <>
                <Crown className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                Reward: +50 Credits (Free Gen)
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                Cost: {cost} Credits
              </>
            )}
          </div>
          
          {onFillSample && (
            <button
              onClick={onFillSample}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-100 rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 uppercase tracking-wide"
              title="Fill with sample data"
            >
              <Sparkles className="w-3 h-3 fill-primary-400 text-primary-600" />
              Try Example
            </button>
          )}
        </div>
      </div>

      {mode === AppMode.HOMEWORK && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {homeworkFiles.map((file, idx) => {
              const meta = getFileMetadata(file);
              return (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm group">
                  {meta.isImage ? (
                    <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full ${meta.bgColor} flex flex-col items-center justify-center p-3 select-none text-center`}>
                      <meta.icon className={`w-10 h-10 ${meta.textColor} mb-2`} />
                      <span className={`text-[10px] font-bold ${meta.textColor} uppercase tracking-wider block mb-1`}>{meta.label}</span>
                      <p className="text-[10px] text-slate-500 font-medium truncate w-full px-1">{file.name}</p>
                    </div>
                  )}
                  <button 
                    onClick={() => removeFile(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                    title="Remove file"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-primary-50 dark:hover:bg-primary-950/20 hover:border-primary-300 rounded-xl flex flex-col items-center justify-center transition-all group p-3"
            >
              <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform">
                <FileUp className="w-5 h-5 text-slate-400 group-hover:text-primary-500" />
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Upload Files</span>
              <span className="text-[8px] text-slate-400 text-center mt-0.5 leading-tight">PDF, DOCS, SHEETS, PHOTO, TEXT</span>
            </button>
          </div>

          {voiceNotice && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Microphone Notice:</span> {voiceNotice}
              </div>
              <button 
                type="button" 
                onClick={() => setVoiceNotice(null)}
                className="text-amber-500 hover:text-amber-800 dark:hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Homework Text / Questions</label>
              <button
                type="button"
                onClick={toggleVoiceInput}
                disabled={disabled}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors ${
                  isListening ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                title="Dictate your request"
              >
                {isListening ? (
                  <><MicOff className="w-3 h-3" /> Listening...</>
                ) : (
                  <><Mic className="w-3 h-3" /> Dictate</>
                )}
              </button>
            </div>
            <textarea
              value={data.homeworkQuery || ''}
              onChange={(e) => onChange('homeworkQuery', e.target.value)}
              placeholder="Type your questions here, or let the AI analyze the files above..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 text-sm min-h-[100px] resize-none"
            />
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,image/*" 
            multiple
            className="hidden" 
          />
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4 mb-4 relative z-10">
        {mode === AppMode.HOMEWORK ? (
          <>
            {renderInput("Subject", "subject", BookType, "e.g. Mathematics")}
            {renderInput("Topic/Chapter", "chapterName", BookOpen, "e.g. Calculus / Integration")}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Class / Grade</label>
                {isGradeLocked ? (
                  <button
                    type="button"
                    onClick={() => onOpenUpgrade?.()}
                    className="text-[9px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
                    title="Upgrade to change Class or Grade"
                  >
                    <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                    Upgrade to Change
                  </button>
                ) : (
                  isPremium && (
                    <span className="text-[9px] font-semibold text-emerald-600 flex items-center gap-1">
                      <Crown className="w-2.5 h-2.5 fill-emerald-500" /> Premium Unlocked
                    </span>
                  )
                )}
              </div>
              <div 
                className={`relative group ${isGradeLocked ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (isGradeLocked && onOpenUpgrade) {
                    onOpenUpgrade();
                  }
                }}
              >
                <GraduationCap className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={data.gradeClass}
                  onChange={(e) => {
                    if (!isGradeLocked) {
                      onChange("gradeClass", e.target.value);
                    }
                  }}
                  readOnly={isGradeLocked}
                  disabled={disabled}
                  placeholder="e.g. 10th Grade"
                  className={`w-full pl-9 pr-8 py-2 bg-slate-50 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 text-slate-900 text-sm ${
                    isGradeLocked 
                      ? 'border-amber-200/80 bg-amber-50/20 cursor-pointer select-none' 
                      : 'border-slate-200'
                  }`}
                />
                {isGradeLocked && (
                  <div className="absolute right-2.5 top-2.5 text-amber-500 hover:text-amber-600" title="Locked: Premium required to change">
                    <Crown className="w-4 h-4 fill-amber-500" />
                  </div>
                )}
              </div>
              {isGradeLocked && (
                <p className="text-[9px] text-slate-400 flex items-center gap-1 pt-0.5">
                  <Crown className="w-2.5 h-2.5 text-amber-500" />
                  Locked to profile grade. Upgrade to Premium to customize.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            {renderInput("Subject", "subject", BookType, "e.g. History")}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Class / Grade</label>
                {isGradeLocked ? (
                  <button
                    type="button"
                    onClick={() => onOpenUpgrade?.()}
                    className="text-[9px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
                    title="Upgrade to change Class or Grade"
                  >
                    <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                    Upgrade to Change
                  </button>
                ) : (
                  isPremium && (
                    <span className="text-[9px] font-semibold text-emerald-600 flex items-center gap-1">
                      <Crown className="w-2.5 h-2.5 fill-emerald-500" /> Premium Unlocked
                    </span>
                  )
                )}
              </div>
              <div 
                className={`relative group ${isGradeLocked ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (isGradeLocked && onOpenUpgrade) {
                    onOpenUpgrade();
                  }
                }}
              >
                <GraduationCap className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={data.gradeClass}
                  onChange={(e) => {
                    if (!isGradeLocked) {
                      onChange("gradeClass", e.target.value);
                    }
                  }}
                  readOnly={isGradeLocked}
                  disabled={disabled}
                  placeholder="e.g. 10th Grade"
                  className={`w-full pl-9 pr-8 py-2 bg-slate-50 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 text-slate-900 text-sm ${
                    isGradeLocked 
                      ? 'border-amber-200/80 bg-amber-50/20 cursor-pointer select-none' 
                      : 'border-slate-200'
                  }`}
                />
                {isGradeLocked && (
                  <div className="absolute right-2.5 top-2.5 text-amber-500 hover:text-amber-600" title="Locked: Premium required to change">
                    <Crown className="w-4 h-4 fill-amber-500" />
                  </div>
                )}
              </div>
              {isGradeLocked && (
                <p className="text-[9px] text-slate-400 flex items-center gap-1 pt-0.5">
                  <Crown className="w-2.5 h-2.5 text-amber-500" />
                  Locked to profile grade. Upgrade to Premium to customize.
                </p>
              )}
            </div>

            {/* Board Field - Restricted to Premium */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Board</label>
                {lockBoard ? (
                  <button
                    type="button"
                    onClick={() => onOpenUpgrade?.()}
                    className="text-[9px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
                    title="Upgrade to change Educational Board"
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
              <div 
                className={`relative group ${lockBoard ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (lockBoard && onOpenUpgrade) {
                    onOpenUpgrade();
                  }
                }}
              >
                <School className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={data.board || (userProfile?.board || 'CBSE')}
                  onChange={(e) => {
                    if (!lockBoard) {
                      onChange("board", e.target.value);
                    }
                  }}
                  readOnly={lockBoard}
                  disabled={disabled}
                  placeholder="e.g. CBSE / ICSE"
                  className={`w-full pl-9 pr-8 py-2 bg-slate-50 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 text-slate-900 text-sm ${
                    lockBoard 
                      ? 'border-amber-200/80 bg-amber-50/20 cursor-pointer select-none' 
                      : 'border-slate-200'
                  }`}
                />
                {lockBoard && (
                  <div className="absolute right-2.5 top-2.5 text-amber-500 hover:text-amber-600" title="Locked: Premium required to change">
                    <Crown className="w-4 h-4 fill-amber-500" />
                  </div>
                )}
              </div>
              {lockBoard && (
                <p className="text-[9px] text-slate-400 flex items-center gap-1 pt-0.5">
                  <Crown className="w-2.5 h-2.5 text-amber-500" />
                  Locked to profile board. Upgrade to Premium to customize.
                </p>
              )}
            </div>

            {renderInput("Language", "language", Languages, "e.g. English")}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chapter Name</label>
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  disabled={disabled}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors ${
                    isListening ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  title="Dictate Chapter"
                >
                  {isListening ? (
                    <><MicOff className="w-3 h-3" /> Listening...</>
                  ) : (
                    <><Mic className="w-3 h-3" /> Dictate</>
                  )}
                </button>
              </div>
              <div className="relative group">
                <BookOpen className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={data.chapterName as string}
                  onChange={(e) => onChange('chapterName', e.target.value)}
                  disabled={disabled}
                  placeholder="e.g. The French Revolution"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 text-slate-900 text-sm"
                />
              </div>
            </div>
            {renderInput("Author (Optional)", "author", User, "e.g. NCERT")}
          </>
        )}

        {/* Summary / AI Notes Specific Options */}
        {mode === AppMode.SUMMARY && (
          <>
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No. of Characters</label>
                {!isPremium ? (
                  <button
                    type="button"
                    onClick={() => onOpenUpgrade?.()}
                    className="text-[9px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
                    title="Free accounts: Up to 10,000 characters. Upgrade for 10,000+"
                  >
                    <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                    Max 10,000 (Free) • 10,000+ Premium
                  </button>
                ) : (
                  <span className="text-[9px] font-semibold text-emerald-600 flex items-center gap-1">
                    <Crown className="w-2.5 h-2.5 fill-emerald-500" /> Up to 20,000 Chars
                  </span>
                )}
              </div>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  value={data.maxCharacters || 5000}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                      if (!isPremium && val > 10000) {
                        onChange('maxCharacters', 10000);
                        onOpenUpgrade?.();
                      } else {
                        onChange('maxCharacters', val);
                      }
                    } else {
                      onChange('maxCharacters', 0);
                    }
                  }}
                  disabled={disabled}
                  min="500"
                  max={isPremium ? 20000 : 10000}
                  step="500"
                  placeholder="e.g. 5000"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 text-slate-900 text-sm"
                />
              </div>
              {!isPremium && (
                <p className="text-[9px] text-slate-400 flex items-center gap-1 pt-0.5">
                  <Crown className="w-2.5 h-2.5 text-amber-500" />
                  Free accounts support up to 10,000 characters. Upgrade to Premium for 10,000+ extensive notes!
                </p>
              )}
            </div>

            <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Difficulty</label>
              <div className="relative">
                <BarChart className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <select
                  value={data.difficulty || 'Medium'}
                  onChange={(e) => onChange('difficulty', e.target.value as DifficultyLevel)}
                  disabled={disabled}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 appearance-none text-slate-900 text-sm"
                >
                  <option value="Easy">Easy (Quick Revision)</option>
                  <option value="Medium">Medium (Standard Notes)</option>
                  <option value="Hard">Hard (In-Depth / Exam Prep)</option>
                </select>
              </div>
            </div>

            <div className="col-span-full mt-1">
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                Tip: Customize <span className="font-bold text-primary-600">No. of Characters</span> (e.g. 5,000) and <span className="font-bold text-primary-600">Difficulty</span> for syllabus-aligned study notes!
              </p>
            </div>
          </>
        )}

        {/* Quiz Specific Options */}
        {mode === AppMode.QUIZ && (
          <>
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No. of Questions</label>
                {!isPremium ? (
                  <button
                    type="button"
                    onClick={() => onOpenUpgrade?.()}
                    className="text-[9px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
                    title="Free accounts: Up to 15 questions. Upgrade for 15+"
                  >
                    <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                    Max 15 (Free) • 15+ Premium
                  </button>
                ) : (
                  <span className="text-[9px] font-semibold text-emerald-600 flex items-center gap-1">
                    <Crown className="w-2.5 h-2.5 fill-emerald-500" /> Up to 50 Questions
                  </span>
                )}
              </div>
              <div className="relative">
                <HelpCircle className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  value={data.questionCount || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                      if (!isPremium && val > 15) {
                        onChange('questionCount', 15);
                        onOpenUpgrade?.();
                      } else {
                        onChange('questionCount', val);
                      }
                    } else {
                      onChange('questionCount', 0);
                    }
                  }}
                  disabled={disabled}
                  min="1"
                  max={isPremium ? 50 : 15}
                  placeholder="e.g. 10"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 text-slate-900 text-sm"
                />
              </div>
              {!isPremium && (
                <p className="text-[9px] text-slate-400 flex items-center gap-1 pt-0.5">
                  <Crown className="w-2.5 h-2.5 text-amber-500" />
                  Free accounts can generate up to 15 questions. Upgrade to Premium for 15+ questions (up to 50)!
                </p>
              )}
            </div>

            <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Difficulty</label>
              <div className="relative">
                <BarChart className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <select
                  value={data.difficulty}
                  onChange={(e) => onChange('difficulty', e.target.value as DifficultyLevel)}
                  disabled={disabled}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 appearance-none text-slate-900 text-sm"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard (+5 Credits)</option>
                </select>
              </div>
            </div>
            
            {/* Helper text for the challenge */}
            {data.questionCount !== 10 || data.difficulty !== 'Hard' ? (
              <div className="col-span-full mt-1">
                 <p className="text-[10px] text-slate-400 flex items-center gap-1">
                   <Zap className="w-3 h-3" />
                   Tip: Select <span className="font-bold text-primary-600">10 Questions</span> with <span className="font-bold text-primary-600">Hard</span> difficulty and score <span className="font-bold text-emerald-600">75%+</span> to earn <span className="font-bold text-emerald-600">50 Credits</span>!
                 </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default InputForm;
