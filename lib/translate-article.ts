import type { ParsedArticle } from "@/lib/parse-article";
import { buildArticlePrompt, callOpenRouter } from "@/lib/openrouter";

export async function translateArticle(article: ParsedArticle): Promise<string> {
  const articleText = buildArticlePrompt(article);

  if (!articleText.trim()) {
    throw new Error("Не удалось извлечь текст статьи");
  }

  return callOpenRouter([
    {
      role: "system",
      content:
        "You are a professional translator. Translate English articles into Russian. Preserve meaning, tone, and paragraph structure. Return only the translation without comments.",
    },
    {
      role: "user",
      content: `Translate this article into Russian:\n\n${articleText}`,
    },
  ]);
}
