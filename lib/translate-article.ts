import type { ParsedArticle } from "@/lib/parse-article";

const DEEPSEEK_MODEL = "deepseek/deepseek-chat";
const MAX_ARTICLE_CHARS = 20_000;

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

function readEnv(name: string): string | undefined {
  const value = process.env[name];

  if (!value) {
    return undefined;
  }

  return value.trim().replace(/^["']|["']$/g, "");
}

function getOpenRouterConfig() {
  const apiKey = readEnv("OPENROUTER_API_KEY");

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY не настроен в .env.local");
  }

  const baseUrl =
    readEnv("OPENAI_BASE_URL")?.replace(/\/$/, "") ??
    "https://openrouter.ai/api/v1";

  return { apiKey, baseUrl };
}

function buildArticlePrompt(article: ParsedArticle): string {
  const parts = [
    article.title ? `Title: ${article.title}` : "",
    article.date ? `Date: ${article.date}` : "",
    article.content ? `Content:\n${article.content}` : "",
  ].filter(Boolean);

  return parts.join("\n\n").slice(0, MAX_ARTICLE_CHARS);
}

export async function translateArticle(article: ParsedArticle): Promise<string> {
  const { apiKey, baseUrl } = getOpenRouterConfig();
  const articleText = buildArticlePrompt(article);

  if (!articleText.trim()) {
    throw new Error("Нет текста статьи для перевода");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a professional translator. Translate English articles into Russian. Preserve meaning, tone, and paragraph structure. Return only the translation without comments.",
        },
        {
          role: "user",
          content: `Translate this article into Russian:\n\n${articleText}`,
        },
      ],
    }),
  });

  const data = (await response.json()) as ChatCompletionResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? `OpenRouter вернул ошибку (${response.status})`);
  }

  const translation = data.choices?.[0]?.message?.content?.trim();

  if (!translation) {
    throw new Error("Модель не вернула перевод");
  }

  return translation;
}
