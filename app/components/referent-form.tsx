"use client";

import { Check, Copy, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ErrorAlert } from "@/components/error-alert";
import type { AppErrorResponse, ErrorCode } from "@/lib/app-error";
import { getErrorMessage } from "@/lib/app-error";
import { addRecentUrl, loadRecentUrls } from "@/lib/recent-urls";
import { cn } from "@/lib/utils";

type Action = "summary" | "theses" | "telegram" | "illustration" | "publication";

type ResultMode = "generated" | "illustration" | "publication";

type AnalyzeResponse = {
  result?: string;
  illustrationUrl?: string;
  imagePrompt?: string;
  mode?: ResultMode;
  error?: AppErrorResponse;
};

const comboAction = {
  id: "publication" as const,
  label: "Подготовить публикацию",
  description: "Пост для Telegram и иллюстрация за один запрос",
  title: "Сгенерировать пост для Telegram и иллюстрацию по статье",
};

const actions: {
  id: Exclude<Action, "publication">;
  label: string;
  description: string;
  title: string;
}[] = [
  {
    id: "summary",
    label: "О чем статья?",
    description: "Краткое описание содержания статьи",
    title: "Кратко объяснить, о чём статья: тема, главная мысль и кому будет полезна",
  },
  {
    id: "theses",
    label: "Тезисы",
    description: "Основные тезисы и ключевые мысли",
    title: "Выделить 5–10 ключевых тезисов и основных выводов из статьи",
  },
  {
    id: "telegram",
    label: "Пост для Telegram",
    description: "Готовый пост для публикации в Telegram",
    title: "Подготовить короткий пост для Telegram со ссылкой на источник",
  },
  {
    id: "illustration",
    label: "Иллюстрация",
    description: "Изображение по теме статьи через Hugging Face",
    title: "Создать промпт по статье и сгенерировать иллюстрацию",
  },
];

const processTexts: Record<Action, string> = {
  summary: "Анализирую статью…",
  theses: "Формирую тезисы…",
  telegram: "Готовлю пост…",
  illustration: "Создаю промпт для иллюстрации…",
  publication: "Готовлю пост для Telegram…",
};

const publicationProcessTexts = [
  "Готовлю пост для Telegram…",
  "Создаю промпт для иллюстрации…",
  "Генерирую изображение…",
];

function resolveClientError(code: ErrorCode): AppErrorResponse {
  return {
    code,
    message: getErrorMessage(code),
  };
}

