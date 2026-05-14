
import React, { useRef } from 'react';
import { StudyRequestData, AppMode, DifficultyLevel } from '../types';
import { BookOpen, GraduationCap, School, User, Languages, BookType, HelpCircle, BarChart, Sparkles, Zap, Crown, Camera, Image as ImageIcon, X, Plus } from 'lucide-react';

interface InputFormProps {
  data: StudyRequestData;
  mode: AppMode;
  onChange: (field: keyof StudyRequestData, value: string | number | boolean) => void;
  onFillSample?: () => void;
  disabled?: boolean;
  lockGradeClass?: boolean;
  onImageUpload?: (base64: string | null) => void;
  homeworkImages?: string[];
  onRemoveImage?: (index: number) => void;
}

const InputForm: React.FC<InputFormProps> = ({ 
  data, 
  mode, 
  onChange, 
  onFillSample, 
  disabled, 
  lockGradeClass,
  onImageUpload,
  homeworkImages = [],
  onRemoveImage
}) => {

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isRewardMode = mode === AppMode.QUIZ && data.questionCount === 10 && data.difficulty === 'Hard';

  const getEstimatedCost = () => {
    if (mode === AppMode.SUMMARY) return 10;
    if (mode === AppMode.HOMEWORK) {
      // Cost increases slightly with more images? Maybe stay 10 for now.
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
    if (files && onImageUpload) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          onImageUpload(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
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
          {mode === AppMode.HOMEWORK ? <Camera className="w-4 h-4 text-primary-600" /> : <BookOpen className="w-4 h-4 text-primary-600" />}
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
          
          {onFillSample && mode !== AppMode.HOMEWORK && (
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
        <div className="mb-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {homeworkImages.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl border border-slate-200 overflow-hidden group shadow-sm bg-slate-50">
                <img src={img} alt={`Homework ${idx + 1}`} className="w-full h-full object-cover" />
                <button 
                  onClick={() => onRemoveImage?.(idx)}
                  className="absolute top-1.5 right-1.5 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-primary-50 hover:border-primary-300 transition-all text-slate-400 hover:text-primary-600 group"
            >
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Add Photo</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Additional Instructions (Optional)</label>
            <textarea
              value={data.homeworkInstructions || ''}
              onChange={(e) => onChange('homeworkInstructions', e.target.value)}
              placeholder="e.g. Solve only question 5, or explain the core concept behind this problem..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-slate-900 text-sm min-h-[80px]"
            />
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            accept="image/*" 
            className="hidden" 
            multiple
            capture="environment"
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
            {renderInput("Chapter Name", "chapterName", BookOpen, "e.g. The French Revolution")}
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
