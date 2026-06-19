import type { ParsedArticle } from "@/lib/parse-article";

export const DEFAULT_OPENROUTER_MODEL = "deepseek/deepseek-chat";
export const MAX_ARTICLE_CHARS = 20_000;
export const MAX_CONTENT_CHARS = 18_000;
export const OPENROUTER_TIMEOUT_MS = 60_000;

export type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type CallOpenRouterOptions = {
  model?: string;
  timeoutMs?: number;
};

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
    throw new Error(
      "OPENROUTER_API_KEY не настроен. Добавьте ключ в .env.local или переменные окружения Vercel.",
    );
  }

  const baseUrl =
    readEnv("OPENAI_BASE_URL")?.replace(/\/$/, "") ??
    "https://openrouter.ai/api/v1";

  return { apiKey, baseUrl };
}

function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) {
    return content;
  }

  const cut = content.slice(0, maxChars).trimEnd();
  const lastBreak = Math.max(cut.lastIndexOf("\n\n"), cut.lastIndexOf(". "));

  if (lastBreak > maxChars * 0.7) {
    return `${cut.slice(0, lastBreak + 1).trimEnd()}\n\n[... текст статьи обрезан ...]`;
  }

  return `${cut}\n\n[... текст статьи обрезан ...]`;
}

function mapOpenRouterError(status: number, message?: string): string {
  if (status === 401) {
    return "Неверный API-ключ OpenRouter. Проверьте OPENROUTER_API_KEY в .env.local.";
  }

  if (status === 402) {
    return "Недостаточно средств на балансе OpenRouter.";
  }

  if (status === 429) {
    return "Превышен лимит запросов к OpenRouter. Попробуйте через минуту.";
  }

  if (status >= 500) {
    return "Сервис OpenRouter временно недоступен. Попробуйте позже.";
  }

  return message ?? `OpenRouter вернул ошибку (${status})`;
}

function mapFetchError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return `Превышено время ожидания ответа от AI (${OPENROUTER_TIMEOUT_MS / 1000} с)`;
    }

    if (error.message.includes("fetch failed")) {
      return "Не удалось связаться с OpenRouter. Проверьте интернет-соединение.";
    }
  }

  return "Не удалось выполнить запрос к OpenRouter";
}

export function buildArticlePrompt(article: ParsedArticle): string {
  const content = article.content
    ? truncateContent(article.content, MAX_CONTENT_CHARS)
    : "";

  const parts = [
    article.title ? `Title: ${article.title}` : "",
    article.date ? `Date: ${article.date}` : "",
    content ? `Content:\n${content}` : "",
  ].filter(Boolean);

  return parts.join("\n\n").slice(0, MAX_ARTICLE_CHARS);
}

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: CallOpenRouterOptions = {},
): Promise<string> {
  const { apiKey, baseUrl } = getOpenRouterConfig();
  const timeoutMs = options.timeoutMs ?? OPENROUTER_TIMEOUT_MS;

  let response: Response;

  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model ?? DEFAULT_OPENROUTER_MODEL,
        messages,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new Error(mapFetchError(error));
  }

  let data: ChatCompletionResponse;

  try {
    data = (await response.json()) as ChatCompletionResponse;
  } catch {
    throw new Error(
      response.ok
        ? "OpenRouter вернул некорректный ответ"
        : mapOpenRouterError(response.status),
    );
  }

  if (!response.ok) {
    throw new Error(mapOpenRouterError(response.status, data.error?.message));
  }

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Модель не вернула ответ");
  }

  return content;
}
