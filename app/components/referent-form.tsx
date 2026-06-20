"use client";

import { Check, Copy, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ErrorAlert } from "@/components/error-alert";
import type { AppErrorResponse, ErrorCode } from "@/lib/app-error";
import { getErrorMessage } from "@/lib/app-error";
import { cn } from "@/lib/utils";

type Action = "summary" | "theses" | "telegram" | "translate";

type ResultMode = "generated" | "translation";

type AnalyzeResponse = {
  result?: string;
  mode?: ResultMode;
  error?: AppErrorResponse;
};

const actions: {
  id: Action;
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
    id: "translate",
    label: "Перевод",
    description: "Перевод статьи на русский через DeepSeek",
    title: "Перевести статью на русский язык с сохранением смысла и структуры",
  },
];

const processTexts: Record<Action, string> = {
  summary: "Анализирую статью…",
  theses: "Формирую тезисы…",
  telegram: "Готовлю пост…",
  translate: "Перевожу статью…",
};

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
  const [resultMode, setResultMode] = useState<ResultMode | null>(null);
  const [error, setError] = useState<AppErrorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processStatus, setProcessStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resultSectionRef = useRef<HTMLElement>(null);
  const requestIdRef = useRef(0);
  const shouldScrollRef = useRef(false);

  useEffect(() => {
    if (!isLoading || !activeAction) {
      return;
    }

    setProcessStatus("Загружаю статью…");

    const timer = window.setTimeout(() => {
      setProcessStatus(processTexts[activeAction]);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [isLoading, activeAction]);

  useEffect(() => {
    if (!shouldScrollRef.current || !resultText || !resultSectionRef.current) {
      return;
    }

    shouldScrollRef.current = false;

    resultSectionRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [resultText]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  function handleClear() {
    requestIdRef.current += 1;
    shouldScrollRef.current = false;

    setUrl("");
    setActiveAction(null);
    setResultText("");
    setResultMode(null);
    setError(null);
    setIsLoading(false);
    setProcessStatus(null);
    setCopied(false);
  }

  async function handleCopy() {
    if (!resultText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
    } catch {
      setError(resolveClientError("UNKNOWN"));
    }
  }

  async function handleAction(action: Action) {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError(resolveClientError("MISSING_URL"));
      setResultText("");
      setResultMode(null);
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setError(resolveClientError("INVALID_URL"));
      setResultText("");
      setResultMode(null);
      return;
    }

    const requestId = ++requestIdRef.current;

    setError(null);
    setActiveAction(action);
    setIsLoading(true);
    setResultText("");
    setResultMode(null);
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

      if (!data.result || (data.mode !== "generated" && data.mode !== "translation")) {
        setError(resolveClientError("UNKNOWN"));
        return;
      }

      shouldScrollRef.current = true;
      setResultMode(data.mode);
      setResultText(data.result);
    } catch {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setError(resolveClientError("UNKNOWN"));
      setResultText("");
      setResultMode(null);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setProcessStatus(null);
      }
    }
  }

  const activeLabel = actions.find((item) => item.id === activeAction)?.label;
  const hasTextResult =
    (resultMode === "generated" || resultMode === "translation") && resultText;

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
        <p className="mt-2 text-xs text-slate-500">
          Укажите ссылку на англоязычную статью
        </p>

        <div className="mt-6 flex flex-col gap-3 md:grid md:grid-cols-2 xl:grid-cols-4">
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

          {hasTextResult ? (
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
                  Копировать
                </>
              )}
            </button>
          ) : null}
        </div>

        <div className="min-h-48 rounded-xl border border-dashed border-slate-700 bg-slate-950/80 p-4 sm:p-5">
          {hasTextResult ? (
            <div className="overflow-x-auto whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">
              {resultText}
            </div>
          ) : (
            <p className="text-sm leading-7 break-words text-slate-500">
              Введите URL и нажмите кнопку — здесь появится описание статьи, тезисы,
              пост для Telegram или перевод.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
