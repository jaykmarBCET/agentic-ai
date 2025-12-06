"use client";

import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import CodeBlock from "@/components/CodeBlock"; // Your updated component
import { QuizCard } from "@/components/QuizCard"; // Your updated component

// --- Types ---
export interface IQuiz {
  question: string;
  options1: string;
  options2: string;
  options3: string;
  options4: string;
  currentAnswer: string;
}

interface IMessage {
  role: "user" | "assistant";
  type: "text" | "quiz" | "image" | "code";
  content: string | IQuiz[];
  language?: string;
}

export default function HomePage() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Load Memory ---
  useEffect(() => {
    const saved = localStorage.getItem("chat_memory");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse chat memory", e);
      }
    }
  }, []);

  // --- Save Memory ---
  useEffect(() => {
    localStorage.setItem("chat_memory", JSON.stringify(messages));
  }, [messages]);

  // --- Auto-scroll ---
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // --- Clear Chat ---
  const clearChat = () => {
    if (confirm("Clear all chat history?")) {
      setMessages([]);
      localStorage.removeItem("chat_memory");
    }
  };

  // --- Handler ---
  const handleGenerate = useCallback(async () => {
    if (!text.trim() || loading) return;

    // 1. Add User Message
    const userMsg: IMessage = { role: "user", type: "text", content: text };
    setMessages((prev) => [...prev, userMsg]);
    
    setLoading(true);
    const userPrompt = text;
    setText("");

    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      // 2. API Call
      const response = await axios.post("/api/server", {
        prompt: userPrompt,
        history: messages.map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : "[complex content]",
        })),
      });

      const result = response.data.result || response.data;

      // 3. Determine Response Type
      let newMsg: IMessage;

      if (result.quiz) {
        newMsg = { role: "assistant", type: "quiz", content: result.quiz };
      } else if (result.image) {
        newMsg = { role: "assistant", type: "image", content: result.image };
      } else if (result.type === "code") {
        newMsg = { 
          role: "assistant", 
          type: "code", 
          content: result.code, 
          language: result.language || "javascript" 
        };
      } else if (typeof result === "string") {
        newMsg = { role: "assistant", type: "text", content: result };
      } else {
        // Fallback
        newMsg = { 
          role: "assistant", 
          type: "text", 
          content: JSON.stringify(result, null, 2) 
        };
      }

      setMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", type: "text", content: "❌ I encountered an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [text, messages, loading]);

  // --- Handle Enter Key ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const sizeOfConversation = (data:any[])=>{
    const size = new Blob([JSON.stringify(data)]).size
    return size
  }

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 font-sans text-slate-900">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <BotIcon />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-slate-800">
            Walsis AI
          </h1>
        </div>
        <button 
          onClick={clearChat}
          className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
        >
          <TrashIcon />
          <span className="hidden sm:inline">Clear History</span>
        </button>
      </header>

      {/* --- MAIN CHAT AREA --- */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Welcome State */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl mb-2">
                <SparklesIcon />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">How can I help you today?</h2>
              <p className="text-slate-500 max-w-md">
                I can generate code, create quizzes, design UI components, or search the web for you.
              </p>
            </div>
          )}

          {/* Message List */}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {/* AI Avatar */}
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <BotIcon className="w-4 h-4 text-indigo-600" />
                </div>
              )}

              {/* Content Bubble */}
              <div className={`flex flex-col max-w-[90%] sm:max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                
                {/* --- TEXT --- */}
                {msg.type === "text" && (
                  <div
                    className={`px-5 py-3.5 rounded-2xl text-[15px] leading-7 shadow-sm ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white border border-slate-200 text-slate-700 rounded-bl-none"
                    }`}
                  >
                    <Markdown >{msg.content as string}</Markdown>
                  </div>
                )}

                {/* --- QUIZ --- */}
                {msg.type === "quiz" && (
                  <div className="w-full max-w-xl space-y-4">
                    <div className="bg-indigo-600 text-white px-4 py-2 rounded-t-xl text-sm font-bold shadow flex items-center gap-2">
                      <span>🎓</span> Generated Quiz
                    </div>
                    {(msg.content as IQuiz[]).map((q, i) => (
                      <QuizCard key={i} data={q} index={i} />
                    ))}
                  </div>
                )}

                {/* --- IMAGE --- */}
                {msg.type === "image" && (
                  <div className="group relative overflow-hidden rounded-2xl border-4 border-white shadow-lg max-w-sm">
                    <img
                      src={msg.content as string}
                      alt="AI Generated"
                      className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      Generated by AI
                    </div>
                  </div>
                )}

                {/* --- CODE --- */}
                {msg.type === "code" && (
                  <div className="w-full max-w-3xl">
                     {/* Ensure your CodeBlock handles just 'code' prop string */}
                     <CodeBlock 
                        code={msg.content as string} 
                        language={msg.language || 'javascript'} 
                     />
                  </div>
                )}

              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
             <div className="flex justify-start gap-4">
               <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <BotIcon className="w-4 h-4 text-indigo-600" />
               </div>
               <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
               </div>
             </div>
          )}
          
          <div ref={bottomRef} className="h-4" />
        </div>
      </main>

      {/* --- FOOTER INPUT --- */}
      <footer className="p-4 bg-white/80 backdrop-blur-sm border-t border-slate-200">
        <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:bg-white focus-within:border-blue-300 transition-all shadow-inner">
          
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              // Auto-grow
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for new line)"
            className="flex-1 max-h-[150px] bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 px-3 py-2 resize-none leading-relaxed"
            rows={1}
          />
          
          <button
            onClick={handleGenerate}
            disabled={loading || !text.trim() || sizeOfConversation(messages)>=15000}
            className="mb-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {sizeOfConversation(messages)>=15000?"Clear History":<SendIcon />}
          </button>
        </div>
        <div className="text-center mt-2">
            <span className="text-[10px] text-slate-400">AI can make mistakes. Check important info.</span>
        </div>
      </footer>
    </div>
  );
}

// --- Icons (SVG) ---

const BotIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7H10V5.73C9.4 5.39 9 4.74 9 4a2 2 0 012-2M7.5 13a1.5 1.5 0 100 3 1.5 1.5 0 000-3m9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3" />
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" >
        <path d="M9.8 12.7c-2.4-.6-5.8-3.4-6.3-5.8-.1-.4-.6-.4-.7 0-.5 2.4-3.9 5.2-6.3 5.8-.4.1-.4.6 0 .7 2.4.6 5.8 3.4 6.3 5.8.1.4.6.4.7 0 .5-2.4 3.9-5.2 6.3-5.8.4-.1.4-.6 0-.7zM18 10.5c-1.3-.3-3-1.8-3.3-3-.1-.2-.3-.2-.4 0-.3 1.2-2 2.7-3.3 3-.2 0-.2.3 0 .3 1.3.3 3 1.8 3.3 3 .1.2.3.2.4 0 .3-1.2 2-2.7 3.3-3 .2 0 .2-.3 0-.3z"/>
    </svg>
);