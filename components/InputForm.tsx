
import React from 'react';
import { StudyRequestData, AppMode, DifficultyLevel } from '../types';
import { BookOpen, GraduationCap, School, User, Languages, BookType, HelpCircle, BarChart, Sparkles, Zap, Image as ImageIcon, Crown } from 'lucide-react';

interface InputFormProps {
  data: StudyRequestData;
  mode: AppMode;
  onChange: (field: keyof StudyRequestData, value: string | number | boolean) => void;
  onFillSample?: () => void;
  disabled?: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ data, mode, onChange, onFillSample, disabled }) => {

  // Challenge: 10 or more Hard questions
  const isRewardMode = mode === AppMode.QUIZ && (data.questionCount || 0) >= 10 && data.difficulty === 'Hard';

  const getEstimatedCost = () => {
    if (mode === AppMode.SUMMARY) return 10;
    if (mode === AppMode.ESSAY) {
      return 10 + (data.includeImages ? 5 : 0);
    }
    if (mode === AppMode.QUIZ) {
      // Reward Challenge: Free generation if requirements met
      if (isRewardMode) return 0;

      let cost = 10;
      const qCount = data.questionCount || 5;
      // Small cost increment for larger quizzes
      if (qCount > 10) cost += 5;
      
      // Hard difficulty surcharge
      if (data.difficulty === 'Hard') cost += 5;
      
      return cost;
    }
    return 0;
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
        <Icon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
        <input
          type="text"
          value={data[field] as string}
          onChange={(e) => onChange(field, e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:opacity-60 text-slate-900 text-sm"
        />
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-5 relative overflow-hidden transition-all hover:shadow-md">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

      <div className="flex justify-between items-center mb-5 relative z-10">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary-600" />
          {mode === AppMode.QUIZ ? 'Quiz Configuration' : mode === AppMode.ESSAY ? 'Essay Options' : 'Study Details'}
        </h2>

        <div className="flex items-center gap-2">
          {/* Cost Indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wide transition-all ${
            isRewardMode 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm animate-pulse' 
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {isRewardMode ? (
              <>
                <Crown className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                <span>Challenge: Free</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>Cost: {cost}</span>
              </>
            )}
          </div>
          
          {onFillSample && (
            <button
              onClick={onFillSample}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full transition-all active:scale-95 disabled:opacity-50 uppercase tracking-wide"
              title="Auto-fill with sample data"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-500" />
              Auto-Fill
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4 mb-4 relative z-10">
        {renderInput("Subject", "subject", BookType, "e.g. History")}
        {renderInput("Class / Grade", "gradeClass", GraduationCap, "e.g. 10th Grade")}
        {renderInput("Board", "board", School, "e.g. CBSE")}
        {renderInput("Language", "language", Languages, "e.g. English")}
        {renderInput("Chapter Name", "chapterName", BookOpen, "e.g. The French Revolution")}
        {renderInput("Author (Optional)", "author", User, "e.g. NCERT")}

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
                  className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-lg focus:ring-2 outline-none transition-all text-sm ${
                    (data.questionCount || 0) >= 10 ? 'border-emerald-200 ring-emerald-500' : 'border-slate-200 focus:ring-primary-500 focus:border-transparent'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                Difficulty
                {data.difficulty === 'Hard' && <span className="text-amber-600 text-[9px]">+5 Credits</span>}
              </label>
              <div className="relative">
                <BarChart className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <select
                  value={data.difficulty}
                  onChange={(e) => onChange('difficulty', e.target.value as DifficultyLevel)}
                  disabled={disabled}
                  className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-lg focus:ring-2 outline-none transition-all appearance-none text-slate-900 text-sm ${
                    data.difficulty === 'Hard' ? 'border-amber-200 focus:ring-amber-500' : 'border-slate-200 focus:ring-primary-500'
                  }`}
                >
                  <option value="Easy">Easy (Standard)</option>
                  <option value="Medium">Medium (Standard)</option>
                  <option value="Hard">Hard (High Cost)</option>
                </select>
              </div>
            </div>
            
            {/* Reward Tip */}
            {!isRewardMode && (
              <div className="col-span-full mt-2 p-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-lg flex items-center gap-2">
                 <div className="p-1.5 bg-white rounded-full shadow-sm">
                   <Crown className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                 </div>
                 <p className="text-[10px] text-emerald-800">
                   <span className="font-bold">Challenge:</span> Select <span className="font-bold underline">10+ Hard Questions</span>. Cost is 0, and scoring &gt;75% earns <span className="font-bold">+50 Credits</span>!
                 </p>
              </div>
            )}
            
            {isRewardMode && (
              <div className="col-span-full mt-2 p-2 bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-2 animate-pulse">
                 <Crown className="w-4 h-4 text-emerald-700 fill-emerald-700" />
                 <p className="text-xs font-bold text-emerald-800">
                   Challenge Active! Score &gt;75% to win 50 credits. Good luck!
                 </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Essay Specific Options */}
      {mode === AppMode.ESSAY && (
        <div className="relative z-10 pt-4 mt-2 border-t border-slate-100 flex items-center justify-between animate-in slide-in-from-top-2">
           <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${data.includeImages ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">AI Illustrations</p>
                <p className="text-[10px] text-slate-500">Generate a relevant image for your essay</p>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
             {data.includeImages && (
               <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 animate-in fade-in">
                 +5 Credits
               </span>
             )}
             <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={data.includeImages} 
                  onChange={(e) => onChange('includeImages', e.target.checked)}
                  disabled={disabled}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
             </label>
           </div>
        </div>
      )}
    </div>
  );
};

export default InputForm;
