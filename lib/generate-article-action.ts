import type { ParsedArticle } from "@/lib/parse-article";
import { buildArticlePrompt, callOpenRouter } from "@/lib/openrouter";

export type ArticleAction = "summary" | "theses" | "telegram";

const MIN_CONTENT_CHARS = 80;

type ActionPrompt = {
  system: string;
  user: string;
};

const actionPrompts: Record<ArticleAction, ActionPrompt> = {
  summary: {
    system: [
      "You are an editor for Russian-speaking readers.",
      "Write only in Russian.",
      "Be concise: 2–4 short paragraphs, about 400–800 characters total.",
      "Do not quote the original, do not retell paragraph by paragraph.",
      "Do not add introductions like «В этой статье» or «Автор пишет».",
      "Return only the answer, without headings and without meta-comments.",
    ].join(" "),
    user: [
      "Briefly explain what the article below is about.",
      "Cover: the topic, the main idea or conclusion, and who will find it useful.",
      "Write in plain Russian, as for a smart reader in a hurry.",
    ].join(" "),
  },
  theses: {
    system: [
      "You are an editor who extracts key ideas from English articles.",
      "Write only in Russian.",
      "Return only a numbered list, without introduction or conclusion.",
      "One thesis = one line. Format strictly: «1. ...», «2. ...», etc.",
      "Each thesis is one complete thought, 1–2 sentences max.",
      "Do not add meta-comments or duplicate points.",
    ].join(" "),
    user: [
      "Extract 5–10 key theses from the article below.",
      "Use a numbered list from 1 to N.",
      "Include the most important ideas, facts, and conclusions.",
      "Do not invent facts that are not in the article.",
    ].join(" "),
  },
  telegram: {
    system: [
      "You are a Telegram channel editor.",
      "Write only in Russian, in a lively and readable tone.",
      "No bureaucratic or academic language.",
      "Maximum 1500 characters including spaces.",
      "First line: short catchy title without # symbols.",
      "Then 1–3 short paragraphs.",
      "You may use 0–2 relevant emojis, not more.",
      "No markdown headings (#, ##). No links unless they are in the original.",
      "Return only the post text, ready to publish.",
    ].join(" "),
    user: [
      "Turn the article below into a Telegram post in Russian.",
      "Hook the reader in the first sentence.",
      "Keep the post under 1500 characters.",
    ].join(" "),
  },
};

export function validateArticleContent(article: ParsedArticle): void {
  const content = article.content?.trim() ?? "";

  if (content.length < MIN_CONTENT_CHARS) {
    throw new Error("Не удалось извлечь текст статьи");
  }
}

function normalizeTheses(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return text;
  }

  return lines
    .map((line, index) => {
      const cleaned = line.replace(/^(\d+\.|[-•*])\s*/, "");
      return `${index + 1}. ${cleaned}`;
    })
    .join("\n");
}

function normalizeTelegramPost(text: string): string {
  const trimmed = text.trim();

  if (trimmed.length <= 1500) {
    return trimmed;
  }

  const cut = trimmed.slice(0, 1497).trimEnd();
  const lastSpace = cut.lastIndexOf(" ");

  if (lastSpace > 1200) {
    return `${cut.slice(0, lastSpace)}…`;
  }

  return `${cut}…`;
}

function normalizeResponse(action: ArticleAction, text: string): string {
  if (action === "theses") {
    return normalizeTheses(text);
  }

  if (action === "telegram") {
    return normalizeTelegramPost(text);
  }

  return text.trim();
}

export async function generateArticleAction(
  article: ParsedArticle,
  action: ArticleAction,
): Promise<string> {
  validateArticleContent(article);

  const articleText = buildArticlePrompt(article);
  const { system, user } = actionPrompts[action];

  const raw = await callOpenRouter([
    { role: "system", content: system },
    { role: "user", content: `${user}\n\n${articleText}` },
  ]);

  return normalizeResponse(action, raw);
}
