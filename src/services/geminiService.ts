import { GoogleGenAI, Type } from "@google/genai";
import type { ChatMessage, Flashcard, StudyBlock, GraphNode, GraphEdge, GroundingChunk, QuizQuestion, QuestionType, EssayGrade, CalEvent, ScheduledStudyBlock } from '../types';

// The API key is read directly from the environment variable 'API_KEY'.
// For deployments on platforms like Vercel, set this in your project's environment variable settings.
if (!process.env.API_KEY) {
    console.warn(
      "Gemini API key is not found. The application will not be able to connect to the Gemini API. " +
      "Ensure the 'API_KEY' environment variable is set in your hosting environment (e.g., Vercel project settings)."
    );
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const STREAMING_MODEL = 'gemini-flash-latest';
const GROUNDING_MODEL = 'gemini-2.5-flash';
const COMPLEX_TASK_MODEL = 'gemini-2.5-pro';
const IMAGE_MODEL = 'gemini-2.5-flash';

/**
 * Gets a streaming chat response from Gemini.
 * @param history The previous chat messages.
 * @param newMessage The new message from the user.
 * @param useGrounding Whether to use Google Search grounding.
 * @yields The model's response chunks including text and grounding information.
 */
export async function* getChatResponseStream(history: ChatMessage[], newMessage: string, useGrounding: boolean) {
    try {
        const contents = history
            .filter(msg => msg.parts[0].text)
            .map(({ role, parts }) => ({ role, parts }));
        contents.push({ role: 'user' as const, parts: [{ text: newMessage }] });

        const modelToUse = useGrounding ? GROUNDING_MODEL : STREAMING_MODEL;
        const toolsConfig = useGrounding ? [{ googleSearch: {} }] : undefined;

        const responseStream = await ai.models.generateContentStream({
            model: modelToUse,
            contents: contents,
            config: {
                tools: toolsConfig,
            },
        });

        for await (const chunk of responseStream) {
            const text = chunk.text;
            const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
            yield { text, groundingChunks };
        }
    } catch (error) {
        console.error("Error getting chat stream response:", error);
        throw new Error("Failed to get a streaming response from Focus.Ai. Please try again.");
    }
}


/**
 * Gets a direct response from Gemini for a single query using Google Search grounding.
 * @param query The user's search query.
 * @returns An object containing the model's text response and grounding information.
 */
export const getGoogleSearchResponse = async (query: string) => {
    if (!query.trim()) {
        throw new Error("Query cannot be empty.");
    }
    try {
        const prompt = `Based on the latest information from Google Search, provide a very concise, one-sentence summary for the following query: "${query}"`;
        
        const response = await ai.models.generateContent({
            model: GROUNDING_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const text = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

        return { text, groundingChunks };
    } catch (error) {
        console.error("Error getting Google Search response:", error);
        throw new Error("Failed to get a response from Google Search. Please try again.");
    }
}


/**
 * Summarizes a given text using a fast, streaming model.
 * @param textToSummarize The text to be summarized.
 * @yields The summarized text chunks.
 */
export async function* summarizeTextStream(textToSummarize: string) {
    if (!textToSummarize.trim()) {
        throw new Error("Cannot summarize empty text.");
    }
    try {
        const prompt = `Please provide a concise summary of the following text, highlighting the key points:\n\n---\n\n${textToSummarize}`;
        
        const responseStream = await ai.models.generateContentStream({
            model: STREAMING_MODEL,
            contents: prompt,
        });
        
        for await (const chunk of responseStream) {
            if(chunk.text) yield chunk.text;
        }
    } catch (error) {
        console.error("Error summarizing text:", error);
        throw new Error("Failed to summarize the text. Please try again.");
    }
};

/**
 * Summarizes an uploaded document using a streaming model.
 * @param fileData The file data as base64 string and mimeType.
 * @yields The summarized text chunks.
 */
export async function* summarizeDocumentStream(fileData: { mimeType: string; data: string }) {
    if (!fileData.data) {
        throw new Error("Cannot summarize an empty document.");
    }
    try {
        const prompt = "Provide a concise, easy-to-read summary of the key points and main arguments in this document. Use bullet points for clarity.";
        
        const responseStream = await ai.models.generateContentStream({
            model: STREAMING_MODEL,
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: { mimeType: fileData.mimeType, data: fileData.data } },
                    { text: prompt }
                ]
            }],
        });
        
        for await (const chunk of responseStream) {
            if(chunk.text) yield chunk.text;
        }
    } catch (error) {
        console.error("Error summarizing document:", error);
        throw new Error("Failed to summarize the document. The file format may not be supported. Please try again.");
    }
};


