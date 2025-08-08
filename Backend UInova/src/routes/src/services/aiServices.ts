import { OpenAI } from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function generateAssistantResponse(prompt: string, history: any[] = []) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      ...history,
      { role: "user", content: prompt }
    ],
    max_tokens: 400,
    temperature: 0.8
  });
  return response.choices[0]?.message?.content ?? "Aucune réponse IA";
}
