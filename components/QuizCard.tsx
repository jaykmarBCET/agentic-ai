"use client";

import { useState, useMemo } from "react";
import { IQuiz } from "@/app/page";

export const QuizCard = ({ data, index }: { data: IQuiz; index: number }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Robustly determine the correct answer string
  const correctOption = useMemo(() => {
    const ans = data.currentAnswer ? data.currentAnswer.toString().trim() : "";
    const opts = [data.options1, data.options2, data.options3, data.options4];

    // Case: "1", "2", "3", "4"
    if (/^[1-4]$/.test(ans)) return opts[parseInt(ans) - 1];

    // Case: "Option 1", "Option A"
    if (ans.toLowerCase().startsWith("option")) {
      const num = ans.match(/\d/);
      if (num) return opts[parseInt(num[0]) - 1];
    }

    // Case: Direct match
    return opts.find((o) => o.toLowerCase() === ans.toLowerCase()) || ans;
  }, [data]);

  const handleSelect = (opt: string) => {
    if (selected) return; // Prevent changing selection
    setSelected(opt);
    setIsCorrect(opt.trim().toLowerCase() === correctOption.trim().toLowerCase());
  };

  const options = [data.options1, data.options2, data.options3, data.options4];

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      
      {/* --- Header & Question --- */}
      <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-sm shadow-sm">
            {index + 1}
          </div>
          <h3 className="text-slate-800 font-semibold text-base md:text-lg leading-relaxed pt-0.5">
            {data.question}
          </h3>
        </div>
      </div>

      {/* --- Options Area --- */}
      <div className="p-4 md:p-6 flex flex-col gap-3">
        {options.map((opt, idx) => {
          const isSelected = selected === opt;
          const isRightAnswer = opt === correctOption;
          
          // Determine styling state
          let btnClass =
            "relative group flex items-center gap-3 w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ";

          if (selected) {
            // -- Revealed State --
            if (isSelected) {
              btnClass += isCorrect
                ? "border-emerald-500 bg-emerald-50 text-emerald-900" // User Selected Correct
                : "border-red-500 bg-red-50 text-red-900"; // User Selected Wrong
            } else if (isRightAnswer) {
              btnClass += "border-emerald-500 bg-emerald-50/50 text-emerald-900 border-dashed"; // Missed Correct Answer
            } else {
              btnClass += "border-slate-100 text-slate-400 opacity-50"; // Irrelevant options
            }
          } else {
            // -- Default State --
            btnClass +=
              "border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50 hover:shadow-sm text-slate-700";
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(opt)}
              disabled={!!selected}
              className={btnClass}
            >
              {/* Option Letter (A, B, C...) */}
              <span
                className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-xs font-bold uppercase transition-colors ${
                  isSelected || (selected && isRightAnswer)
                    ? "bg-black/10"
                    : "bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600"
                }`}
              >
                {String.fromCharCode(65 + idx)}
              </span>

              {/* Text */}
              <span className="flex-1 font-medium text-sm md:text-base">{opt}</span>

              {/* Status Icon (Hidden unless revealed) */}
              {selected && (
                <div className="animate-in zoom-in duration-200">
                  {isSelected && isCorrect && <CheckIcon />}
                  {isSelected && !isCorrect && <CrossIcon />}
                  {!isSelected && isRightAnswer && <CheckIcon muted />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* --- Feedback Footer --- */}
      {selected && (
        <div
          className={`px-6 py-3 text-sm font-semibold flex items-center justify-center gap-2 animate-in slide-in-from-top-2 ${
            isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
          }`}
        >
          {isCorrect ? (
            <>
              <span>🎉</span>
              <span>Correct! Great job.</span>
            </>
          ) : (
            <>
              <span>❌</span>
              <span>Incorrect. The right answer was option above.</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// --- Icons ---

const CheckIcon = ({ muted = false }: { muted?: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`w-5 h-5 ${muted ? "text-emerald-500/60" : "text-emerald-600"}`}
  >
    <path
      fillRule="evenodd"
      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
      clipRule="evenodd"
    />
  </svg>
);

const CrossIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-5 h-5 text-red-600"
  >
    <path
      fillRule="evenodd"
      d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z"
      clipRule="evenodd"
    />
  </svg>
);