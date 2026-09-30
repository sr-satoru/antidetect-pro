"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, TranslationSchema, translations } from "@/app/lib/translations";

interface LanguageOption {
  code: Language;
  label: string;
  flag: string;
}

export const AVAILABLE_LANGUAGES: LanguageOption[] = [
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationSchema;
  languages: LanguageOption[];
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("pt");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("star_lang") as Language | null;
      if (saved && (saved === "pt" || saved === "en" || saved === "es" || saved === "fr")) {
        setLanguageState(saved);
      } else {
        const browserLang = navigator.language.slice(0, 2).toLowerCase();
        if (browserLang === "en" || browserLang === "es" || browserLang === "fr") {
          setLanguageState(browserLang as Language);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("star_lang", lang);
    } catch {
      // Ignore
    }
  };

  const t = translations[language] || translations.pt;

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, languages: AVAILABLE_LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback if accessed outside provider (e.g. initial SSR render)
    return {
      language: "pt" as Language,
      setLanguage: () => {},
      t: translations.pt,
      languages: AVAILABLE_LANGUAGES,
    };
  }
  return context;
}