/**
 * Gets a streaming coaching response about a document from Gemini.
 * @param fileData The file data as base64 string and mimeType.
 * @param history The previous chat messages.
 * @param newMessage The new message from the user.
 * @yields The model's text response chunks.
 */
export async function* getChatResponseFromDocumentStream(
    fileData: { mimeType: string; data: string },
    history: ChatMessage[], 
    newMessage: string
) {
    try {
        const systemInstruction = "You are an academic coach named Focus.Ai. A student has provided a document and will ask questions. Your primary role is to guide them to discover answers within the text themselves, not to provide direct answers. Ask leading questions, suggest sections to re-read, and help them think critically. If asked for a definition, ask them to find it in the text. Your tone must be encouraging, supportive, and Socratic, empowering the student to learn independently.";

        const contents: any[] = [];
        
        contents.push({
            role: 'user',
            parts: [
                { inlineData: { mimeType: fileData.mimeType, data: fileData.data } },
                { text: "This is the document I'm studying. Please act as my coach based on your instructions. My first question will follow." }
            ]
        });

        contents.push({
            role: 'model',
            parts: [{ text: "I have the document. I'm ready to help you explore it. What's your first question?" }]
        });

        history.forEach(msg => {
            contents.push({ role: msg.role, parts: msg.parts });
        });
        
        contents.push({ role: 'user', parts: [{ text: newMessage }] });

        const responseStream = await ai.models.generateContentStream({
            model: STREAMING_MODEL,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
            },
        });

        for await (const chunk of responseStream) {
            if (chunk.text) {
                yield chunk.text;
            }
        }
    } catch (error) {
        console.error("Error getting document chat stream response:", error);
        throw new Error("Failed to get a streaming response from Focus.Ai. Please try again.");
    }
};

/**
 * Analyzes an image and gets a streaming response.
 * @param imageData The image data as base64 string and mimeType.
 * @param prompt The user's question about the image.
 * @yields The model's text response chunks.
 */
export async function* analyzeImageStream(imageData: { mimeType: string; data: string }, prompt: string) {
    if (!imageData.data) {
        throw new Error("Cannot analyze an empty image.");
    }
     try {
        const responseStream = await ai.models.generateContentStream({
            model: IMAGE_MODEL,
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: { mimeType: imageData.mimeType, data: imageData.data } },
                    { text: prompt }
                ]
            }],
        });
        
        for await (const chunk of responseStream) {
            if(chunk.text) yield chunk.text;
        }
    } catch (error) {
        console.error("Error analyzing image:", error);
        throw new Error("Failed to analyze the image. The file format may not be supported. Please try again.");
    }
}

/**
 * Generates flashcards from a given text.
 * @param text The source text for flashcards.
 * @returns A promise that resolves to an array of flashcard objects.
 */
