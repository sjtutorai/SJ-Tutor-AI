import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Save, Book, CheckSquare, Loader2, ArrowRight, 
  Clipboard, Calendar, Heading, ScrollText, Check, ArrowLeft, Download
} from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { NoteItem, NoteTemplate, NoteStatus } from '../types';

interface AiNotesGeneratorViewProps {
  userId: string | null;
  onDeductCredit: (amount: number) => boolean;
  onNavigateToNotes: () => void;
}

const templatesList: Array<{ id: NoteTemplate; label: string; desc: string }> = [
  { id: 'Theory', label: 'Theory Revision', desc: 'Comprehensive, deep theoretical explanations with conceptual models.' },
  { id: 'Revision', label: 'Revision Outline', desc: 'Sleek, bulleted revision points for quick last-minute exam prep.' },
  { id: 'Formula', label: 'Formula Sheet', desc: 'Symmetrical, tabulated equations and mathematical mappings.' },
  { id: 'Q&A', label: 'Q&A Flashcards', desc: 'CBSE/ICSE critical questions paired with detailed grading answers.' }
];

const AiNotesGeneratorView: React.FC<AiNotesGeneratorViewProps> = ({ 
  userId, 
  onDeductCredit, 
  onNavigateToNotes 
}) => {
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate>('Theory');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  
  // Custom toast notification states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleGenerateNotes = async () => {
    if (!subject.trim()) {
      showToast('Please specify a Study Subject', 'error');
      return;
    }
    if (!chapter.trim()) {
      showToast('Please specify a Topic or Chapter Title', 'error');
      return;
    }

    const creditCost = 8;
    if (!onDeductCredit(creditCost)) {
      showToast(`AI generation costs ${creditCost} credits. Insufficient balance!`, 'error');
      return;
    }

    setIsGenerating(true);
    setGeneratedNotes('');
    setIsSaved(false);

    try {
      const result = await GeminiService.generateNoteTemplate(subject, chapter, selectedTemplate);
      if (result) {
        setGeneratedNotes(result);
        setEditedTitle(`${chapter} - AI Notes`);
        showToast('AI Notes generated successfully!', 'success');
      } else {
        showToast('No output received from study helper.', 'error');
      }
    } catch (e: any) {
      console.error(e);
      showToast('Generation failed. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToNotebook = () => {
    if (!generatedNotes) return;
    try {
      const key = userId || 'guest';
      const storageKey = `notes_${key}`;
      const savedNotesStr = localStorage.getItem(storageKey);
      let currentNotes: NoteItem[] = [];
      
      if (savedNotesStr) {
        currentNotes = JSON.parse(savedNotesStr);
      }

      const newNote: NoteItem = {
        id: Date.now().toString(),
        title: editedTitle || `${chapter} Notes`,
        content: generatedNotes,
        subject: subject,
        chapter: chapter,
        template: selectedTemplate,
        status: 'New' as NoteStatus,
        isFavorite: false,
        date: Date.now(),
        tags: ['AI-Generated']
      };

      const updatedNotes = [newNote, ...currentNotes];
      localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
      setIsSaved(true);
      showToast('Notes saved successfully to your Notebook!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to save notes.', 'error');
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedNotes);
    showToast('Copied to Clipboard!', 'success');
  };

  const handleExportPDF = async () => {
    if (!generatedNotes) return;
    
    // Create print boundary
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '800px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#1e293b';
    container.style.padding = '40px';
    container.style.fontFamily = 'Inter, system-ui, sans-serif';
    
    container.innerHTML = `
      <div style="border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="font-size: 24px; font-weight: 800; color: #1e1b4b; margin: 0; text-transform: uppercase;">${editedTitle || `${chapter} AI Notes`}</h1>
          <p style="font-size: 11px; font-weight: 700; color: #64748b; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.12em;">
            Subject: ${subject} &bull; Template: ${selectedTemplate}
          </p>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 9px; font-weight: 700; background-color: #f1f5f9; color: #475569; padding: 4px 8px; border-radius: 4px;">AI CREATED</span>
          <p style="font-size: 9px; color: #94a3b8; margin: 6px 0 0 0;">Date: ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
      <div style="font-size: 14px; line-height: 1.7; color: #334155;">
        ${generatedNotes.split('\n').map(p => {
          if (p.trim().startsWith('#')) {
            const level = p.match(/^#+/)?.[0].length || 1;
            const size = level === 1 ? '18px' : level === 2 ? '15px' : '13px';
            return `<h${level} style="font-size: ${size}; font-weight: 850; color: #0f172a; margin-top: 18px; margin-bottom: 8px;">${p.replace(/^#+\s*/, '')}</h${level}>`;
          }
          if (p.trim().startsWith('-') || p.trim().startsWith('*')) {
            return `<li style="margin-left: 16px; margin-bottom: 4px;">${p.replace(/^[-*]\s*/, '')}</li>`;
          }
          return p.trim() ? `<p style="margin-bottom: 10px;">${p}</p>` : '';
        }).join('')}
      </div>
    `;

    document.body.appendChild(container);
    
    try {
      const { jsPDF } = await import('jspdf');
      // @ts-expect-error - html2canvas has missing types
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let pos = 0;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, pos, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        pos = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, pos, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`AI_Notes_${subject.replace(/\s+/g, '_')}.pdf`);
      showToast('PDF exported successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('PDF export failed.', 'error');
    } finally {
      document.body.removeChild(container);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500 fill-amber-500" />
            AI Notes Generator
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate customized academic study chapters, equation summaries, and Q&A collections.
          </p>
        </div>
        <button 
          onClick={onNavigateToNotes}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm self-start md:self-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Go to My Notebook
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Step Inputs (Form) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block mb-2">1. Select Study Subject</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Physics, History, Literature"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium dark:text-white"
                />
                <Book className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block mb-2">2. Chapter or Topic Name</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  placeholder="e.g. Newton Laws of Motion, French Revolution"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium dark:text-white"
                />
                <Heading className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block mb-3">3. Choose Note Template</label>
            <div className="grid grid-cols-1 gap-3">
              {templatesList.map((t) => (
                <div 
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedTemplate === t.id 
                    ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/20 text-slate-800 dark:text-white ring-2 ring-primary-500/20' 
                    : 'border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black tracking-tight">{t.label}</span>
                    {selectedTemplate === t.id && (
                      <Check className="w-4 h-4 text-primary-500" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={handleGenerateNotes}
            disabled={isGenerating}
            className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 active:scale-95 transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                SJ Tutor Creating Notes...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-white" />
                Generate Study Notes
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded ml-1">Costs 8 Cr</span>
              </>
            )}
          </button>
        </div>

        {/* Results Preview (Generated MD) */}
        <div className="lg:col-span-7 space-y-4">
          {!generatedNotes && !isGenerating ? (
            <div className="h-full min-h-[450px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center text-primary-600 mb-4 shadow-sm">
                <ScrollText className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-700 dark:text-white">Workspace is ready</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Enter your subject topic details on the left, choosing a template to generate notes with Gemini instantly.
              </p>
            </div>
          ) : isGenerating ? (
            <div className="h-full min-h-[450px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center p-8 text-center space-y-4 animate-pulse">
              <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
              <div>
                <h3 className="font-extrabold text-slate-700 dark:text-white">Formulating Lecture Notes</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Analyzing standard textbooks, equations, and syllabi to draft high-quality content...
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col h-[580px]">
              {/* Output Actions Header */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full text-sm font-black text-slate-800 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-primary-500 py-1"
                    placeholder="Note Title"
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400 uppercase font-black">Subject: {subject}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] text-slate-400 uppercase font-black">Template: {selectedTemplate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleCopyToClipboard}
                    className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                    title="Copy to Clipboard"
                  >
                    <Clipboard className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleExportPDF}
                    className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                    title="Export PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleSaveToNotebook}
                    disabled={isSaved}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isSaved 
                      ? 'bg-emerald-100 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSaved ? 'Saved to Notebook!' : 'Save Notes'}
                  </button>
                </div>
              </div>

              {/* Editable Content Workspace (Split editor and preview) */}
              <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-700 overflow-hidden">
                <textarea 
                  value={generatedNotes}
                  onChange={(e) => { setGeneratedNotes(e.target.value); setIsSaved(false); }}
                  className="flex-1 p-6 bg-transparent outline-none resize-none text-xs dark:text-slate-200 font-mono focus:bg-slate-50/10 custom-scrollbar overflow-y-auto"
                  placeholder="Notes Editor..."
                />
                <div className="flex-1 p-6 overflow-y-auto bg-slate-50/40 dark:bg-slate-900/10 custom-scrollbar">
                  <div className="prose prose-xs dark:prose-invert max-w-none markdown-body">
                    <ReactMarkdown>{generatedNotes}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {toastMessage && (
        <div id="ai-notes-toast" className="fixed bottom-6 right-6 z-[1001] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 font-black text-[11px] text-white ${
            toastType === 'success' ? 'bg-emerald-600' :
            toastType === 'error' ? 'bg-red-600' : 'bg-slate-800'
          }`}>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiNotesGeneratorView;
