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

        // 1. Define Base Persona & Output Format based on Language
        let persona = "";
        let outputFormat = "";

        if (tutorLang === 'english') {
            persona = `
        You are an English Tutor.
        User: ${username}, Age: ${age}.
        
        CORE TASK:
        1. Analyze the input.
        2. Act as a guide/tutor teaching English.
        3. Provide the response primarily in English.
        4. Do NOT generate Hindi text.
      `;
            outputFormat = `
        FORMAT:
        Output a strictly valid JSON object:
        {
          "english": "The response in English",
          "hindi": "" 
        }
        (Leave 'hindi' empty).
      `;
        } else {
            // Hindi Mode
            persona = `
        You are a Hindi Tutor.
        User: ${username}, Age: ${age}.
        
        CORE TASK:
        1. Analyze the input.
        2. Act as a guide/tutor teaching Hindi.
        3. Provide the response in TWO languages: English and Hindi.
      `;
            outputFormat = `
        FORMAT:
        Output a strictly valid JSON object:
        {
          "english": "The response in English",
          "hindi": "The response in Hindi (Devanagari script)"
        }
      `;
        }

        const baseInstruction = `${persona}\n${outputFormat}`;

        // 2. Add Mode-Specific Context
        if (mode === 'conversation') {
            const tone = isKid ? "playful, simple words, use emojis" : "friendly, helpful";
            systemPrompt = `
        ${baseInstruction}
        CONTEXT: Casual conversation.
        - Tone: ${tone}.
        - If Image provided: Explain what is in the image nicely.
        - If Text provided: Reply to the user's chat.
        ${tutorLang === 'english' ? "- Focus on correcting grammar or encouraging English usage." : "- Help the user learn Hindi."}
      `;
        } else if (mode === 'translator') {
            systemPrompt = `
        ${baseInstruction}
        CONTEXT: Strict Translation.
        ${tutorLang === 'english'
                    ? "- Translate the input text into English."
                    : "- If input is English, provide Hindi translation.\n- If input is Hindi, provide English translation."
                }
      `;
        } else if (mode === 'dictionary') {
            systemPrompt = `
        ${baseInstruction}
        CONTEXT: Dictionary / Meaning.
        - Define the word or the main object in the image.
        - Structure: Meaning + 1 Example Sentence.
        ${tutorLang === 'english' ? "- Provide definition in English." : "- Provide definition in both English and Hindi."}
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
            hindi: result.hindi !== undefined ? result.hindi : (tutorLang === 'hindi' ? "त्रुटि: उत्तर संसाधित नहीं हो सका।" : "")
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
}