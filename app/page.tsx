'use client';
import axios from "axios";
import  { useCallback, useEffect, useRef, useState } from "react";
import Markdown from 'react-markdown'

// -------------------- INTERFACES --------------------

export interface IQuiz {
    question: string;
    options1: string;
    options2: string;
    options3: string;
    options4: string;
    currentAnswer: string;
}

// UPDATED: Added 'image' type
interface IMessage {
    role: "user" | "assistant";
    type: "text" | "quiz" | "image";
    content: string | IQuiz[];
}

// -------------------- QUIZ CARD COMPONENT (Unchanged) --------------------
const QuizCard = ({ data, index }: { data: IQuiz, index: number }) => {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    const getCorrectOptionText = () => {
        const ans = data.currentAnswer ? data.currentAnswer.toString().trim() : "";
        const allOptions = [data.options1, data.options2, data.options3, data.options4];
        if (/^[1-4]$/.test(ans)) {
            return allOptions[parseInt(ans) - 1];
        }
        if (ans.toLowerCase().startsWith("option")) {
             const match = ans.match(/\d/); 
             if (match) return allOptions[parseInt(match[0]) - 1];
        }
        const exactMatch = allOptions.find(opt => opt.toLowerCase() === ans.toLowerCase());
        if (exactMatch) return exactMatch;
        return ans;
    };

    const correctText = getCorrectOptionText();

    const handleSelect = (option: string) => {
        if (selectedOption) return;
        setSelectedOption(option);
        setIsCorrect(option.trim().toLowerCase() === correctText?.trim().toLowerCase());
    };

    const options = [data.options1, data.options2, data.options3, data.options4];

    return (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 mt-2 mb-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h3 className="font-bold text-gray-800 mb-4 text-sm md:text-base leading-relaxed">
                <span className="text-blue-600 mr-2">Q{index + 1}.</span>{data.question}
            </h3>
            <div className="flex flex-col gap-2">
                {options.map((opt, idx) => {
                    let btnClass = "p-3 text-left rounded-lg border transition-all text-sm font-medium relative overflow-hidden ";
                    if (selectedOption === opt) {
                        btnClass += isCorrect ? "bg-green-100 border-green-500 text-green-800 ring-1 ring-green-500" : "bg-red-100 border-red-500 text-red-800 ring-1 ring-red-500";
                    } else if (selectedOption && opt === correctText) {
                        btnClass += "bg-green-50 border-green-400 text-green-700 ring-2 ring-green-200";
                    } else {
                        btnClass += "bg-white hover:bg-gray-50 border-gray-200 text-gray-700 hover:border-blue-300 hover:shadow-sm";
                    }
                    return (
                        <button key={idx} onClick={() => handleSelect(opt)} disabled={!!selectedOption} className={btnClass}>
                            <span className="inline-block w-6 font-semibold opacity-50 text-xs uppercase">{String.fromCharCode(65 + idx)}</span>{opt}
                        </button>
                    );
                })}
            </div>
            {selectedOption && (
                <div className={`mt-3 p-3 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-2 animate-in zoom-in-95 duration-200 ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isCorrect ? <span>🎉 Correct Answer!</span> : <span>❌ The right answer is: <span className="underline">{correctText}</span></span>}
                </div>
            )}
        </div>
    );
};

// -------------------- MAIN PAGE --------------------

export default function HomePage() {
    const [text, setText] = useState("");
    const [messages, setMessages] = useState<IMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleGenerate = useCallback(async () => {
        if (!text.trim()) return;
        const userMsg: IMessage = { role: "user", type: "text", content: text };
        setMessages((prev) => [...prev, userMsg]);
        setLoading(true);
        setText("");

        try {
            // Lightweight history for context
            const history = messages.slice(-6).map(msg => ({
                role: msg.role,
                // Don't send huge quiz/image objects in history prompt
                content: msg.type === 'text' ? msg.content : `[Previous ${msg.type} generated]`
            }));

            // --- MAKE SURE THIS ENDPOINT IS CORRECT FOR YOUR SETUP ---
            const response = await axios.post("/api/server", { 
                prompt: text + "\n\n--- PREVIOUS CHAT HISTORY ---\n" + JSON.stringify(history) 
            });
            
            const apiResponse = response.data;
            const resultData = apiResponse.result || apiResponse; // Adapt based on your actual API return structure

            // --- UPDATED PARSING LOGIC ---
            
           
            if (resultData && resultData.quiz && Array.isArray(resultData.quiz)) {
                setMessages((prev) => [...prev, { role: "assistant", type: "quiz", content: resultData.quiz }]);
            } 
            
            else if (resultData && resultData.image && typeof resultData.image === 'string') {
                 setMessages((prev) => [...prev, { role: "assistant", type: "image", content: resultData.image }]);
            }
           
            else if (typeof resultData === 'string') {
                 setMessages((prev) => [...prev, { role: "assistant", type: "text", content: resultData }]);
            }
            
            else {
                const fallbackContent = JSON.stringify(resultData, null, 2);
                setMessages((prev) => [...prev, { role: "assistant", type: "text", content: fallbackContent }]);
            }

        } catch (error: any) {
            setMessages((prev) => [...prev, { role: "assistant", type: "text", content: "❌ Error due to high traffic or API issue. Please try again." }]);
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [text, messages]);

    return (
        <div className="h-screen w-full flex flex-col bg-slate-50 font-sans">
            {/* Header */}
            <div className="px-6 py-4 bg-white shadow-sm flex items-center justify-between border-b z-10 sticky top-0">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-2 rounded-lg text-white">
                       <span>🤖</span>
                    </div>
                    <span className="text-xl font-bold text-slate-800 tracking-tight">AI Multi-Agent</span>
                </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 sm:p-6 bg-slate-50 scroll-smooth">
                {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                        <span className="text-6xl mb-4">💡</span>
                        <p className="text-lg font-medium">Try asking for:</p>
                        <p className="text-sm">"A React quiz", "Write python code for...", or <span className="font-bold">"Draw a futuristic city"</span></p>
                      </div>
                )}

                {messages.map((msg, index) => (
                    <div key={index} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        
                        {/* Text Bubble */}
                        {msg.type === "text" && (
                            <div className={`max-w-[85%] md:max-w-[70%] px-5 py-3 rounded-2xl whitespace-pre-wrap text-sm shadow-sm leading-relaxed ${msg.role === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-white text-slate-700 rounded-bl-none border border-slate-100"}`}>
                                <Markdown>
                                {msg.content as string}
                                </Markdown>
                            </div>
                        )}

                        {/* Quiz Container */}
                        {msg.type === "quiz" && (
                            <div className="w-full max-w-xl animate-in slide-in-from-left-4 duration-300">
                                {/* Quiz header and card rendering (same as before) */}
                                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4 rounded-t-xl text-sm font-bold shadow-lg">🎓 Quiz Generated</div>
                                <div className="bg-slate-100 p-3 md:p-4 rounded-b-xl border border-slate-200 border-t-0 shadow-inner">
                                    {(msg.content as IQuiz[]).map((quizItem, qIndex) => (
                                        <QuizCard key={qIndex} data={quizItem} index={qIndex} />
                                    ))}
                                </div>
                            </div>
                        )}

                         {/* NEW IMAGE CONTAINER */}
                         {msg.type === "image" && (
                            <div className="w-full max-w-xl animate-in slide-in-from-left-4 duration-500">
                                <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">
                                     <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500 border-b flex items-center gap-2">
                                        <span>🎨</span> AI Generated Image
                                     </div>
                                     <div className="relative min-h-[200px] bg-slate-200 flex items-center justify-center">
                                         {/* Using standard img tag because Pollinations URLs are external */}
                                        <img 
                                            src={msg.content as string} 
                                            alt="AI Generated Content"
                                            className="w-full h-auto object-cover hover:opacity-95 transition-opacity"
                                            loading="lazy"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="p-4 text-red-500 text-sm">Failed to load image.</div>';
                                            }}
                                        />
                                     </div>
                                </div>
                            </div>
                        )}

                    </div>
                ))}

                {loading && (
                    <div className="flex items-center gap-2 text-slate-500 text-sm p-2 animate-pulse">
                        <span className="ml-2 font-medium">AI is thinking & generating...</span>
                    </div>
                )}
                <div ref={bottomRef} className="h-4" />
            </div>

            {/* Input Box */}
            <div className="p-4 bg-white border-t border-slate-200 flex gap-3 items-center shadow-lg relative z-20">
                <textarea
                    
                    
                    placeholder="Try: 'Generate an image of a red dragon'"
                    className="flex-1 px-5 py-3.5 rounded-full bg-slate-100 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner placeholder:text-slate-400"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    disabled={loading}
                />
                <button
                    className="p-3.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 active:scale-95 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed shadow-md"
                    onClick={handleGenerate}
                    disabled={loading || !text.trim()}
                >
                    Send
                </button>
            </div>
        </div>
    );
}