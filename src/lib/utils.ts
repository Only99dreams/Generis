import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { LanguageCode } from "../data/translations";

const localeMap: Record<LanguageCode, string> = {
  en: "en-NG",
  ha: "ha-NG",
  ig: "ig-NG",
  yo: "yo-NG",
  pid: "en-NG",
};

export function getLocale(lang?: LanguageCode): string {
  if (lang) return localeMap[lang] || "en-NG";
  try {
    const saved = localStorage.getItem("language");
    return localeMap[saved as LanguageCode] || "en-NG";
  } catch {
    return "en-NG";
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, lang?: LanguageCode): string {
  const locale = getLocale(lang);
  return `₦${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: string, lang?: LanguageCode): string {
  const locale = getLocale(lang);
  return new Date(date).toLocaleDateString(locale, {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function formatDateTime(date: string, lang?: LanguageCode): string {
  const locale = getLocale(lang);
  return new Date(date).toLocaleDateString(locale, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
