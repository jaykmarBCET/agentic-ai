"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { LivePreview } from "./LivePreview";
import LivePreviewReact from "./LivePreviewReact";
import { useState } from "react";

export default function CodeBlock({
  code,
  language = "javascript",
}: {
  code: string;
  language?: string;
}) {
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [copied, setCopied] = useState(false);

  // --- Logic to detect React ---
  let isReact =
    code.includes("ReactDOM.render") ||
    code.includes("React.use") ||
    code.includes("useState(") ||
    /function\s+[A-Z]/.test(code); 

  if (
    code.trim().startsWith("<!DOCTYPE") ||
    code.trim().startsWith("<html") ||
    code.includes("<head>") ||
    code.includes("<body>")
  ) {
    isReact = false;
  }

  // --- Handlers ---
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden my-6 border border-slate-800 shadow-2xl bg-[#1e1e1e]">
      
      {/* ---------------- HEADER ---------------- */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-slate-800">
        
        {/* Left: Window Controls + Language */}
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            {language}
          </span>
        </div>

        {/* Right: Controls (Tabs + Copy) */}
        <div className="flex items-center gap-2">
          {/* Toggle Tabs */}
          <div className="flex bg-slate-900/50 rounded-lg p-1 border border-slate-800/50">
            <button
              onClick={() => setActiveTab("code")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                activeTab === "code"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Code
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                activeTab === "preview"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Preview
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 ml-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-all"
          >
            {copied ? (
              <>
                <CheckIcon />
                <span>Copied</span>
              </>
            ) : (
              <>
                <CopyIcon />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ---------------- CONTENT ---------------- */}
      <div className="relative w-full transition-all duration-300 ease-in-out">
        
        {/* Code View */}
        <div
          className={`${
            activeTab === "code" ? "opacity-100 block" : "opacity-0 hidden"
          } transition-opacity duration-300`}
        >
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            customStyle={{
              margin: 0,
              padding: "1.5rem",
              background: "transparent",
              fontSize: "0.9rem",
              lineHeight: "1.5",
            }}
            wrapLongLines
            showLineNumbers={true}
            lineNumberStyle={{ minWidth: "2.5em", paddingRight: "1em", color: "#5c6370" }}
          >
            {code}
          </SyntaxHighlighter>
        </div>

        {/* Preview View */}
        <div
          className={`${
            activeTab === "preview" ? "opacity-100 block" : "opacity-0 hidden"
          } min-h-[200px] bg-white text-slate-900 transition-opacity duration-300`}
        >
          <div className="p-4 h-full w-full overflow-auto">
            {isReact ? (
              <LivePreviewReact code={code} />
            ) : (
              <LivePreview html={code} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}


const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);