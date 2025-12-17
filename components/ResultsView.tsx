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
  type?: string; // 'Summary' | 'Essay' | 'Quiz' etc.
  onBack: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ content, isLoading, title, type = 'Document', onBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cleanup speech when component unmounts
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Stop playing if content changes or loading starts
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

      // Simple cleanup to remove markdown symbols for better reading
      const textToRead = content
        .replace(/[*#_`]/g, '') // Remove standard markdown chars
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Keep link text, remove URL
        .replace(/\n/g, '. '); // Pause on newlines

      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 1;
      utterance.pitch = 1;
      
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
    
    // A simple hack to create a file that Word can open (HTML)
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${title}</title></head>
      <body>${contentRef.current.innerHTML}</body>
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
      const clone = element.cloneNode(true) as HTMLElement;
      
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '800px'; // Fixed width for consistent output
      clone.style.height = 'auto';
      clone.style.padding = '40px';
      clone.style.background = 'white';
      
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, { scale: 2, useCORS: true });
      document.body.removeChild(clone);

      const image = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = image;
      a.download = getFilename('png');
      a.click();
    } catch (e) {
      console.error("Image download failed", e);
      alert("Failed to generate image.");
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadPDF = async () => {
    if (!contentRef.current) return;
    setIsDownloading(true);
    try {
      // CLONE TECHNIQUE for PDF
      // We force the clone to have a width suitable for A4 printing (approx 700-800px)
      // This ensures text wrapping matches what we want in the PDF.
      const element = contentRef.current;
      const clone = element.cloneNode(true) as HTMLElement;
      
      const a4WidthPx = 750; // Width that fits well on A4 PDF with margins

      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = `${a4WidthPx}px`; 
      clone.style.height = 'auto'; 
      clone.style.overflow = 'visible';
      clone.style.maxHeight = 'none';
      clone.style.background = 'white';
      clone.style.color = 'black'; // Ensure text is black for printing
      clone.style.padding = '40px'; // Add padding for the PDF look
      
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, { 
        scale: 2, // Higher scale for better quality text
        useCORS: true,
        logging: false,
        windowWidth: a4WidthPx + 100 // Ensure window context is large enough
      });
      
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate image height to fit PDF width
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add subsequent pages if content is long
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(getFilename('pdf'));
    } catch (e) {
      console.error("PDF download failed", e);
      alert("Failed to generate PDF. Try downloading as Text or Word.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!content && !isLoading) return null;

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
             <h3 className="font-semibold text-slate-800 line-clamp-1">{title}</h3>
             <span className="text-xs text-slate-500 font-medium">{type}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isLoading && content && (
            <>
              {/* Download Options */}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 mr-2">
                 <button 
                   onClick={downloadPDF} 
                   disabled={isDownloading}
                   className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                   title="Download PDF (Preserves Formatting)"
                 >
                   <FileType className="w-4 h-4" />
                 </button>
                 <div className="w-px h-4 bg-slate-200 mx-1"></div>
                 <button 
                   onClick={downloadWord} 
                   className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                   title="Download Word (Doc)"
                 >
                   <FileText className="w-4 h-4" />
                 </button>
                 <div className="w-px h-4 bg-slate-200 mx-1"></div>
                 <button 
                   onClick={downloadImage} 
                   disabled={isDownloading}
                   className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors disabled:opacity-50"
                   title="Download Image (PNG)"
                 >
                   <ImageIcon className="w-4 h-4" />
                 </button>
                 <div className="w-px h-4 bg-slate-200 mx-1"></div>
                 <button 
                   onClick={downloadText} 
                   className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                   title="Download Text"
                 >
                   <Download className="w-4 h-4" />
                 </button>
              </div>

              <button
                onClick={toggleSpeech}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isPlaying 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                    : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                }`}
                title={isPlaying ? "Stop reading" : "Read aloud"}
              >
                {isPlaying ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span className="hidden sm:inline">Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Listen</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center text-primary-600 text-sm">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </div>
        )}
      </div>
      
      <div className="p-6 min-h-[200px]" ref={contentRef}>
        <div className="markdown-body text-slate-700 bg-white">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        {content === '' && isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-8 h-8 mb-4 animate-spin text-primary-300" />
            <p>Starting generation...</p>
          </div>
        )}
      </div>
      
      {!isLoading && (
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
            <button 
                onClick={onBack}
                className="text-sm font-semibold text-primary-700 hover:text-primary-800 hover:underline"
            >
                Generate Another Version
            </button>
        </div>
      )}
    </div>
  );
};

export default ResultsView;