export const generateFlashcards = async (text: string): Promise<Flashcard[]> => {
    if (!text.trim()) {
        throw new Error("Cannot generate flashcards from empty text.");
    }
    try {
        const prompt = `Based on the following text, generate a set of flashcards. Each flashcard should have a clear question and a concise answer. Focus on the key concepts, definitions, and important facts presented in the text.\n\n---\n\n${text}`;
        
        const response = await ai.models.generateContent({
            model: COMPLEX_TASK_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: {
                                type: Type.STRING,
                                description: "The question or term for the front of the flashcard."
                            },
                            answer: {
                                type: Type.STRING,
                                description: "The answer or definition for the back of the flashcard."
                            }
                        },
                        required: ["question", "answer"]
                    }
                },
                thinkingConfig: { thinkingBudget: 32768 },
            }
        });
        
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error generating flashcards:", error);
        throw new Error("Failed to generate flashcards. Please try again with a different text.");
    }
};

export const generateFlashcardsFromDoc = async (fileData: { mimeType: string; data: string }): Promise<Flashcard[]> => {
    if (!fileData.data) {
        throw new Error("Cannot generate flashcards from an empty document.");
    }
    try {
        const prompt = `Based on the provided document, generate a set of flashcards. Each flashcard should have a clear question on the front and a concise answer on the back. Focus on the key concepts, definitions, and important facts.`;
        
        const response = await ai.models.generateContent({
            model: COMPLEX_TASK_MODEL,
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: { mimeType: fileData.mimeType, data: fileData.data } },
                    { text: prompt }
                ]
            }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING, description: "The question for the front of the flashcard." },
                            answer: { type: Type.STRING, description: "The answer for the back of the flashcard." }
                        },
                        required: ["question", "answer"]
                    }
                },
                thinkingConfig: { thinkingBudget: 32768 },
            }
        });
        
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error generating flashcards from document:", error);
        throw new Error("Failed to generate flashcards from the document.");
    }
};


export type NoteAction = 'summarize' | 'elaborate' | 'proofread' | 'rephrase-formal' | 'rephrase-casual' | 'find-action-items';

export async function* processNoteContentStream(text: string, action: NoteAction) {
    if (!text.trim()) {
        throw new Error("Cannot process empty text.");
    }
    
    let prompt = '';
    switch(action) {
        case 'summarize':
            prompt = `Summarize the following text concisely:\n\n---\n\n${text}`;
            break;
        case 'elaborate':
            prompt = `Elaborate on the following point, adding more detail and context:\n\n---\n\n${text}`;
            break;
        case 'proofread':
            prompt = `Proofread the following text for spelling and grammar errors. Provide only the corrected text without any explanation.\n\n---\n\n${text}`;
            break;
        case 'rephrase-formal':
            prompt = `Rewrite the following text in a more formal and professional tone:\n\n---\n\n${text}`;
            break;
        case 'rephrase-casual':
            prompt = `Rewrite the following text in a more casual and conversational tone:\n\n---\n\n${text}`;
            break;
        case 'find-action-items':
            prompt = `Extract any action items or tasks from the following text and present them as a bulleted list. If no action items are found, respond with "No action items found." :\n\n---\n\n${text}`;
            break;
    }

    try {
        const responseStream = await ai.models.generateContentStream({
            model: STREAMING_MODEL,
            contents: prompt,
        });
        for await (const chunk of responseStream) {
            if (chunk.text) yield chunk.text;
        }
    } catch (error) {
        console.error(`Error performing action '${action}' on text:`, error);
        throw new Error(`Failed to ${action} the text. Please try again.`);
    }
};

export const breakdownTask = async (taskDescription: string): Promise<string[]> => {
    if (!taskDescription.trim()) {
        throw new Error("Task description cannot be empty.");
    }
    try {
        const prompt = `Break down the following complex task into a short list of actionable subtasks. Provide only the subtask titles. Task: "${taskDescription}"`;
        
        const response = await ai.models.generateContent({
            model: COMPLEX_TASK_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        subtasks: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING, description: "A single, concise subtask." }
                        }
                    },
                    required: ["subtasks"]
                },
                thinkingConfig: { thinkingBudget: 32768 },
            }
        });
        
        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);
        return result.subtasks || [];

    } catch (error) {
        console.error("Error breaking down task:", error);
        throw new Error("Failed to break down the task with AI. Please try again.");
    }
};

