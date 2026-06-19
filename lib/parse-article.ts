import * as cheerio from "cheerio";

export type ParsedArticle = {
  date: string | null;
  title: string | null;
  content: string | null;
};

const CONTENT_SELECTORS = [
  "article",
  '[role="article"]',
  ".post-content",
  ".post-body",
  ".article-content",
  ".article-body",
  ".entry-content",
  ".story-body",
  ".content",
  ".post",
  "main",
];

const NOISE_SELECTORS =
  "script, style, noscript, nav, footer, header, aside, iframe, .comments, .sidebar, .advertisement, .ad, .social-share, .newsletter";

function normalizeText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeMultilineText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractTitle($: cheerio.CheerioAPI): string | null {
  const candidates = [
    $('meta[property="og:title"]').attr("content"),
    $('meta[name="twitter:title"]').attr("content"),
    $("article h1").first().text(),
    $("main h1").first().text(),
    $("h1").first().text(),
    $("title").text(),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate ?? "");
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function extractDate($: cheerio.CheerioAPI): string | null {
  const candidates = [
    $("time[datetime]").first().attr("datetime"),
    $("time[datetime]").first().text(),
    $('meta[property="article:published_time"]').attr("content"),
    $('meta[property="article:modified_time"]').attr("content"),
    $('meta[name="pubdate"]').attr("content"),
    $('meta[name="publish-date"]').attr("content"),
    $('meta[itemprop="datePublished"]').attr("content"),
    $('[itemprop="datePublished"]').attr("datetime"),
    $('[itemprop="datePublished"]').first().text(),
    $(".published").first().text(),
    $(".post-date").first().text(),
    $(".date").first().text(),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate ?? "");
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function elementToText($: cheerio.CheerioAPI, element: ReturnType<cheerio.CheerioAPI>): string {
  const clone = element.clone();
  clone.find(NOISE_SELECTORS).remove();

  clone.find("br").replaceWith("\n");

  clone.find("p, li, h2, h3, h4, blockquote").each((_, node) => {
    const tagName = node.tagName?.toLowerCase();

    if (tagName && ["p", "li", "h2", "h3", "h4", "blockquote"].includes(tagName)) {
      $(node).append("\n\n");
    }
  });

  return normalizeMultilineText(clone.text());
}

function extractContent($: cheerio.CheerioAPI): string | null {
  let bestContent = "";
  let bestScore = 0;

  for (const selector of CONTENT_SELECTORS) {
    $(selector).each((_, node) => {
      const text = elementToText($, $(node));

      if (!text) {
        return;
      }

      const paragraphScore = (text.match(/\n\n/g) ?? []).length;
      const score = text.length + paragraphScore * 100;

      if (score > bestScore) {
        bestScore = score;
        bestContent = text;
      }
    });

    if (bestContent.length > 400) {
      break;
    }
  }

  if (bestContent) {
    return bestContent;
  }

  const fallback = elementToText($, $("body"));

  return fallback || null;
}

export async function fetchAndParseArticle(url: string): Promise<ParsedArticle> {
  const FETCH_TIMEOUT_MS = 30_000;

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      throw new Error("Превышено время ожидания загрузки страницы (30 с)");
    }

    throw new Error("Не удалось загрузить страницу. Проверьте URL и доступность сайта.");
  }

  if (!response.ok) {
    throw new Error(`Не удалось загрузить страницу (${response.status})`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  $("script, style, noscript").remove();

  const parsed: ParsedArticle = {
    date: extractDate($),
    title: extractTitle($),
    content: extractContent($),
  };

  if (!parsed.content?.trim()) {
    throw new Error("Не удалось извлечь текст статьи");
  }

  if (!parsed.title && !parsed.content) {
    throw new Error("Не удалось извлечь заголовок и содержимое статьи");
  }

  return parsed;
}
