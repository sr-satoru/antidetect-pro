import pt from "@/app/locales/pt.json";
import en from "@/app/locales/en.json";
import es from "@/app/locales/es.json";
import fr from "@/app/locales/fr.json";

export type Language = "pt" | "en" | "es" | "fr";

export type TranslationSchema = typeof pt;

export const translations: Record<Language, TranslationSchema> = {
  pt,
  en,
  es,
  fr,
};
