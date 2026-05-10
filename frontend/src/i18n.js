import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all translations
import en from './locales/en/translation.json';
import de from './locales/de/translation.json';
import sv from './locales/sv/translation.json';
import nl from './locales/nl/translation.json';
import fr from './locales/fr/translation.json';
import hu from './locales/hu/translation.json';
import pl from './locales/pl/translation.json';
import sk from './locales/sk/translation.json';
import cs from './locales/cs/translation.json';
import no from './locales/no/translation.json';
import fi from './locales/fi/translation.json';
import it from './locales/it/translation.json';
import es from './locales/es/translation.json';

const resources = {
  en: { translation: en },
  de: { translation: de },
  sv: { translation: sv },
  nl: { translation: nl },
  fr: { translation: fr },
  hu: { translation: hu },
  pl: { translation: pl },
  sk: { translation: sk },
  cs: { translation: cs },
  no: { translation: no },
  fi: { translation: fi },
  it: { translation: it },
  es: { translation: es }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'de', 'sv', 'nl', 'fr', 'hu', 'pl', 'sk', 'cs', 'no', 'fi', 'it', 'es'],
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
    }
  });

export default i18n;