export const generateStudyRoutine = async (subjects: string, timeSlots: string, goals: string): Promise<StudyBlock[]> => {
    const prompt = `Create a weekly study routine based on these inputs.
    Subjects: ${subjects}
    Available Time Slots: ${timeSlots}
    Goals: ${goals}
    
    Structure the output as a schedule with specific activities (e.g., "Read Chapter 3", "Practice Problems", "Review Flashcards", "Watch Lecture"). Be realistic with timing.`;

    try {
        const response = await ai.models.generateContent({
            model: COMPLEX_TASK_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            day: { type: Type.STRING },
                            time: { type: Type.STRING },
                            subject: { type: Type.STRING },
                            activity: { type: Type.STRING },
                            duration: { type: Type.INTEGER }
                        },
                        required: ["day", "time", "subject", "activity", "duration"]
                    }
                },
                thinkingConfig: { thinkingBudget: 32768 },
            }
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error generating study routine:", error);
        throw new Error("AI failed to generate a study routine. Please try adjusting your inputs.");
    }
};

export const generateKnowledgeGraph = async (noteContent: string): Promise<{ nodes: GraphNode[], edges: GraphEdge[] }> => {
    const prompt = `Analyze the following text and extract the key concepts and their relationships to form a knowledge graph.
    - Identify main topics and sub-topics as nodes.
    - Identify the connections between them as edges with descriptive labels.
    Text: "${noteContent}"`;

    try {
        const response = await ai.models.generateContent({
            model: COMPLEX_TASK_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        nodes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING, description: "A unique identifier for the node (e.g., the concept label in lowercase)." },
                                    label: { type: Type.STRING, description: "The display name of the concept." },
                                    group: { type: Type.INTEGER, description: "A number to group related concepts, with 1 being the main topic." }
                                },
                                required: ["id", "label", "group"]
                            }
                        },
                        edges: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    from: { type: Type.STRING, description: "The ID of the source node." },
                                    to: { type: Type.STRING, description: "The ID of the target node." },
                                    label: { type: Type.STRING, description: "A brief description of the relationship (e.g., 'is part of', 'leads to', 'contrasts with')." }
                                },
                                required: ["from", "to", "label"]
                            }
                        }
                    },
                    required: ["nodes", "edges"]
                },
                thinkingConfig: { thinkingBudget: 32768 },
            }
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error generating knowledge graph:", error);
        throw new Error("AI failed to generate a knowledge graph from this note.");
    }
};

export const extractKeyTopicsAndSummary = async (fileData: { mimeType: string; data: string }): Promise<{ summary: string; keyTopics: string[] }> => {
    if (!fileData.data) {
        throw new Error("Cannot process an empty document.");
    }
    try {
        const prompt = "Analyze the provided document. First, create a concise overall summary. Second, extract a list of the most important key topics or concepts discussed. Focus on main ideas, not minor details.";
        
        const response = await ai.models.generateContent({
            model: COMPLEX_TASK_MODEL,
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: { mimeType: fileData.mimeType, data: fileData.data } },
                    { text: prompt }
                ]
            }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: {
                            type: Type.STRING,
                            description: "A concise summary of the entire document."
                        },
                        keyTopics: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: "A single key topic or concept."
                            }
                        }
                    },
                    required: ["summary", "keyTopics"]
                },
                thinkingConfig: { thinkingBudget: 32768 },
            }
        });
        
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error generating study set:", error);
        throw new Error("AI failed to analyze the document. The file might be too complex or in an unsupported format.");
    }
};

