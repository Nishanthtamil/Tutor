import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { message, username, age, mode, tutorLang, image } = await req.json()
        const isKid = age <= 12;
        const model = image
            ? 'meta-llama/llama-4-scout-17b-16e-instruct'
            : 'llama-3.3-70b-versatile';

        let systemPrompt = "";

        const baseInstruction = `
      You are an AI Tutor.
      User: ${username}, Age: ${age}.
      Target Mode: ${mode}.
      
      CORE TASK:
      1. Analyze the input (text or image).
      2. Provide the response in TWO languages: English and Hindi.
      
      FORMAT:
      You must output a strictly valid JSON object with these exact keys:
      {
        "english": "The response in English",
        "hindi": "The response in Hindi (Devanagari script)"
      }
    `;
        if (mode === 'conversation') {
            const tone = isKid ? "playful, simple words, use emojis" : "friendly, helpful";
            systemPrompt = `
        ${baseInstruction}
        CONTEXT: Casual conversation.
        - If Image provided: Explain what is in the image nicely.
        - If Text provided: Reply to the user's chat.
        - Tone: ${tone}.
        - If the user is learning Hindi, the 'hindi' field is the primary answer.
        - If the user is learning English, the 'english' field is the primary answer.
      `;
        }
        else if (mode === 'translator') {
            systemPrompt = `
        ${baseInstruction}
        CONTEXT: Strict Translation.
        - If input is English, provide the Hindi translation in 'hindi' field.
        - If input is Hindi, provide the English translation in 'english' field.
        - Populated the other field with the original text (or a clarification).
      `;
        }
        else if (mode === 'dictionary') {
            systemPrompt = `
        ${baseInstruction}
        CONTEXT: Dictionary / Meaning.
        - Define the word or the main object in the image.
        - Structure: Meaning + 1 Example Sentence.
        - Ensure both 'english' and 'hindi' fields contain the full definition in their respective languages.
      `;
        }

        const userContent: any[] = [{ type: "text", text: message || "Analyze this." }];

        if (image) {
            userContent.push({
                type: "image_url",
                image_url: { url: image }
            });
        }
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: image ? userContent : message },
            ],
            model: model,
            temperature: 0.6,
            max_tokens: 500,
            response_format: { type: "json_object" },
        });

        const result = JSON.parse(completion.choices[0]?.message?.content || "{}");

        return NextResponse.json({
            english: result.english || "Error processing English response.",
            hindi: result.hindi || "त्रुटि: उत्तर संसाधित नहीं हो सका।"
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
}