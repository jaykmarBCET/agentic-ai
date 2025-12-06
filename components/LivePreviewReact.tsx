"use client";

import { useEffect, useRef, useState } from "react";
import * as Babel from "@babel/standalone";

// Extend iframe window with external libs
interface IFrameWindow extends Window {
  React?: any;
  ReactDOM?: any;
  zustand?: any;
  ReactIconsFa?: Record<string, any>;
  ReactIconsAi?: Record<string, any>;
  axios?: any;
  dayjs?: any;
  _: any;
  motion?: any;
  console: Console;
  eval: (code: string) => any;
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
  const [key, setKey] = useState(0); // Used to force iframe refresh

  const pushLog = (type: "log" | "error", msg: string) => {
    setLogs((prev) => [...prev, { type, msg }]);
    if (type === "error") setIsConsoleOpen(true); // Auto-open on error
  };

  /** ============================
   * TRANSFORMATION LOGIC
   * ============================ */
  const transformPackages = (c: string): string => {
    // react-icons/fa
    c = c.replace(
      /import\s*{([^}]+)}\s*from\s*['"]react-icons\/fa['"]/g,
      (_match, items) => `const { ${items.trim()} } = ReactIconsFa;`
    );

    // react-icons/ai
    c = c.replace(
      /import\s*{([^}]+)}\s*from\s*['"]react-icons\/ai['"]/g,
      (_match, items) => `const { ${items.trim()} } = ReactIconsAi;`
    );

    // zustand
    c = c.replace(/import\s*{([^}]+)}\s*from\s*['"]zustand["']/g, () => {
      return `const { create } = zustand;`;
    });

    return c;
  };

  const transformReactCode = (rawCode: string): string => {
    let c = rawCode;

    // remove imports
    c = c.replace(/import[\s\S]*?['"].*?['"];?/g, "");
    c = c.replace(/export\s+default/g, "");

    c = transformPackages(c);

    // Convert hooks
    c = c
      .replace(/\buseState\b/g, "React.useState")
      .replace(/\buseEffect\b/g, "React.useEffect")
      .replace(/\buseRef\b/g, "React.useRef")
      .replace(/\buseMemo\b/g, "React.useMemo")
      .replace(/\buseCallback\b/g, "React.useCallback")
      .replace(/\buseReducer\b/g, "React.useReducer");

    // Detect component name
    const compMatch = c.match(/function\s+([A-Z]\w*)/);
    const compName = compMatch ? compMatch[1] : "App";

    return `
      ${c}

      try {
        const root = ReactDOM.createRoot(document.getElementById("root"));
        root.render(React.createElement(${compName}));
      } catch (e) {
        console.error(e);
      }
    `;
  };

  /** ============================
   * MAIN EFFECT
   * ============================ */
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow as IFrameWindow | null;

    if (!doc || !win) return;

    setLogs([]);

    // Patch console
    win.console.log = (...args: unknown[]) =>
      pushLog("log", args.join(" "));
    win.console.error = (...args: unknown[]) =>
      pushLog("error", args.join(" "));

    // Write HTML and load CDNs
    doc.open();
    doc.write(`
      <html>
        <head>
          <style>
            body { margin: 0; font-family: sans-serif; }
            ${css || ""}
          </style>

          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/zustand/umd/zustand.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/react-icons@4.12.0/fa/index.umd.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/react-icons@4.12.0/ai/index.umd.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/dayjs/dayjs.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/lodash/lodash.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/framer-motion/dist/framer-motion.umd.js"></script>
        </head>
        <body>
          <div id="root">${html || ""}</div>
        </body>
      </html>
    `);
    doc.close();

    iframe.onload = () => {
      try {
        const transformed = transformReactCode(code);
        const compiled = Babel.transform(transformed, {
          presets: ["react", "env"],
        }).code;

        win.eval(compiled || "");
      } catch (err) {
        pushLog("error", String(err));
      }
    };
  }, [code, css, html, key]); // Depend on 'key' to force re-renders

  const errorCount = logs.filter((l) => l.type === "error").length;

  return (
    <div className="w-full h-full flex flex-col bg-white">
      
      {/* --- PREVIEW HEADER --- */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-200">
        <div className="flex items-center gap-2">
           <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
             Browser Preview
           </span>
        </div>
        
        <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button 
                onClick={() => setKey(prev => prev + 1)}
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                title="Refresh Preview"
            >
                <RefreshIcon />
            </button>

            {/* Console Toggle */}
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

      {/* --- IFRAME AREA --- */}
      <div className="relative flex-1 min-h-[350px] bg-white">
        <iframe
          key={key}
          ref={iframeRef}
          className="w-full h-full absolute inset-0 border-none"
          sandbox="allow-scripts allow-same-origin"
          title="Live Preview"
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

// --- ICONS ---

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