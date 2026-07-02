import { useState } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { languages, type LanguageCode } from "../data/translations";
import { cn } from "../lib/utils";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  const currentLang = languages.find((l) => l.code === language);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <Globe className="w-4 h-4 shrink-0" />
        <span className="truncate">{currentLang?.nativeName || "English"}</span>
        <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-800/95 backdrop-blur-md border border-gray-700/50 rounded-lg p-1 z-50 shadow-xl animate-scale-in">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code as LanguageCode);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  language === lang.code
                    ? "bg-brand-yellow/10 text-brand-yellow"
                    : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                )}
              >
                <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-medium">
                  {lang.nativeName[0]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{lang.nativeName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{lang.name}</p>
                </div>
                {language === lang.code && (
                  <Check className="w-3.5 h-3.5 text-brand-yellow shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
