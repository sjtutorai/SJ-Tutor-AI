import React, { useState, useEffect } from "react";
import { ApiLogger } from "../services/apiLogger";
import { ApiLogEntry } from "../types";
import { 
  Terminal, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle, 
  WifiOff, 
  Server, 
  Cpu, 
  Search, 
  Filter, 
  X, 
  RefreshCw, 
  Copy, 
  Check,
  Code
} from "lucide-react";

interface DiagnosticsPanelProps {
  onClose?: () => void;
  standalone?: boolean;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ onClose, standalone = false }) => {
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = () => {
    setLogs([...ApiLogger.getLogs()]);
  };

  useEffect(() => {
    fetchLogs();

    // Listen for real-time updates as requests are issued
    const handleLogAdded = () => {
      fetchLogs();
    };

    window.addEventListener("sjtutor-api-log-added", handleLogAdded);
    return () => {
      window.removeEventListener("sjtutor-api-log-added", handleLogAdded);
    };
  }, []);

  const handleClearLogs = () => {
    if (window.confirm("Are you sure you want to clear all active diagnostic logs?")) {
      ApiLogger.clearLogs();
      fetchLogs();
    }
  };

  const classifyErrorIcon = (type: ApiLogEntry["errorType"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "network":
        return <WifiOff className="w-5 h-5 text-amber-500 animate-pulse" />;
      case "quota":
        return <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce" />;
      case "server":
        return <Server className="w-5 h-5 text-red-500" />;
      default:
        return <Cpu className="w-5 h-5 text-slate-500" />;
    }
  };

  const getBadgeStyle = (type: ApiLogEntry["errorType"]) => {
    switch (type) {
      case "success":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900";
      case "network":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900";
      case "quota":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900";
      case "server":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900";
      default:
        return "bg-slate-50 text-slate-705 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  const getRemedyMessage = (entry: ApiLogEntry) => {
    switch (entry.errorType) {
      case "network":
        return "Network Error Detected. Your browser failed to reach the server. Please check your physical WiFi/Internet connection, DNS resolver, or disable extensions that may block scripts (AdBlockers / Privacy shields).";
      case "quota":
        return "Gemini API Quota Exceeded (HTTP 429). The system has reached its request threshold. SJ Tutor provides high-tier access, but limits prevent exhaustion. Action: Try again in 1-2 minutes, reduce chapter size, or upgrade credits tab.";
      case "server":
        return `Backend Server Issue (HTTP ${entry.status}). Google Gemini or the node proxy reported an internal server fault. Google servers are likely overloaded or executing safety filters. Action: Try rephrasing your topic slightly so different content triggers.`;
      case "other":
        return `Request rejected with code ${entry.status}. This can happen due to unrecognized document attachments or expired sessions. Action: Please try logging out and logging back in, or check if inputs contain invalid characters.`;
      default:
        return "This request executed successfully.";
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filterType === "all" || log.errorType === filterType;
    const matchesSearch = 
      log.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.errorMessage && log.errorMessage.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.status && String(log.status).includes(searchTerm));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className={`flex flex-col h-full bg-slate-50 dark:bg-slate-900/45 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden ${standalone ? 'p-1' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-primary-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">API Diagnostic Console</h2>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full font-semibold text-slate-500 dark:text-slate-400">
            {logs.length} logged
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchLogs}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:rotate-45 duration-300"
            title="Refresh Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {logs.length > 0 && (
            <button 
              onClick={handleClearLogs}
              className="p-1.5 text-rose-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
              title="Clear Console"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              title="Close Console"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            id="diag-search"
            type="text"
            placeholder="Search logs (e.g. endpoint, error string, code)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary-500 placeholder-slate-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            id="diag-filter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/40 text-slate-700 dark:text-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary-500 transition-all"
          >
            <option value="all">All Request Statuses</option>
            <option value="success">Success (200)</option>
            <option value="quota">Quota Overlimit (429)</option>
            <option value="network">Network/CORS Issues (0)</option>
            <option value="server">Server Errors (5xx)</option>
            <option value="other">Other Response Rejections</option>
          </select>
        </div>
      </div>

      {/* Log Body */}
      <div className="flex-grow overflow-auto p-3 space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center h-full">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
              <Terminal className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No matching request logs found</p>
            <p className="text-[11px] text-slate-400 max-w-xs mt-1">
              {logs.length === 0 ? "API transactions will stream diagnostic logs inside this telemetry pane in real-time." : "Try adjusting your filter or search criteria."}
            </p>
          </div>
        ) : (
          filteredLogs.map((entry) => {
            const isExpanded = expandedLogId === entry.id;
            const logDate = new Date(entry.timestamp).toLocaleTimeString();
            return (
              <div 
                key={entry.id}
                id={`log-entry-${entry.id}`}
                className={`border rounded-xl transition-all duration-200 overflow-hidden bg-white dark:bg-slate-900/60 ${
                  isExpanded 
                    ? "border-slate-300 dark:border-slate-700 shadow-md ring-1 ring-slate-150 dark:ring-slate-800" 
                    : "border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {/* Accordion Trigger */}
                <div 
                  onClick={() => setExpandedLogId(isExpanded ? null : entry.id)}
                  className="p-3 flex items-center justify-between gap-3 cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex-shrink-0">{classifyErrorIcon(entry.errorType)}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono tracking-tight truncate">
                          {entry.endpoint}
                        </span>
                        <span className="text-[10px] text-slate-400">{logDate}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {entry.errorMessage || "Status OK • Execution normal"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 border rounded-full text-[10px] font-bold ${getBadgeStyle(entry.errorType)}`}>
                      {entry.status === 0 ? "Offline (0)" : entry.status}
                    </span>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 text-xs space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Error Banner if failed */}
                    {entry.errorType !== "success" && (
                      <div className="bg-rose-50/70 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 p-2.5 rounded-xl flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-widest text-[9px]">
                            Diagnosis Details ({entry.errorType} fault)
                          </p>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px] font-medium leading-relaxed mt-1">
                            {getRemedyMessage(entry)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* API Payload & raw details box */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-t-lg">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest">
                          <Code className="w-3.5 h-3.5" />
                          <span>Telemetry JSON Payload</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(JSON.stringify(entry, null, 2), entry.id);
                          }}
                          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md"
                        >
                          {copiedId === entry.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy JSON</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="font-mono text-[10px] leading-relaxed max-h-48 overflow-auto bg-slate-100 dark:bg-slate-800/80 p-3 rounded-b-lg text-slate-700 dark:text-slate-300 border-x border-b border-slate-200 dark:border-slate-700">
                        {JSON.stringify(entry, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
