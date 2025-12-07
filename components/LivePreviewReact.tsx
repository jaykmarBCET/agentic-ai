"use client";

import { useEffect, useRef, useState } from "react";
import * as Babel from "@babel/standalone";

// Extend iframe window with external libs
interface IFrameWindow extends Window {
  React?: any;
  ReactDOM?: any;
  Lucide?: any;
  Recharts?: any;
  motion?: any;
  _?: any; // Lodash
  dayjs?: any;
  console: Console;
  eval:any
}

export default function LivePreviewReact({
  code = "",
  css = "",
  html = "",
}: {
  code: string;
  css?: string;
  html?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [logs, setLogs] = useState<{ type: "log" | "error"; msg: string }[]>(
    []
  );
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [key, setKey] = useState(0);

  const pushLog = (type: "log" | "error", msg: string) => {
    setLogs((prev) => [...prev, { type, msg }]);
    if (type === "error") setIsConsoleOpen(true);
  };


  const transformCode = (rawCode: string): string => {
    let c = rawCode;

    // 1. Handle "export default" to capture the component
    // We replace "export default function App" or "export default () =>" 
    // with "window.RenderComponent =" so we know exactly what to render.
    if (c.includes("export default")) {
      c = c.replace(/export\s+default\s+/, "window.RenderComponent = ");
    } else {
      // Fallback: If no export default, try to find the last defined function
      // This is risky but helps if the AI forgets export default.
      // Ideally, the AI should always export default.
    }

    // 2. Remove standard React imports (we inject them globally later)
    c = c.replace(/import\s+React\s*(?:,\s*{[^}]*})?\s*from\s*['"]react['"];?/g, "");
    
    // 3. Transform Common Libraries (Shim imports to window globals)
    
    // Lucide React
    c = c.replace(
      /import\s*{([^}]+)}\s*from\s*['"]lucide-react['"];?/g,
      "const { $1 } = window.Lucide;"
    );

    // Recharts
    c = c.replace(
      /import\s*{([^}]+)}\s*from\s*['"]recharts['"];?/g,
      "const { $1 } = window.Recharts;"
    );

    // Framer Motion
    c = c.replace(
      /import\s*{([^}]+)}\s*from\s*['"]framer-motion['"];?/g,
      "const { $1 } = window.motion;"
    );
    
    // React Icons (General catch-all for fa, ai, bs, etc if loaded)
    // Note: You need to load specific CDN scripts for these to work perfectly, 
    // but this prevents the code from crashing on import.
    c = c.replace(/import\s*{([^}]+)}\s*from\s*['"]react-icons\/(\w+)['"];?/g, "");

    // 4. Remove any remaining imports to prevent "Require is not defined" errors
    // (This is a safety net. Variables might be undefined, but code won't crash on syntax)
    c = c.replace(/import\s+.*?from\s+['"].*?['"];?/g, "");

    return `
      // Inject Global Hooks so 'useState' works without React.useState
      const { useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext, createContext } = React;
      
      // Inject other globals if needed
      const { motion, AnimatePresence } = window.motion || {};

      ${c}

      // Render Logic
      try {
        const rootElement = document.getElementById("root");
        if (!window.RenderComponent) {
           throw new Error("No component found. Please ensure you use 'export default function...'");
        }
        
        // Check if root already exists (for HMR-like feel) or create new
        const root = ReactDOM.createRoot(rootElement);
        root.render(React.createElement(window.RenderComponent));
      } catch (e) {
        console.error("Render Error:", e.message);
      }
    `;
  };


  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Reset iframe to ensure clean slate
    // (We use the 'key' prop on the iframe in JSX to force full DOM reset)
    
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow as IFrameWindow | null;
    if (!doc || !win) return;

    setLogs([]); // Clear logs on new render

    // Patch Console
    win.console.log = (...args: unknown[]) => pushLog("log", args.join(" "));
    win.console.error = (...args: unknown[]) => pushLog("error", args.join(" "));

    // Setup HTML Document
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            /* Scrollbar styling for a cleaner look */
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
            ${css}
          </style>

          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          
          <script src="https://cdn.jsdelivr.net/npm/lodash/lodash.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/dayjs/dayjs.min.js"></script>
          
          <script src="https://unpkg.com/lucide@latest"></script> <script src="https://unpkg.com/recharts/umd/Recharts.js"></script> <script src="https://cdn.jsdelivr.net/npm/framer-motion@10.16.4/dist/framer-motion.js"></script> </head>
        <body>
          <div id="root">${html}</div>
          <script>
             // Fix for Recharts which sometimes looks for global Recharts object
             window.Recharts = window.Recharts || {};
          </script>
        </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Compile and Run
    iframe.onload = () => {
      if (!win.React || !win.ReactDOM) {
        pushLog("error", "React failed to load within the iframe.");
        return;
      }

      try {
        const transformed = transformCode(code);
      
        const compiled = Babel.transform(transformed, {
          presets: ["react", "env"],
          filename: "main.tsx", // Helps with error reporting
        }).code;

        win.eval(compiled || "");
      } catch (err: any) {
        pushLog("error", `Syntax/Compile Error: ${err.message}`);
      }
    };
  }, [code, css, html, key]);

  const errorCount = logs.filter((l) => l.type === "error").length;

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm">
      
      
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
           <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
             Live Preview
           </span>
        </div>
        
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setKey(prev => prev + 1)}
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                title="Refresh Preview"
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
                    <span className="flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[9px] rounded-full font-bold">
                        {errorCount}
                    </span>
                )}
            </button>
        </div>
      </div>

    
      <div className="relative flex-1 bg-white min-h-[400px]">
        <iframe
          key={key}
          ref={iframeRef}
          className="w-full h-full absolute inset-0 border-none"
          sandbox="allow-scripts allow-same-origin allow-popups allow-modals"
          title="Live Preview"
        />
      </div>

      
      {isConsoleOpen && (
        <div className="h-48 bg-[#1e1e1e] border-t border-slate-700 flex flex-col shadow-inner">
            <div className="flex items-center justify-between px-4 py-1.5 bg-[#2d2d2d] border-b border-black/20 select-none">
                <span className="text-[10px] uppercase text-slate-400 font-mono tracking-wider">Terminal Output</span>
                <button onClick={() => setLogs([])} className="text-[10px] text-slate-400 hover:text-white transition-colors">Clear</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 scroll-smooth">
                {logs.length === 0 ? (
                    <div className="text-slate-600 italic opacity-50">No output logs...</div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className={`flex gap-2.5 ${log.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                            <span className="opacity-40 select-none shrink-0">{log.type === 'error' ? '✖' : '➜'}</span>
                            <span className="break-all leading-relaxed whitespace-pre-wrap">{log.msg}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
      )}
    </div>
  );
}



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