import type { ParsedArticle } from "@/lib/parse-article";
import { buildArticlePrompt, callOpenRouter } from "@/lib/openrouter";

export async function generateIllustrationPrompt(
  article: ParsedArticle,
): Promise<string> {
  const articleText = buildArticlePrompt(article);

  const prompt = await callOpenRouter([
    {
      role: "system",
      content:
        "You write concise English prompts for text-to-image models. Based on the article, describe one vivid scene: subject, setting, style, lighting, and mood. Write 2–4 sentences. Return only the prompt in English, without markdown, quotes, or explanations.",
    },
    {
      role: "user",
      content: `Create an image generation prompt for this article:\n\n${articleText}`,
    },
  ]);

  return prompt.replace(/^["']|["']$/g, "").trim();
}
