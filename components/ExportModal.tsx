import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Search, Download, FileText, Code, Table, Sparkles, BookOpen, 
  HelpCircle, MonitorPlay, MessageSquare, Database
} from 'lucide-react';
import { exportContent, ExportContentType, ExportMetadata } from '../utils/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: ExportContentType;
  contentData: any;
  title: string;
  metadata?: ExportMetadata;
}

interface FormatOption {
  id: string;
  name: string;
  ext: string;
  description: string;
  category: 'docs' | 'data' | 'slides' | 'code';
}

const FORMAT_OPTIONS: FormatOption[] = [
  // Documents & Web
  { id: 'pdf', name: 'Portable Document Format', ext: '.pdf', description: 'Documents, reports, and printable study sheets', category: 'docs' },
  { id: 'docx', name: 'Microsoft Word Document', ext: '.docx', description: 'Fully editable rich text document for MS Word', category: 'docs' },
  { id: 'html', name: 'Web Page', ext: '.html', description: 'Interactive webpage styled with modern Tailwind CSS', category: 'docs' },
  { id: 'md', name: 'Markdown File', ext: '.md', description: 'Styled documentation, compatible with GitHub and Obsidian', category: 'docs' },
  { id: 'txt', name: 'Plain Text', ext: '.txt', description: 'Simple unformatted text suitable for all devices', category: 'docs' },
  { id: 'rtf', name: 'Rich Text Format', ext: '.rtf', description: 'Cross-platform text document compatible with major word processors', category: 'docs' },
  { id: 'odt', name: 'OpenDocument Text', ext: '.odt', description: 'LibreOffice Writer and OpenOffice text format', category: 'docs' },
  
  // Data & Spreadsheets
  { id: 'xlsx', name: 'Microsoft Excel Spreadsheet', ext: '.xlsx', description: 'Structured tabular rows with formatting for MS Excel', category: 'data' },
  { id: 'csv', name: 'Comma-Separated Values', ext: '.csv', description: 'Standard raw table data for spreadsheets and databases', category: 'data' },
  { id: 'ods', name: 'OpenDocument Spreadsheet', ext: '.ods', description: 'LibreOffice Calc and OpenOffice spreadsheet format', category: 'data' },
  { id: 'json', name: 'JSON Structured Data', ext: '.json', description: 'Fully formatted JSON object with strict key-value pairs', category: 'data' },
  { id: 'xml', name: 'XML Markup', ext: '.xml', description: 'Hierarchical markup structure for software integrations', category: 'data' },
  { id: 'yaml', name: 'YAML Document', ext: '.yaml', description: 'Clean configuration file representation of the content', category: 'data' },
  
  // Presentations & Slides
  { id: 'pptx', name: 'PowerPoint Presentation', ext: '.pptx', description: 'Pre-formatted slides with titles, structures, and bullet points', category: 'slides' },
  { id: 'odp', name: 'OpenDocument Presentation', ext: '.odp', description: 'LibreOffice Impress and OpenOffice presentation slides', category: 'slides' },
  
  // Developer Formats
  { id: 'py', name: 'Python Script', ext: '.py', description: 'Python source code wrapping the study material as dictionaries', category: 'code' },
  { id: 'js', name: 'JavaScript Module', ext: '.js', description: 'CommonJS/ES Module export file with raw structured data', category: 'code' },
  { id: 'ts', name: 'TypeScript Source', ext: '.ts', description: 'TypeScript file complete with structured interfaces and types', category: 'code' },
  { id: 'css', name: 'Cascading Style Sheet', ext: '.css', description: 'CSS file containing custom properties of the study data', category: 'code' },
  { id: 'sql', name: 'SQL Script', ext: '.sql', description: 'SQL DDL and insert scripts to populate database tables', category: 'code' }
];

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  contentType,
  contentData,
  title,
  metadata = {}
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'docs' | 'data' | 'slides' | 'code'>('all');
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const filteredFormats = useMemo(() => {
    return FORMAT_OPTIONS.filter(format => {
      const matchesSearch = format.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            format.ext.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            format.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || format.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const handleExport = async (formatId: string) => {
    setDownloadingFormat(formatId);
    try {
      // Small simulated delay for feedback smoothness
      await new Promise(resolve => setTimeout(resolve, 600));
      await exportContent(contentType, formatId, contentData, {
        title,
        ...metadata
      });
    } catch (e) {
      console.error("Export handler error:", e);
      alert("Failed to export. Please try another format.");
    } finally {
      setDownloadingFormat(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'docs': return <FileText className="w-4 h-4 text-amber-500" />;
      case 'data': return <Table className="w-4 h-4 text-emerald-500" />;
      case 'slides': return <MonitorPlay className="w-4 h-4 text-indigo-500" />;
      case 'code': return <Code className="w-4 h-4 text-purple-500" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getContentIcon = () => {
    switch (contentType) {
      case 'notes': return <BookOpen className="w-5 h-5 text-amber-500" />;
      case 'quiz': return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'summary': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'homework': return <HelpCircle className="w-5 h-5 text-rose-500" />;
      case 'tutor': return <MessageSquare className="w-5 h-5 text-emerald-500" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          {/* Backdrop Click */}
          <div className="absolute inset-0" onClick={onClose} />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-150 dark:border-slate-800 max-w-2xl w-full overflow-hidden relative z-10 flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/55 dark:bg-slate-950/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-50 dark:bg-slate-800 rounded-xl">
                  {getContentIcon()}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">Export Study Material</h3>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                    <span>Title:</span>
                    <span className="text-slate-600 dark:text-slate-300 truncate max-w-[280px]">{title}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controls */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search file formats (e.g., pdf, word, csv)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 dark:text-white transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Filter Tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'all', label: 'All Formats' },
                  { id: 'docs', label: 'Documents & Web' },
                  { id: 'data', label: 'Data & Spreadsheet' },
                  { id: 'slides', label: 'Presentations' },
                  { id: 'code', label: 'Developer Formats' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedCategory(tab.id as any)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                      selectedCategory === tab.id 
                        ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/15' 
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/10">
              {filteredFormats.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-bold text-slate-400 dark:text-slate-500">No matching formats found.</p>
                  <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Try another search term or Category</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredFormats.map((format) => {
                    const isCurrentDownloading = downloadingFormat === format.id;
                    return (
                      <button
                        key={format.id}
                        disabled={downloadingFormat !== null}
                        onClick={() => handleExport(format.id)}
                        className={`p-3.5 rounded-2xl border text-left flex items-start gap-3.5 transition-all group relative active:scale-[0.98] ${
                          isCurrentDownloading 
                            ? 'bg-primary-50/55 border-primary-300 dark:bg-primary-950/20 dark:border-primary-800'
                            : 'bg-white dark:bg-slate-800/60 border-slate-150 dark:border-slate-850 hover:border-primary-300 dark:hover:border-slate-700 hover:shadow-md'
                        }`}
                      >
                        {/* Icon */}
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl group-hover:bg-primary-50 dark:group-hover:bg-slate-800 transition-colors">
                          {getCategoryIcon(format.category)}
                        </div>

                        {/* Title & Desc */}
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-slate-800 dark:text-white truncate">
                              {format.name}
                            </span>
                            <span className="text-[10px] font-mono font-black text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-slate-900 px-1.5 py-0.5 rounded uppercase">
                              {format.ext}
                            </span>
                          </div>
                          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 line-clamp-2 mt-1 leading-normal">
                            {format.description}
                          </p>
                        </div>

                        {/* Hover Action Indicator */}
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-primary-500 transition-colors">
                          {isCurrentDownloading ? (
                            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 translate-y-0.5 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Status bar */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                <span>Format options generated on-the-fly</span>
              </span>
              <span>All 20 format extensions included</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