export interface QuizOptions {
    numQuestions: number;
    questionTypes: QuestionType[];
}
export const generateQuiz = async (fileData: { mimeType: string; data: string }, options: QuizOptions): Promise<QuizQuestion[]> => {
    if (!fileData.data) {
        throw new Error("Cannot generate a quiz from an empty document.");
    }
     if (options.questionTypes.length === 0) {
        throw new Error("Please select at least one question type.");
    }

    const prompt = `Based on the provided document, generate a quiz with exactly ${options.numQuestions} questions. The quiz should include these question types: ${options.questionTypes.join(', ')}. Ensure the questions cover the main topics of the document. For multiple-choice questions, provide 4 distinct options. For true/false, the answer must be strictly 'true' or 'false'.`;
    
    try {
        const response = await ai.models.generateContent({
            model: COMPLEX_TASK_MODEL,
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: fileData },
                    { text: prompt }
                ]
            }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                       quiz: {
                           type: Type.ARRAY,
                           description: "An array of quiz questions.",
                           items: {
                               type: Type.OBJECT,
                               properties: {
                                   type: { type: Type.STRING, description: "The type of question ('multiple-choice', 'true-false', or 'short-answer')." },
                                   question: { type: Type.STRING, description: "The question text." },
                                   options: {
                                       type: Type.ARRAY,
                                       description: "An array of 4 strings for multiple-choice options. Only for 'multiple-choice'.",
                                       items: { type: Type.STRING }
                                   },
                                   answer: {
                                       type: Type.STRING,
                                       description: "The correct answer. For true/false, should be 'true' or 'false'. For multiple-choice, it's one of the options."
                                   }
                               },
                               required: ["type", "question", "answer"]
                           }
                       }
                    },
                    required: ["quiz"]
                },
                thinkingConfig: { thinkingBudget: 32768 },
            }
        });
        
        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);

        // Validate the structure of the AI's response before processing.
        const quizData = (result as any)?.quiz;
        if (!Array.isArray(quizData)) {
          throw new Error("AI returned an invalid quiz format.");
        }

        return quizData.map((q: any) => {
            if (q.type === 'true-false') {
                return { ...q, answer: String(q.answer).toLowerCase() === 'true' };
            }
            if (q.type === 'multiple-choice' && (!q.options || q.options.length === 0)) {
                // Handle cases where model forgets to provide options
                return { ...q, options: ['A', 'B', 'C', 'D'] };
            }
            return q;
        });

    } catch (error) {
        console.error("Error generating quiz:", error);
        throw new Error("AI failed to generate a quiz. Please try again with different options or content.");
    }
};

export const generatePersonalizedStudyPlan = async (
    goal: string, 
    materials: string[], 
    startDate: string, 
    endDate: string, 
    existingEvents: CalEvent[]
): Promise<ScheduledStudyBlock[]> => {
    
    const relevantEvents = existingEvents
        .filter(event => event.date >= startDate && event.date <= endDate)
        .map(({ title, date, time }) => ({ title, date, time }));

    const prompt = `You are an expert academic planner. Your goal is to create a study plan for a student.
    - Their primary goal is: "${goal}".
    - They need to study these materials/subjects: ${materials.join(', ')}.
    - The plan must be between ${startDate} and ${endDate}.
    - CRITICAL: The student's existing calendar is provided below. You MUST schedule study blocks in the FREE time slots. DO NOT create events that overlap with their existing schedule.
    - Existing schedule: ${JSON.stringify(relevantEvents)}
    - Create a balanced plan. Mix up subjects to avoid burnout. Schedule sessions for reasonable durations (e.g., 45-90 minutes). Suggest specific activities (e.g., "Review Chapter 2", "Practice problems for [subject]", "Create flashcards for [material]").
    - Ensure the 'date' field is in YYYY-MM-DD format.
    - Return a JSON array of study blocks.`;

    try {
        const response = await ai.models.generateContent({
            model: COMPLEX_TASK_MODEL, // Use pro model for complex planning
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            date: { type: Type.STRING, description: "Date of the study block in YYYY-MM-DD format." },
                            time: { type: Type.STRING, description: "Start time in HH:MM format." },
                            subject: { type: Type.STRING, description: "The material or subject to study." },
                            activity: { type: Type.STRING, description: "The specific study activity." },
                            duration: { type: Type.INTEGER, description: "Duration in minutes." }
                        },
                        required: ["date", "time", "subject", "activity", "duration"]
                    }
                },
                thinkingConfig: { thinkingBudget: 32768 },
            }
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error generating personalized study plan:", error);
        throw new Error("Focus.AI failed to generate a study plan. Try adjusting your inputs or timeframe.");
    }
};


