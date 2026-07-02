import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { LanguageCode, TranslationKey } from "../data/translations";
import { en, ha, ig, yo, pid } from "../data/translations";

const translations: Record<LanguageCode, Record<TranslationKey, string>> = {
  en, ha, ig, yo, pid,
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem("language");
    return (saved && saved in translations) ? saved as LanguageCode : "en";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (code: LanguageCode) => {
    setLanguageState(code);
  };

  const t = (key: TranslationKey): string => {
    return translations[language]?.[key] || en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
