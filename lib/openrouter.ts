import type { ParsedArticle } from "@/lib/parse-article";
import { AppError } from "@/lib/app-error";

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
    throw new AppError("AI_CONFIG_ERROR");
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

function mapOpenRouterStatus(status: number): AppError {
  if (status === 401 || status === 402) {
    return new AppError("AI_CONFIG_ERROR");
  }

  if (status === 429) {
    return new AppError("AI_RATE_LIMIT");
  }

  if (status >= 500) {
    return new AppError("AI_UNAVAILABLE");
  }

  return new AppError("AI_UNAVAILABLE");
}

function mapFetchError(error: unknown): AppError {
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return new AppError("AI_TIMEOUT");
    }
  }

  return new AppError("AI_UNAVAILABLE");
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
    throw mapFetchError(error);
  }

  let data: ChatCompletionResponse;

  try {
    data = (await response.json()) as ChatCompletionResponse;
  } catch {
    throw mapOpenRouterStatus(response.status);
  }

  if (!response.ok) {
    throw mapOpenRouterStatus(response.status);
  }

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new AppError("AI_UNAVAILABLE");
  }

  return content;
}
