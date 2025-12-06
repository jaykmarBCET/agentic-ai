import Groq from "groq-sdk";



const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const MODEL_NAME = "llama-3.3-70b-versatile"; 
const BASE_IMAGE = "https://image.pollinations.ai";


async function getGroqCompletion(messages: any[], jsonMode = false, temperature = 0.5) {
    try {
        const response = await groq.chat.completions.create({
            messages: messages,
            model: MODEL_NAME,
            temperature: temperature,
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
        if (match) {
            try { return JSON.parse(match[0]); } catch { return null; }
        }
        return null;
    }
}

// ------------------ FEATURES ------------------

export const generateQuiz = async (prompt: string) => {
    let topic = prompt;
    const cleanPrompt = prompt.toLowerCase().trim();
    if (cleanPrompt.length < 5 || cleanPrompt.includes("quiz")) {
        topic = "General Knowledge";
    }

    const systemPrompt = `
    You are a Quiz Generator API. Topic: "${topic}"
    Generate 5 MCQs in strict JSON format:
    { "quiz": [{ "question": "...", "options1": "...", "options2": "...", "options3": "...", "options4": "...", "currentAnswer": "..." }] }
    `;

    try {
        const content = await getGroqCompletion([{ role: "user", content: systemPrompt }], true);
        const parsed = extractJSON(content);
        return parsed?.quiz ? parsed : { quiz: [] };
    } catch { return { quiz: [] }; }
};

export const generateCode = async (prompt: string) => {
    const systemPrompt = `Write clean, production-ready code for: ${prompt}. Return ONLY code. No markdown. and also no \`\`\`jsx,html or tsx ..ect \`\`\``;
    const content = await getGroqCompletion([{ role: "user", content: systemPrompt }], false, 0.1);
    return { type: "code", language: "javascript", code: content.trim() };
};

export const generateNotes = async (prompt: string) => {
    const systemPrompt = `
    Create clear, structured study notes for: "${prompt}".
    Use Markdown with bold headers and bullet points.
    `;
    return await getGroqCompletion([{ role: "user", content: systemPrompt }]);
};

export const webSearch = async (prompt: string) => {
    const systemPrompt = `Provide a factual summary about: "${prompt}".`;
    return await getGroqCompletion([{ role: "user", content: systemPrompt }]);
};

export const generateImage = async (prompt: string) => {
    const seed = Math.floor(Math.random() * 10000);
    // Remove command words to get the pure subject
    const cleanPrompt = encodeURIComponent(
        prompt.replace(/generate|create|make|image|picture|photo|draw|of/gi, "").trim()
    );
    return { image: `${BASE_IMAGE}/prompt/${cleanPrompt}?seed=${seed}&width=1024&height=768&nologo=true` };
};

const generateChatResponse = async (prompt: string, history: any[]) => {
    return await getGroqCompletion([
        { role: "system", content: "You are a helpful AI assistant." },
        ...history,
        { role: "user", content: prompt }
    ]);
};

// ----------------- MAIN ROUTER (THE FIX) -----------------

export async function POST(req: Request) {
    const { prompt, history } = await req.json();

    
    const recentHistory = history.slice(-1).map((m: any) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : "[media content]"
    }));

    const routingInstructions = `
    You are an Intent Classifier.
    Analyze the "Current Message" and map it to a function.
    your name is Walsis AI
    
    CRITICAL RULE: Ignore previous conversation context. Focus ONLY on the Current Message.

    MAPPING:
    - "Quiz", "MCQ", "Test" -> "generateQuiz"
    - "Image", "Picture", "Photo", "Draw" -> "generateImage"
    - "Code", "Function", "Script", "React", "HTML" -> "generateCode"
    - "Notes", "Study", "Explain", "Summary" -> "generateNotes"
    - "Search", "Fact", "Who is" -> "webSearch"
    - "Hello", "Hi", "Question" -> "self"

    Current Message: "${prompt}"

    Return JSON: { "function": "...", "prompt": "..." }
    `;

    try {
        const routeResponse = await getGroqCompletion(
            [
                // Put the instructions FIRST so Llama prioritizes them over history
                { role: "system", content: routingInstructions },
                ...recentHistory
            ],
            true, // JSON Mode
            0.1   // Low Temp = Strict Logic
        );

        const data = extractJSON(routeResponse);
        const selectedFunction = data?.function || "self";
        const refinedPrompt = data?.prompt || prompt;

        console.log(`Router: "${prompt}" -> ${selectedFunction}`);

        let result;
        switch (selectedFunction) {
            case "generateQuiz": result = await generateQuiz(refinedPrompt); break;
            case "generateCode": result = await generateCode(refinedPrompt); break;
            case "generateNotes": result = await generateNotes(refinedPrompt); break;
            case "webSearch": result = await webSearch(refinedPrompt); break;
            case "generateImage": result = await generateImage(refinedPrompt); break;
            case "self": 
            default: result = await generateChatResponse(prompt, history); break;
        }

        return Response.json({ result });

    } catch (err: any) {
        console.error("Router Error:", err.message);
        return Response.json({ result: "Error processing request." });
    }
}