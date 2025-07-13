import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import languageDetector from 'i18next-browser-languagedetector';
import en from './locales/strings.en.json';
import ja from './locales/strings.ja.json';
import es from './locales/strings.es.json';
import de from './locales/strings.de.json';
import fr from './locales/strings.fr.json';
import it from './locales/strings.it.json';
import hi from './locales/strings.hi.json';
import zh_Hans from './locales/strings.zh-Hans.json';
import zh_Hant from './locales/strings.zh-Hant.json';

i18next
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ja: { translation: ja },
      es: { translation: es },
      de: { translation: de },
      fr: { translation: fr },
      it: { translation: it },
      hi: { translation: hi },
      'zh-Hans': { translation: zh_Hans },
      'zh-Hant': { translation: zh_Hant },
    },
    lng: localStorage.getItem('i18nextLng') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    // Only enable debug in development mode
    debug: process.env.NODE_ENV === 'development',
  });

export default i18next;
