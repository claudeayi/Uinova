import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "test-key",
});

export async function getAIResponse(message: string, history: string[]) {
  const prompt = [...history, message].join("\n");

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini", // peut être adapté (DeepSeek/OpenAI)
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0].message?.content || "⚠️ Pas de réponse générée.";
}
