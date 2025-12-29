
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, Volume2, Square, ArrowLeft, Download, FileText, Image as ImageIcon, FileType } from 'lucide-react';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

interface ResultsViewProps {
  content: string;
  isLoading: boolean;
  title: string;
  type?: string; 
  onBack: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ content, isLoading, title, type = 'Document', onBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }, [isLoading, content]);

  const toggleSpeech = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      if (!content) return;
      const textToRead = content
        .replace(/[*#_`]/g, '') 
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') 
        .replace(/\n/g, '. '); 

      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  const getFilename = (ext: string) => {
    const cleanTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const cleanType = type.toLowerCase();
    return `${cleanTitle}_${cleanType}.${ext}`;
  };

  const downloadText = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFilename('txt');
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadWord = () => {
    if (!contentRef.current) return;
    const htmlContent = `
      <html>
      <body style="font-family: sans-serif; line-height: 1.6;">
        <h1>${title}</h1>
        <div style="color: #B7950B; font-weight: bold;">${type}</div>
        ${contentRef.current.innerHTML}
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFilename('doc');
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadImage = async () => {
    if (!contentRef.current) return;
    setIsDownloading(true);
    try {
      const element = contentRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const image = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = image;
      a.download = getFilename('png');
      a.click();
    } catch (e) {
      alert("Failed to generate image.");
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadPDF = async () => {
    if (!contentRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
      pdf.save(getFilename('pdf'));
    } catch (e) {
      alert("Failed to generate PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!content && !isLoading) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in transition-colors">
      <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-slate-400 dark:text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col text-left">
             <h3 className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">{title}</h3>
             <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{type}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isLoading && content && (
            <>
              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 mr-2 shadow-sm">
                 <button onClick={downloadPDF} disabled={isDownloading} className="p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors"><FileType className="w-4 h-4" /></button>
                 <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                 <button onClick={downloadWord} className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors"><FileText className="w-4 h-4" /></button>
                 <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                 <button onClick={downloadText} className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-md transition-colors"><Download className="w-4 h-4" /></button>
              </div>

              <button
                onClick={toggleSpeech}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isPlaying 
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800' 
                    : 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/30'
                }`}
              >
                {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{isPlaying ? 'Stop' : 'Listen'}</span>
              </button>
            </>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center text-primary-600 dark:text-primary-400 text-sm font-medium">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating {type}...
          </div>
        )}
      </div>
      
      <div className="p-6 min-h-[200px]" ref={contentRef}>
        <div className="markdown-body text-slate-700 dark:text-slate-300">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        {content === '' && isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
            <Loader2 className="w-8 h-8 mb-4 animate-spin text-primary-300" />
            <p>SJ Tutor AI is brainstorming...</p>
          </div>
        )}
      </div>
      
      {!isLoading && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-center">
            <button onClick={onBack} className="text-sm font-semibold text-primary-700 dark:text-primary-400 hover:underline flex items-center gap-2">
                Generate Another Version
            </button>
        </div>
      )}
    </div>
  );
};

export default ResultsView;
