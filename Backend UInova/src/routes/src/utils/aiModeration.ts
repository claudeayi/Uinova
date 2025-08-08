export function moderatePrompt(prompt: string) {
  const forbidden = ["hack", "nude", "violence"];
  return !forbidden.some(word => prompt.toLowerCase().includes(word));
}
