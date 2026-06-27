
import React, { useRef, useState, useEffect } from 'react';
import { StudyRequestData, AppMode, DifficultyLevel } from '../types';
import { BookOpen, GraduationCap, School, User, Languages, BookType, HelpCircle, BarChart, Sparkles, Zap, Crown, Image as ImageIcon, X, Mic, MicOff, FileText, FileSpreadsheet } from 'lucide-react';

interface InputFormProps {
  data: StudyRequestData;
  mode: AppMode;
  onChange: (field: keyof StudyRequestData, value: string | number | boolean) => void;
  onFillSample?: () => void;
  disabled?: boolean;
  lockGradeClass?: boolean;
  onImagesUpload?: (base64s: string[]) => void;
  homeworkImages?: string[];
}

const InputForm: React.FC<InputFormProps> = ({ 
  data, 
  mode, 
  onChange, 
  onFillSample, 
  disabled, 
  lockGradeClass,
  onImagesUpload,
  homeworkImages = []
}) => {

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);
  const isRewardMode = mode === AppMode.QUIZ && data.questionCount === 10 && data.difficulty === 'Hard';

  useEffect(() => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) return;

    const rec = new Recognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      if (mode === AppMode.HOMEWORK) {
        const currentVal = data.homeworkQuery || '';
        onChange('homeworkQuery', currentVal + (currentVal ? ' ' : '') + transcript);
      } else {
        const currentVal = data.chapterName || '';
        onChange('chapterName', currentVal + (currentVal ? ' ' : '') + transcript);
      }
      setIsListening(false);
    };

    rec.onerror = () => {
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    if (isListening) {
      rec.start();
    } else {
      rec.stop();
    }

    return () => {
      try {
        rec.stop();
      } catch {
        // Already stopped
      }
    };
  }, [isListening, data.homeworkQuery, onChange]);

  const toggleVoiceInput = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      alert("Speech recognition is not supported in this browser. Try Google Chrome.");
      return;
    }
    setIsListening(!isListening);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && onImagesUpload) {
      const readers = Array.from(files).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });
      
      Promise.all(readers).then(results => {
        onImagesUpload([...homeworkImages, ...results]);
      });
    }
  };

  const removeImage = (index: number) => {
    if (onImagesUpload) {
      const newImages = [...homeworkImages];
      newImages.splice(index, 1);
      onImagesUpload(newImages);
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
            {homeworkImages.map((img, idx) => {
              const getFileDetails = (dataUrl: string) => {
                if (dataUrl.startsWith("data:image/")) {
                  return { isImage: true, label: "Photo", icon: ImageIcon, bgClass: "" };
                }
                if (dataUrl.startsWith("data:application/pdf")) {
                  return { isImage: false, label: "PDF Document", icon: FileText, bgClass: "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100" };
                }
                if (dataUrl.includes("wordprocessingml") || dataUrl.includes("msword") || dataUrl.includes("document") || dataUrl.includes("rtf")) {
                  return { isImage: false, label: "DOCS Document", icon: FileText, bgClass: "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100" };
                }
                if (dataUrl.includes("spreadsheetml") || dataUrl.includes("ms-excel") || dataUrl.includes("csv") || dataUrl.includes("excel")) {
                  return { isImage: false, label: "SHEETS Spreadsheet", icon: FileSpreadsheet, bgClass: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100" };
                }
                if (dataUrl.startsWith("data:text/")) {
                  return { isImage: false, label: "TEXT File", icon: FileText, bgClass: "bg-slate-150 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-slate-200" };
                }
                return { isImage: false, label: "Attached File", icon: FileText, bgClass: "bg-slate-50 dark:bg-slate-950/20 text-slate-600 dark:text-slate-400 border-slate-100" };
              };

              const details = getFileDetails(img);

              return (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm group">
                  {details.isImage ? (
                    <img src={img} alt={`Homework Scan ${idx + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center p-3 text-center ${details.bgClass}`}>
                      <details.icon className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider truncate max-w-full px-1">{details.label}</span>
                    </div>
                  )}
                  <button 
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all opacity-100 group-hover:opacity-100 md:opacity-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-primary-50 hover:border-primary-300 rounded-xl flex flex-col items-center justify-center transition-all group p-2 text-center"
            >
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5 text-slate-400 group-hover:text-primary-500" />
              </div>
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Upload File</span>
              <span className="text-[8px] text-slate-400 mt-1 leading-tight">PDF, DOCS, SHEETS, PHOTO, TEXT</span>
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Homework Text / Questions</label>
              <button
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
              placeholder="Type your questions here, or let the AI analyze the uploaded documents/photos above..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 text-sm min-h-[100px] resize-none"
            />
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md" 
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
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Class / Grade</label>
              <div className="relative group">
                <GraduationCap className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={data.gradeClass}
                  onChange={(e) => onChange("gradeClass", e.target.value)}
                  disabled={disabled || lockGradeClass}
                  placeholder="e.g. 10th Grade"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 text-slate-900 text-sm disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {renderInput("Subject", "subject", BookType, "e.g. History")}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Class / Grade</label>
              <div className="relative group">
                <GraduationCap className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={data.gradeClass}
                  onChange={(e) => onChange("gradeClass", e.target.value)}
                  disabled={disabled || lockGradeClass}
                  placeholder="e.g. 10th Grade"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 text-slate-900 text-sm disabled:cursor-not-allowed"
                />
                {lockGradeClass && (
                  <div className="absolute right-3 top-2.5">
                    <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  </div>
                )}
              </div>
            </div>
            {renderInput("Board", "board", School, "e.g. CBSE")}
            {renderInput("Language", "language", Languages, "e.g. English")}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chapter Name</label>
                <button
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

        {/* Quiz Specific Options */}
        {mode === AppMode.QUIZ && (
          <>
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No. of Questions</label>
              <div className="relative">
                <HelpCircle className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  value={data.questionCount || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    onChange('questionCount', isNaN(val) ? 0 : val);
                  }}
                  disabled={disabled}
                  min="1"
                  max="50"
                  placeholder="e.g. 10"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 text-slate-900 text-sm"
                />
              </div>
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
