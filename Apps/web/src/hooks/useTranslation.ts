import { useLanguage } from "@/components/providers/LanguageProvider";
import { translate } from "@/lib/i18n";

export function useTranslation() {
  const { language } = useLanguage();
  const t = (key: string, vars?: Record<string, string | number>) => translate(key, language, vars);
  return { t, language };
}
