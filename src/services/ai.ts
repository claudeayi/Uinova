export async function askAI(prompt: string, history: any[] = []) {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.token}` },
    body: JSON.stringify({ prompt, history }),
  });
  return (await res.json()).answer;
}