// --- NEW FOCUS STUDIO FUNCTIONS ---

export const generateExplainer = async (fileData: { mimeType: string; data: string }, topic: string): Promise<string> => {
    const prompt = `From the provided document, generate a detailed explanation of the following topic: "${topic}". 
    Explain it clearly as if you were a teacher. Use simple terms, provide examples if possible, and structure the explanation for easy understanding.`;

    try {
        const response = await ai.models.generateContent({
            model: COMPLEX_TASK_MODEL,
            contents: [{ role: 'user', parts: [{ inlineData: fileData }, { text: prompt }] }],
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error generating explainer:", error);
        throw new Error("AI failed to generate an explanation for this topic.");
    }
};

export async function* tutorMeChatStream(fileData: { mimeType: string; data: string }, history: ChatMessage[], newMessage: string) {
    const systemInstruction = "You are Focus.AI, an expert tutor. A student has provided a document and will ask questions. Your role is to guide them to a deeper understanding. Do not give direct answers. Instead, use the Socratic method: ask leading questions, prompt them to think critically, and point them to relevant concepts within the text. Your tone is encouraging and supportive.";
    
    const contents: any[] = [{
        role: 'user', parts: [{ inlineData: fileData }, { text: "This is my study document. Be my tutor." }]
    }, {
        role: 'model', parts: [{ text: "Of course. I've reviewed the document. What's on your mind? Let's explore it together." }]
    }, ...history, { role: 'user', parts: [{ text: newMessage }] }];

    try {
        const responseStream = await ai.models.generateContentStream({
            model: COMPLEX_TASK_MODEL,
            contents: contents,
            config: { 
                systemInstruction,
                thinkingConfig: { thinkingBudget: 32768 },
            },
        });

        for await (const chunk of responseStream) {
            if (chunk.text) yield chunk.text;
        }
    } catch (error) {
        console.error("Error in Tutor Me chat:", error);
        throw new Error("The AI tutor encountered an issue. Please try again.");
    }
};

export const gradeEssay = async (fileData: { mimeType: string; data: string }, essayText: string): Promise<Omit<EssayGrade, 'id' | 'materialId' | 'essayTitle' | 'essayText'>> => {
    const prompt = `You are an expert teaching assistant. A student has provided a source document and an essay based on it. Your task is to grade the essay out of 100.
    1.  **Analyze the essay's** understanding of the source material, clarity of argument, structure, and use of evidence.
    2.  **Provide constructive feedback**: What did they do well? What could be improved?
    3.  **Give specific suggestions** for improvement as a list.
    4.  **Return a score** out of 100.
    
    Source Document is attached.
    
    Student's Essay:
    ---
    ${essayText}
    ---
    `;

    try {
        const response = await ai.models.generateContent({
            model: COMPLEX_TASK_MODEL,
            contents: [{ role: 'user', parts: [{ inlineData: fileData }, { text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER, description: "The numerical score from 0 to 100." },
                        feedback: { type: Type.STRING, description: "Overall constructive feedback on the essay." },
                        suggestions: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING, description: "A specific suggestion for improvement." }
                        }
                    },
                    required: ["score", "feedback", "suggestions"]
                },
                thinkingConfig: { thinkingBudget: 32768 },
            }
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error grading essay:", error);
        throw new Error("AI failed to grade the essay. Please check the content and try again.");
    }
};