export function ReferentForm() {
  const [url, setUrl] = useState("");
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [resultText, setResultText] = useState("");
  const [illustrationUrl, setIllustrationUrl] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [resultMode, setResultMode] = useState<ResultMode | null>(null);
  const [error, setError] = useState<AppErrorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processStatus, setProcessStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [recentUrls, setRecentUrls] = useState<string[]>([]);

  const resultSectionRef = useRef<HTMLElement>(null);
  const requestIdRef = useRef(0);
  const shouldScrollRef = useRef(false);

  useEffect(() => {
    setRecentUrls(loadRecentUrls());
  }, []);

  useEffect(() => {
    if (!isLoading || !activeAction) {
      return;
    }

    setProcessStatus("Загружаю статью…");

    const firstTimer = window.setTimeout(() => {
      setProcessStatus(processTexts[activeAction]);
    }, 1500);

    const timers: number[] = [firstTimer];

    if (activeAction === "illustration") {
      timers.push(
        window.setTimeout(() => {
          setProcessStatus("Генерирую изображение…");
        }, 8000),
      );
    }

    if (activeAction === "publication") {
      timers.push(
        window.setTimeout(() => {
          setProcessStatus(publicationProcessTexts[1]);
        }, 6000),
        window.setTimeout(() => {
          setProcessStatus(publicationProcessTexts[2]);
        }, 14000),
      );
    }

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [isLoading, activeAction]);

  useEffect(() => {
    const hasResult =
      (resultMode === "generated" && resultText) ||
      (resultMode === "illustration" && illustrationUrl) ||
      (resultMode === "publication" && resultText && illustrationUrl);

    if (!shouldScrollRef.current || !hasResult || !resultSectionRef.current) {
      return;
    }

    shouldScrollRef.current = false;

    resultSectionRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [resultText, illustrationUrl, resultMode]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  function resetResults() {
    setResultText("");
    setIllustrationUrl("");
    setImagePrompt("");
    setResultMode(null);
  }

  function handleClear() {
    requestIdRef.current += 1;
    shouldScrollRef.current = false;

    setUrl("");
    setActiveAction(null);
    resetResults();
    setError(null);
    setIsLoading(false);
    setProcessStatus(null);
    setCopied(false);
  }

  async function handleCopy() {
    const textToCopy =
      resultMode === "illustration" ? imagePrompt : resultText;

    if (!textToCopy) {
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
    } catch {
      setError(resolveClientError("UNKNOWN"));
    }
  }

  async function handleAction(action: Action) {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError(resolveClientError("MISSING_URL"));
      resetResults();
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setError(resolveClientError("INVALID_URL"));
      resetResults();
      return;
    }

    const requestId = ++requestIdRef.current;

    setRecentUrls((current) => addRecentUrl(trimmedUrl, current));

    setError(null);
    setActiveAction(action);
    setIsLoading(true);
    resetResults();
    setCopied(false);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl, action }),
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      const data = (await response.json()) as AnalyzeResponse;

      if (!response.ok) {
        if (data.error?.code && data.error?.message) {
          setError(data.error);
        } else {
          setError(resolveClientError("UNKNOWN"));
        }
        return;
      }

      if (data.mode === "publication") {
        if (!data.result || !data.illustrationUrl) {
          setError(resolveClientError("UNKNOWN"));
          return;
        }

        shouldScrollRef.current = true;
        setResultMode("publication");
        setResultText(data.result);
        setIllustrationUrl(data.illustrationUrl);
        setImagePrompt(data.imagePrompt ?? "");
        return;
      }

      if (data.mode === "illustration") {
        if (!data.result) {
          setError(resolveClientError("UNKNOWN"));
          return;
        }

        shouldScrollRef.current = true;
        setResultMode("illustration");
        setIllustrationUrl(data.result);
        setImagePrompt(data.imagePrompt ?? "");
        return;
      }

      if (data.mode === "generated" && data.result) {
        shouldScrollRef.current = true;
        setResultMode("generated");
        setResultText(data.result);
        return;
      }

      setError(resolveClientError("UNKNOWN"));
    } catch {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setError(resolveClientError("UNKNOWN"));
      resetResults();
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setProcessStatus(null);
      }
    }
  }

  const activeLabel =
    activeAction === "publication"
      ? comboAction.label
      : actions.find((item) => item.id === activeAction)?.label;

  const hasTextResult = resultMode === "generated" && resultText;
  const hasIllustrationResult = resultMode === "illustration" && illustrationUrl;
  const hasPublicationResult =
    resultMode === "publication" && resultText && illustrationUrl;
  const hasCopyableResult =
    (hasTextResult && resultText) ||
    (hasPublicationResult && resultText) ||
    (hasIllustrationResult && imagePrompt);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 sm:gap-8">
      <header className="space-y-2 px-1 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-400 sm:text-sm">
          Referent
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
          Анализ англоязычных статей
        </h1>
        <p className="text-sm text-slate-400 sm:text-base">
          Вставьте ссылку на статью и выберите действие
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-black/20 backdrop-blur sm:p-6">
        <label htmlFor="article-url" className="mb-2 block text-sm font-medium text-slate-300">
          URL англоязычной статьи
        </label>
        <div className="flex gap-2">
          <input
            id="article-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Введите URL статьи, например: https://example.com/article"
            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 sm:text-base"
          />
          <button
            type="button"
            onClick={handleClear}
            disabled={isLoading}
            title="Очистить форму и результаты"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300 transition hover:border-slate-600 hover:bg-slate-900 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4 shrink-0" />
            Очистить
          </button>
        </div>

        {recentUrls.length > 0 ? (
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium text-slate-400">Недавние запросы</p>
            <ul className="flex flex-col gap-1.5">
              {recentUrls.map((recentUrl) => (
                <li key={recentUrl}>
                  <button
                    type="button"
                    onClick={() => {
                      setUrl(recentUrl);
                      setError(null);
                    }}
                    disabled={isLoading}
                    title={recentUrl}
                    className="w-full truncate rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-left text-xs text-slate-300 transition hover:border-sky-500/50 hover:bg-slate-900 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                  >
                    {recentUrl}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-2 text-xs text-slate-500">
          Укажите ссылку на англоязычную статью
        </p>

        <button
          type="button"
          title={comboAction.title}
          onClick={() => handleAction(comboAction.id)}
          disabled={isLoading}
          className="mt-6 w-full rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-4 text-left transition hover:border-sky-400 hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex items-center gap-2 font-medium text-sky-100">
            <Sparkles className="h-4 w-4 shrink-0" />
            {comboAction.label}
          </span>
          <span className="mt-1 block text-sm text-sky-200/70">{comboAction.description}</span>
        </button>

        <div className="mt-3 flex flex-col gap-3 md:grid md:grid-cols-2 xl:grid-cols-4">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              title={action.title}
              onClick={() => handleAction(action.id)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-left transition hover:border-sky-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="block font-medium text-slate-100">{action.label}</span>
              <span className="mt-1 block text-sm text-slate-400">{action.description}</span>
            </button>
          ))}
        </div>
      </section>

      {error ? <ErrorAlert code={error.code} message={error.message} /> : null}

      {processStatus ? (
        <div className="flex items-center gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-200">
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-400" />
          <span className="min-w-0 break-words">{processStatus}</span>
        </div>
      ) : null}

      <section
        ref={resultSectionRef}
        className="scroll-mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-black/20 backdrop-blur sm:p-6"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <h2 className="text-lg font-medium text-slate-100">Результат</h2>
            {activeLabel ? (
              <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
                {activeLabel}
              </span>
            ) : null}
          </div>

          {hasCopyableResult ? (
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm transition sm:w-auto",
                copied
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700 bg-slate-950 text-slate-300 hover:border-sky-500 hover:text-slate-100",
              )}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 shrink-0" />
                  Скопировано
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 shrink-0" />
                  {resultMode === "illustration" ? "Копировать промпт" : "Копировать пост"}
                </>
              )}
            </button>
          ) : null}
        </div>

        <div className="min-h-48 rounded-xl border border-dashed border-slate-700 bg-slate-950/80 p-4 sm:p-5">
          {hasPublicationResult ? (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-300">Пост для Telegram</h3>
                <div className="overflow-x-auto whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">
                  {resultText}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-300">Иллюстрация</h3>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={illustrationUrl}
                  alt="Иллюстрация для публикации"
                  className="mx-auto max-h-[480px] w-full rounded-lg object-contain"
                />
                {imagePrompt ? (
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    <span className="font-medium text-slate-300">Промпт: </span>
                    {imagePrompt}
                  </p>
                ) : null}
              </div>
            </div>
          ) : hasTextResult ? (
            <div className="overflow-x-auto whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">
              {resultText}
            </div>
          ) : hasIllustrationResult ? (
            <div className="space-y-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={illustrationUrl}
                alt="Иллюстрация по теме статьи"
                className="mx-auto max-h-[480px] w-full rounded-lg object-contain"
              />
              {imagePrompt ? (
                <p className="text-sm leading-6 text-slate-400">
                  <span className="font-medium text-slate-300">Промпт: </span>
                  {imagePrompt}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm leading-7 break-words text-slate-500">
              Введите URL и нажмите кнопку — здесь появится описание статьи, тезисы,
              пост для Telegram, иллюстрация или готовая публикация.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
