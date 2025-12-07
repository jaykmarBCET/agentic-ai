import React from "react";

export interface VideoInfo {
  summary: string;
  questionAnswer?: string;
  videoUrl: string;
}

const getEmbedUrl = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const id = (match && match[2].length === 11) ? match[2] : null;
  return id ? `https://www.youtube.com/embed/${id}` : null;
};

export default function VideoSummaryCard({ data }: { data: VideoInfo }) {
  if (!data) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        
        {/* --- Left Side: Video Player --- */}
        <div className="bg-black relative group">
          <div className="relative pt-[56.25%] w-full h-full">
            <iframe
              src={getEmbedUrl(data.videoUrl) || ""}
              className="absolute top-0 left-0 w-full h-full"
              title="Video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {/* External Link Overlay (Optional) */}
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <a 
              href={data.videoUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-md hover:bg-red-700"
            >
              Watch on YouTube ↗
            </a>
          </div>
        </div>

        {/* --- Right Side: Summary Content --- */}
        <div className="p-6 md:p-8 flex flex-col gap-6 overflow-y-auto max-h-[600px]">
          
          {/* Summary Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
              📄 Video Summary
            </h2>
            <div className="prose prose-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {data.summary}
            </div>
          </div>

          {/* Q&A Section (Conditional) */}
          {data.questionAnswer && (
            <div className="bg-green-50 p-5 rounded-xl border border-green-100">
              <h3 className="text-sm font-bold text-green-900 mb-2 uppercase tracking-wide">
                Specific Answer
              </h3>
              <p className="text-green-800 text-sm leading-relaxed">
                {data.questionAnswer}
              </p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}