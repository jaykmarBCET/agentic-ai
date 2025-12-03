import axios from "axios";


export interface Quiz {
    question: string;
    options1: string;
    options2: string;
    options3: string;
    options4: string;
    currentAnswer: string;
}

export interface QuizResponseInterface {
    quiz: Quiz[];
}


export interface ImageResponseInterface {
    image: string;
}


const BASE_TEXT = "https://text.pollinations.ai";
const BASE_IMAGE = "https://image.pollinations.ai";

function extractJSON(text: string): any {
    if (typeof text === 'object') return text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
}


export const generateQuiz = async (prompt: string): Promise<QuizResponseInterface> => {
    const finalPrompt = `
    Generate a quiz in JSON array format based on this topic: "${prompt}".
    Structure: { "quiz": [{ "question": "...", "options1": "...", "options2": "...", "options3": "...", "options4": "...", "currentAnswer": "..." }] }
    IMPORTANT: Return ONLY valid JSON. No markdown formatting.
    `;
    try {
        const res = await axios.get(`${BASE_TEXT}/${encodeURIComponent(finalPrompt)}`);
        const parsed = extractJSON(res.data);
        return parsed && parsed.quiz ? parsed : { quiz: [] };
    } catch (e) { return { quiz: [] }; }
};

export const generateCode = async (prompt: string): Promise<string> => {
    const finalPrompt = `Write clean, production-ready code for: ${prompt}. Return ONLY the code. No markdown.`;
    const res = await axios.get(`${BASE_TEXT}/${encodeURIComponent(finalPrompt)}`);
    return res.data;
};

export const webSearch = async (prompt: string) => {
    const finalPrompt = `Act as a search engine. Summarize key information about: ${prompt}`;
    const res = await axios.get(`${BASE_TEXT}/${encodeURIComponent(finalPrompt)}`);
    return res.data;
};

export const generateNotes = async (prompt: string) => {
    const finalPrompt = `Create effective study notes for: ${prompt}. Format: Bullet points, concise, exam keywords.`;
    const res = await axios.get(`${BASE_TEXT}/${encodeURIComponent(finalPrompt)}`);
    return res.data;
};


export const generateImage = async (prompt: string) : Promise<string> => {
    
    const randomSeed = Math.floor(Math.random() * 10000);
    return `${BASE_IMAGE}/prompt/${encodeURIComponent(prompt)}?seed=${randomSeed}&width=1024&height=768&nologo=true`;
};


const generateChatResponse = async (prompt: string) => {
    const finalPrompt = `You are a helpful AI Tutor. User message: "${prompt}". Instructions: If user asks about this app, say you help with Quizzes, Coding, and Images. Keep answers short (<50 words). Hinglish is okay.`;
    const res = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(finalPrompt)}`);
    return res.data;
};


export default async function generateMain(userPrompt: string) {
    // UPDATED PROMPT to include image generation capabilities
    const routingPrompt = `
    You are "AI Agent", a smart teaching and creative assistant. 
    
    YOUR CAPABILITIES:
    1. generating quizzes (Aptitude, Coding).
    2. writing code.
    3. study notes/web search.
    4. generating images (pictures, drawings, photos).
    5. general chat ("self").

    RULES:
    - If user asks to "draw", "paint", "create an image of", or "a picture of X", use "generateImage".
    - If user asks "What can you do?", use "self".

    Analyze User Input: "${userPrompt}"

    Return ONLY JSON (No Markdown):
    {
      "function": "generateQuiz" | "generateCode" | "webSearch" | "generateNotes" | "generateImage" | "self",
      "prompt": "optimized_prompt_for_the_function"
    }
    `;

    try {
        const response = await axios.get(
            `https://text.pollinations.ai/${encodeURIComponent(routingPrompt)}`,
            { headers: { "Content-Type": "application/json" } }
        );

        const decisionData = extractJSON(response.data);

        if (!decisionData || !decisionData.function) {
            return { error: "Could not decide intent." };
        }

        

        switch (decisionData.function) {
            case "generateQuiz":  return await generateQuiz(decisionData.prompt);
            case "generateCode":  return await generateCode(decisionData.prompt);
            case "webSearch":     return await webSearch(decisionData.prompt);
            case "generateNotes": return await generateNotes(decisionData.prompt);
            case "self":          return await generateChatResponse(userPrompt); 
            
            // NEW CASE: Image Generation
            case "generateImage": {
                const imageUrl = await generateImage(decisionData.prompt);
                // Wrap the URL in an object so the frontend knows it's an image
                return { image: imageUrl };
            }
                
            default:
                return { error: "Unknown function returned" };
        }

    } catch (err) {
        console.error("Backend Error:", err);
        return { error: "Decision model failed" };
    }
}