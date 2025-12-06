"use client";

import { useMemo, useState, useEffect } from "react";

interface LivePreviewProps {
  html?: string;
  css?: string;
  js?: string;
}

export function LivePreview({ html = "", css = "", js = "" }: LivePreviewProps) {
  const [key, setKey] = useState(0); // Forces iframe refresh
  const [logs, setLogs] = useState<{ type: "log" | "error"; msg: string }[]>(
    []
  );
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  // --- 1. Construct the Iframe Content ---
  const srcDoc = useMemo(() => {
    // Script to capture console output and send to Parent
    const consolePatch = `
      <script>
        (function() {
          var _log = console.log;
          var _error = console.error;
          
          function send(type, args) {
            try {
              // Convert args to string safely
              var msg = Array.from(args).map(a => 
                typeof a === 'object' ? JSON.stringify(a) : String(a)
              ).join(' ');
              
              window.parent.postMessage({ source: 'iframe-log', type: type, msg: msg }, '*');
            } catch(e) {}
          }

          console.log = function() { send('log', arguments); _log.apply(console, arguments); };
          console.error = function() { send('error', arguments); _error.apply(console, arguments); };
          
          window.onerror = function(msg) {
             send('error', [msg]);
          };
        })();
      </script>
    `;

    // Detect if user provided a full HTML document
    const isFullHTML =
      html.trim().startsWith("<!DOCTYPE") ||
      html.trim().startsWith("<html");

    if (isFullHTML) {
      // Inject our console patch into the <head> of their document
      return html.replace("<head>", `<head>${consolePatch}`);
    }

    // Otherwise wrap their partials
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>body { font-family: sans-serif; }</style>
          <style>${css || ""}</style>
          ${consolePatch}
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          ${html}
          <script>
            try {
              ${js || ""}
            } catch (e) {
              console.error(e);
            }
          </script>
        </body>
      </html>
    `;
  }, [html, css, js]);

  // --- 2. Listen for Console Logs from Iframe ---
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.source === "iframe-log") {
        setLogs((prev) => [...prev, { type: e.data.type, msg: e.data.msg }]);
        if (e.data.type === "error") setIsConsoleOpen(true);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Clear logs when content changes or refreshed
  useEffect(() => {
    setLogs([]);
  }, [html, css, js, key]);

  const errorCount = logs.filter((l) => l.type === "error").length;

  return (
    <div className="w-full h-full flex flex-col bg-white">
      
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-200">
        <div className="flex items-center gap-2">
           <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
             HTML Preview
           </span>
        </div>
        
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setKey(k => k + 1)}
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                title="Refresh"
            >
                <RefreshIcon />
            </button>

            <button
                onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full transition-all border ${
                    isConsoleOpen 
                        ? "bg-slate-800 text-white border-slate-800" 
                        : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
                }`}
            >
                <TerminalIcon />
                <span>Console</span>
                {errorCount > 0 && (
                    <span className="flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[9px] rounded-full">
                        {errorCount}
                    </span>
                )}
            </button>
        </div>
      </div>

      {/* --- IFRAME --- */}
      <div className="relative flex-1 min-h-[350px] bg-white">
        <iframe
          key={key}
          className="w-full h-full absolute inset-0 border-none"
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-same-origin allow-modals"
          title="HTML Preview"
        />
      </div>

      {/* --- CONSOLE DRAWER --- */}
      {isConsoleOpen && (
        <div className="h-40 bg-[#1e1e1e] border-t border-slate-700 flex flex-col animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-black/20">
                <span className="text-[10px] uppercase text-slate-400 font-mono">Terminal Output</span>
                <button onClick={() => setLogs([])} className="text-[10px] text-slate-400 hover:text-white">Clear</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1">
                {logs.length === 0 ? (
                    <div className="text-slate-600 italic">No output...</div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className={`flex gap-2 ${log.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                            <span className="opacity-50 select-none">➤</span>
                            <span className="break-all">{log.msg}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
      )}
    </div>
  );
}

// --- SHARED ICONS (Keep these consistent) ---

const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 21h5v-5" />
    </svg>
);

const TerminalIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
);