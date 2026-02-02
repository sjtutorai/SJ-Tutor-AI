
import React from 'react';
import { StudyRequestData, AppMode, DifficultyLevel, SummaryType } from '../types';
import { BookOpen, GraduationCap, School, User, Languages, BookType, HelpCircle, BarChart, Sparkles, Zap, Image as ImageIcon, Crown, FileText } from 'lucide-react';

interface InputFormProps {
  data: StudyRequestData;
  mode: AppMode;
  onChange: (field: keyof StudyRequestData, value: string | number | boolean) => void;
  onFillSample?: () => void;
  disabled?: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ data, mode, onChange, onFillSample, disabled }) => {

  const isRewardMode = mode === AppMode.QUIZ && data.questionCount === 20 && data.difficulty === 'Hard';

  const getEstimatedCost = () => {
    if (mode === AppMode.SUMMARY) return 10;
    if (mode === AppMode.ESSAY) {
      return data.includeImages ? 15 : 10;
    }
    if (mode === AppMode.QUIZ) {
      // Reward Challenge: Free generation for 20 Hard Questions
      if (isRewardMode) return 0;

      let cost = 10;
      const qCount = data.questionCount || 5;
      cost += Math.ceil(qCount / 2);
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
          <BookOpen className="w-4 h-4 text-primary-600" />
          Study Details
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4 mb-4 relative z-10">
        {renderInput("Subject", "subject", BookType, "e.g. History")}
        {renderInput("Class / Grade", "gradeClass", GraduationCap, "e.g. 10th Grade")}
        {renderInput("Board", "board", School, "e.g. CBSE")}
        {renderInput("Language", "language", Languages, "e.g. English")}
        {renderInput("Chapter Name", "chapterName", BookOpen, "e.g. The French Revolution")}
        {renderInput("Author (Optional)", "author", User, "e.g. NCERT")}

        {/* Summary Specific Options */}
        {mode === AppMode.SUMMARY && (
           <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Summary Style</label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <select
                  value={data.summaryType || 'Detailed'}
                  onChange={(e) => onChange('summaryType', e.target.value as SummaryType)}
                  disabled={disabled}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:opacity-60 appearance-none text-slate-900 text-sm"
                >
                  <option value="Detailed">Detailed Summary (Bulleted)</option>
                  <option value="Paragraph">Paragraph Summary (Narrative)</option>
                  <option value="Brief">Brief Summary (Concise)</option>
                </select>
              </div>
            </div>
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
            {data.questionCount !== 20 || data.difficulty !== 'Hard' ? (
              <div className="col-span-full mt-1">
                 <p className="text-[10px] text-slate-400 flex items-center gap-1">
                   <Zap className="w-3 h-3" />
                   Tip: Select <span className="font-bold text-primary-600">20 Questions</span> with <span className="font-bold text-primary-600">Hard</span> difficulty and score <span className="font-bold text-emerald-600">75%+</span> to earn <span className="font-bold text-emerald-600">50 Credits</span>!
                 </p>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Essay Specific Options */}
      {mode === AppMode.ESSAY && (
        <div className="relative z-10 pt-2 border-t border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Illustrate with AI Images</p>
                <p className="text-[10px] text-slate-500">I'll generate highly relevant visuals for your essay.</p>
              </div>
           </div>
           <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={data.includeImages} 
                onChange={(e) => onChange('includeImages', e.target.checked)}
                disabled={disabled}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              <span className="ml-3 text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">+5 Credits</span>
           </label>
        </div>
      )}
    </div>
  );
};

export default InputForm;
