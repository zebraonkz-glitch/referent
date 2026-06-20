const STORAGE_KEY = "referent-recent-urls";
const MAX_RECENT_URLS = 4;

export function loadRecentUrls(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT_URLS);
  } catch {
    return [];
  }
}

export function saveRecentUrls(urls: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(urls.slice(0, MAX_RECENT_URLS)));
}

export function addRecentUrl(url: string, current: string[]): string[] {
  const next = [url, ...current.filter((item) => item !== url)].slice(0, MAX_RECENT_URLS);
  saveRecentUrls(next);
  return next;
}
