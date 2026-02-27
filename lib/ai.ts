import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateTags(
  content: string,
  type: string,
  existingTags: string[]
): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a tagging assistant. Given content, return 1-3 relevant tags as a JSON array of strings.
Prefer reusing existing tags when appropriate: [${existingTags.join(", ")}].
Only create new tags when none of the existing tags fit.
Tags should be lowercase, single-word or hyphenated (e.g., "web-dev", "design", "meeting").
Content type: ${type}.
Return ONLY a JSON array, nothing else.`,
      },
      { role: "user", content },
    ],
    temperature: 0.3,
    max_tokens: 100,
  })

  const text = response.choices[0]?.message?.content?.trim() || "[]"
  try {
    return JSON.parse(text)
  } catch {
    return []
  }
}
