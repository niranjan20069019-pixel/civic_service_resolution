import { useState, useCallback } from "react";
import T, { SUPPORTED_LANGUAGES } from "./i18n.js";

const STORAGE_KEY = "civic_lang";

export function useTranslation() {
  const [lang, setLangState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "en"
  );

  const setLang = useCallback((l) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  }, []);

  // t("key") → translated string, falls back to English
  const t = useCallback(
    (key) => T[key]?.[lang] || T[key]?.["en"] || key,
    [lang]
  );

  return { lang, setLang, t, SUPPORTED_LANGUAGES };
}
