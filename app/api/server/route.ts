import { generateImageUrl, getVideoInfo } from "@/function";
import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Use a model known for good JSON support
const MODEL_NAME = "llama-3.3-70b-versatile"; 

// ---------------- GROQ HELPER ----------------

async function getGroqCompletion(messages: any[], jsonMode = false, temperature = 0.5) {
    try {
        const response = await groq.chat.completions.create({
            messages,
            model: MODEL_NAME,
            temperature,
            // Only enable JSON mode if requested
            response_format: jsonMode ? { type: "json_object" } : undefined,
        });
        return response.choices[0]?.message?.content || "";
    } catch (error) {
        console.error("Groq API Error:", error);
        throw error;
    }
}

function extractJSON(text: string): any {
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try { return JSON.parse(match[0]); }
        catch { return null; }
    }
}

// ---------------- HELPERS ----------------

function extractYouTubeID(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
}

// ---------------- FEATURES ----------------

export const generateQuiz = async (prompt: string) => {
    let topic = prompt;
    const clean = prompt.trim().toLowerCase();

    if (clean.length < 3 || clean === "quiz" || clean === "make quiz") {
        topic = "General Knowledge";
    }

    // FIX: Added "JSON" keyword explicitly below
    const sys = `
    You are a Quiz Generator API. Topic: "${topic}".
    Output valid JSON only.
    Generate 5 MCQs strictly in this JSON format:
    {
        "quiz":[
            {
                "question":"...",
                "options1":"...",
                "options2":"...",
                "options3":"...",
                "options4":"...",
                "currentAnswer":"..."
            }
        ]
    }
    `;

    const content = await getGroqCompletion([{ role: "user", content: sys }], true);
    const parsed = extractJSON(content);
    return parsed?.quiz ? parsed : { quiz: [] };
};

export const generateCode = async (prompt: string) => {
    const sys = `Write production-ready code for: ${prompt}. Return ONLY raw code. No markdown tags.No extra just pure code also dont include \`\`\`jsx and other extension`;
    const code = await getGroqCompletion([{ role: "user", content: sys }], false, 0.1);
    return { type: "code", language: "javascript", code: code.trim() };
};

export const generateNotes = async (prompt: string) => {
    const sys = `Create structured study notes for "${prompt}" using markdown with headings + bullet points.`;
    return await getGroqCompletion([{ role: "user", content: sys }]);
};

export const webSearch = async (prompt: string) => {
    return await getGroqCompletion([{ role: "user", content: `Provide factual summary about: ${prompt}` }]);
};

export const generateImage = async (prompt: string) => {
    const imageUrl = await generateImageUrl(prompt);
    return { image: imageUrl };
};

const generateChatResponse = async (prompt: string, history: any[]) => {
    return await getGroqCompletion([
        { role: "system", content: "You are a helpful AI assistant." },
        ...history,
        { role: "user", content: prompt }
    ]);
};

// ---------------- VIDEO FEATURE ----------------

const generateVideoResponse = async (prompt: string, history: any[]) => {
    try {
        const videoId = extractYouTubeID(prompt);
        if (!videoId) return "Invalid YouTube link.";

        const info = await getVideoInfo(videoId);
        if (!info) return "Transcript unavailable.";

        // FIX: Added "JSON" keyword explicitly below
        const response = await getGroqCompletion([
            {
                role: "system",
                content: "You are a YouTube video summarizer. Analyze transcript + metadata. Output JSON only."
            },
            ...history.slice(-2),
            {
                role: "user",
                content: `
                # YouTube Data
                ${JSON.stringify(info).slice(0, 15000)}

                # User Request
                ${prompt}

                Return valid JSON:
                {
                    "summary": "...",
                    "questionAnswer": "...",
                    "videoUrl": "https://www.youtube.com/watch?v=${videoId}"
                }
                `
            }
        ], true);

        // FIX: Return the extracted object directly (removed { videoData: ... } wrapper)
        return  {videoData:extractJSON(response)}

    } catch (e) {
        console.error("Video Gen Error", e);
        return "Failed to analyze video.";
    }
};

// ---------------- ROUTER ----------------

export async function POST(req: Request) {
    const { prompt, history } = await req.json();

    const cleanHistory = history.map((m: any) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : "[media]"
    }));

    const context = cleanHistory.slice(-3);

    // FIX: Ensure "JSON" keyword is present in instructions
    const routingInstructions = `
    You are Walsis AI — an intent classifier.
    Ignore old context. Analyze ONLY "Current Message".

    FUNCTION MAPPING:
    - Quiz / MCQ / Test → generateQuiz
    - Image / Picture → generateImage
    - Code / Function / Script → generateCode
    - Notes / Study / Explain / Summary → generateNotes
    - Search / Fact / Lookup → webSearch
    - YouTube Link / Video → generateVideoResponse
    - PDF content detected → pdfSummary
    - Question about PDF → pdfQnA
    - Otherwise → self

    Return ONLY JSON:
    { "function": "...", "prompt": "..." }

    Current Message: "${prompt}"
    `;

    try {
        const routeResponse = await getGroqCompletion(
            [{ role: "system", content: routingInstructions }, ...context],
            true,
            0.1
        );

        const data = extractJSON(routeResponse);
        const fn = data?.function || "self";
        const refinedPrompt = data?.prompt || prompt;

        console.log(`Router: "${prompt}" -> ${fn}`);

        let result;
        switch (fn) {
            case "generateQuiz": result = await generateQuiz(refinedPrompt); break;
            case "generateCode": result = await generateCode(refinedPrompt); break;
            case "generateNotes": result = await generateNotes(refinedPrompt); break;
            case "webSearch": result = await webSearch(refinedPrompt); break;
            case "generateImage": result = await generateImage(refinedPrompt); break;
            case "generateVideoResponse": result = await generateVideoResponse(refinedPrompt, cleanHistory); break;
            default: result = await generateChatResponse(prompt, cleanHistory); break;
        }

        return Response.json({ result });

    } catch (err: any) {
        console.error("Router Error:", err);
        return Response.json({ result: "Error processing request." });
    }
}